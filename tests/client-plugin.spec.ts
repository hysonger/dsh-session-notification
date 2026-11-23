// @vitest-environment jsdom
/**
 * Cordis wiring integration tests for the browser plugin entry (`src/client/index.ts`).
 *
 * Mounts the real `{ inject, apply }` plugin onto a real `@deepseek-ai/cordis`
 * `Context` where `uiSession` and `uiSession.sessionStatus` are separate
 * services (matching dsh >= 0.2.2-rc.2 / 0.2.3-alpha.2) and `sessions.using`
 * enforces the `conversation` retain facet + scope teardown on release
 * (matching dsh >= 0.2.2-rc.3).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type {
  SessionListState, SessionRetainInfo, SessionRetainOptions, SessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionPendingInteraction } from '@deepseek-ai/dsh-client-ui-session/client'
import { apply, inject } from '../src/client/index.ts'
import { LOCAL_STORAGE_KEY } from '../src/client/local-settings.ts'

// `@deepseek-ai/dsh-client-store` is a runtime-seeded platform module whose
// peer (`zustand`) is supplied by the DSH web shell rather than this plugin.
vi.mock('@deepseek-ai/dsh-client-store', () => ({
  defineStore: <T>(definition: T) => definition,
}))

interface ObservableMock<T> {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
  set: (value: T) => void
}

function createObservable<T>(initial: T): ObservableMock<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: (next) => {
      value = next
      for (const listener of [...listeners]) listener()
    },
  }
}

function makeList(entries: ReadonlyArray<{
  id: string
  displayTitle: string
  running: boolean
  retainedBy?: SessionRetainInfo['retainedBy']
  updatedAt?: number
}>): SessionListState {
  const ids = entries.map(entry => entry.id as SessionId)
  const byId = Object.fromEntries(entries.map(entry => [
    entry.id,
    {
      id: entry.id as SessionId,
      displayTitle: entry.displayTitle,
      running: entry.running,
      retainedBy: entry.retainedBy ?? {},
      blank: false,
      updatedAt: entry.updatedAt ?? 0,
    } satisfies SessionSummary,
  ])) as Record<SessionId, SessionSummary>
  return { ids, byId, phase: 'ready', projectionsBySession: {} }
}

class MockUiSession extends Service {
  readonly pendingInteractions: ObservableMock<ReadonlyMap<SessionId, SessionPendingInteraction>>

  constructor(
    ctx: Context,
    initialPending: ReadonlyMap<SessionId, SessionPendingInteraction> = new Map(),
  ) {
    super(ctx, 'uiSession')
    this.pendingInteractions = createObservable(initialPending)
  }
}

class MockUiSessionStatus extends Service {
  constructor(ctx: Context) {
    super(ctx, 'uiSession.sessionStatus')
  }

  getSnapshot() {
    return new Map()
  }

  subscribe() {
    return () => {}
  }
}

interface RecordedNotification {
  title: string
  options: NotificationOptions | undefined
}

interface TestHarnessOptions {
  initialPending?: ReadonlyMap<SessionId, SessionPendingInteraction>
  initialList?: SessionListState
  chatBySession?: ReadonlyMap<string, { nodes: { values: () => IterableIterator<{ kind: string; data: unknown }> } }>
  lastAgentErrorBySession?: ReadonlyMap<string, string | null>
  retainedSessions?: ReadonlySet<string>
}

async function createHarness(options: TestHarnessOptions = {}) {
  localStorage.clear()
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
    browserEnabled: true,
    soundEnabled: false,
    currentNotificationMode: 'always',
    notificationMode: 'main-wait',
  }))

  const notifications: RecordedNotification[] = []
  class FakeNotification {
    static permission: NotificationPermission = 'granted'
    onclick: (() => void) | null = null
    constructor(title: string, opts?: NotificationOptions) {
      notifications.push({ title, options: opts })
    }
    addEventListener() {}
    close() {}
  }
  vi.stubGlobal('Notification', FakeNotification)
  vi.stubGlobal('BroadcastChannel', undefined)

  const ctx = new Context()
  const registeredSections: unknown[] = []
  const registeredLocales: Array<{ ns: string; dict: Record<string, Record<string, string>> }> = []
  const openedSessions: SessionId[] = []
  const usingCalls: Array<{ id: SessionId; opts: SessionRetainOptions }> = []

  const liveBindings = new Map<string, {
    sessionId: SessionId
    session: { getSnapshot: () => { lastAgentError: string | null } }
    hasConversationFacet: boolean
  }>()

  const retainInfos = new Map<string, ObservableMock<SessionRetainInfo>>()
  const retainInfoOf = (id: string): ObservableMock<SessionRetainInfo> => {
    let source = retainInfos.get(id)
    if (source === undefined) {
      const preRetained = options.retainedSessions?.has(id) === true
      source = createObservable<SessionRetainInfo>(preRetained
        ? { referenceCount: 1, retainedBy: { mainView: 1 }, retainedFacets: { conversation: 1 }, connectionCount: 1 }
        : { referenceCount: 0, retainedBy: {} })
      retainInfos.set(id, source)
    }
    return source
  }

  for (const id of options.retainedSessions ?? []) {
    liveBindings.set(id, {
      sessionId: id as SessionId,
      session: { getSnapshot: () => ({ lastAgentError: options.lastAgentErrorBySession?.get(id) ?? null }) },
      hasConversationFacet: true,
    })
  }

  const listSource = createObservable<SessionListState>(options.initialList ?? makeList([]))

  // Provide all services matching DSH 0.2.3-alpha.2's service topology.
  ctx.provide('slots', {
    inject: (_name: string, fn: () => unknown) => fn(),
    register: (descriptor: unknown) => {
      registeredSections.push(descriptor)
      return () => {}
    },
  } as never)

  ctx.provide('locale', {
    register: (ns: string, dict: Record<string, Record<string, string>>) => {
      registeredLocales.push({ ns, dict })
      return () => {}
    },
    bind: (ns: string) => (key: string) => {
      const entry = registeredLocales.find(item => item.ns === ns)
      return entry?.dict.zh[key] ?? key
    },
  } as never)

  ctx.provide('sessions', {
    list: listSource,
    retainInfo: (id: SessionId) => retainInfoOf(String(id)),
    binding: (id: SessionId) => liveBindings.get(String(id)),
    using: async <T>(
      target: SessionId,
      opts: SessionRetainOptions,
      operation: (reference: { sessionId: SessionId; binding: unknown }) => T | Promise<T>,
    ): Promise<T> => {
      usingCalls.push({ id: target, opts })
      const id = String(target)
      const hadBinding = liveBindings.has(id)
      const binding = liveBindings.get(id) ?? {
        sessionId: target,
        session: { getSnapshot: () => ({ lastAgentError: options.lastAgentErrorBySession?.get(id) ?? null }) },
        hasConversationFacet: opts.facets?.conversation === true,
      }
      if (!hadBinding) {
        liveBindings.set(id, binding)
        retainInfoOf(id).set({
          referenceCount: 1,
          retainedBy: { [opts.source]: 1 },
          ...(opts.facets?.conversation ? { retainedFacets: { conversation: 1 } } : {}),
          connectionCount: 1,
        })
      }
      try {
        return await operation({ sessionId: target, binding })
      } finally {
        // Mirror real ClientSessions.using: dropping the last reference retires
        // the scope synchronously before `using` returns.
        if (!hadBinding) {
          liveBindings.delete(id)
          retainInfoOf(id).set({ referenceCount: 0, retainedBy: {} })
        }
      }
    },
  } as never)

  ctx.provide('uiConversation', {
    binding: (binding: { sessionId: SessionId; hasConversationFacet: boolean }) => {
      const id = String(binding.sessionId)
      if (!liveBindings.has(id)) throw new Error(`uiConversation.binding: inactive session "${id}"`)
      let activated = false
      return {
        activate: (target: string) => {
          if (target === 'chat') activated = true
        },
        target: (target: string) => ({
          getSnapshot: () => {
            // Mirror BoundConversation: only folded while `conversation` facet is retained.
            if (target !== 'chat' || !activated || !binding.hasConversationFacet) return undefined
            return options.chatBySession?.get(id)
          },
        }),
      }
    },
  } as never)

  ctx.provide('uiWorkspace', {
    openSession: (id: SessionId) => { openedSessions.push(id) },
  } as never)

  let uiSession!: MockUiSession
  const uiSessionFiber = ctx.plugin((pluginCtx) => {
    uiSession = new MockUiSession(pluginCtx, options.initialPending)
  })
  const statusFiber = ctx.plugin({
    inject: ['uiSession'],
    apply(pluginCtx) {
      new MockUiSessionStatus(pluginCtx)
    },
  })
  await uiSessionFiber.await()
  await statusFiber.await()

  return {
    ctx,
    uiSession,
    listSource,
    notifications,
    registeredSections,
    openedSessions,
    usingCalls,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})

describe('client plugin wiring on dsh >= 0.2.2-rc.2 service topology', () => {
  it('reproduces the Cordis inject guard when reading uiSession.sessionStatus without inject', async () => {
    const { ctx } = await createHarness()
    let caught: unknown
    const fiber = ctx.plugin({
      name: 'legacy-session-status-reader',
      inject: ['uiSession'],
      apply(pluginCtx) {
        try {
          void (pluginCtx.uiSession as unknown as { sessionStatus: unknown }).sessionStatus
        } catch (error) {
          caught = error
          throw error
        }
      },
    })
    await fiber.await().catch(() => {})
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('cannot get property "uiSession.sessionStatus" without inject')
    await ctx.fiber.dispose()
  })

  it('activates cleanly without injecting uiSession.sessionStatus and notifies on uiSession.pendingInteractions', async () => {
    const preExisting = new Map<SessionId, SessionPendingInteraction>([
      ['s-pre' as SessionId, {
        key: 'q-pre',
        kind: 'question',
        sessionId: 's-pre' as SessionId,
        questions: [{ question: 'already open before boot' }],
      } as unknown as SessionPendingInteraction],
    ])
    const { ctx, uiSession, notifications, registeredSections } = await createHarness({
      initialPending: preExisting,
      initialList: makeList([
        { id: 's-pre', displayTitle: '旧会话', running: false },
        { id: 's-1', displayTitle: '会话 1', running: true },
        { id: 's-2', displayTitle: '会话 2', running: true },
      ]),
    })

    const fiber = ctx.plugin({ name: '@dingyi222666/dsh-session-notification', inject, apply })
    await fiber.await()
    expect(fiber.state).toBe(2) // FiberState.ACTIVE

    expect(registeredSections).toHaveLength(1)
    expect(notifications).toHaveLength(0)

    // Publish an approval on s-1 alongside the pre-existing s-pre: only s-1 notifies.
    uiSession.pendingInteractions.set(new Map<SessionId, SessionPendingInteraction>([
      ...preExisting,
      ['s-1' as SessionId, {
        key: 'a-1',
        kind: 'approval',
        sessionId: 's-1' as SessionId,
        toolName: 'bash',
      } as unknown as SessionPendingInteraction],
    ]))
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(notifications).toHaveLength(1)
    expect(notifications[0].options?.body).toContain('会话 1')
    expect(notifications[0].options?.body).toContain('bash')

    // Publish a plan-review question on s-2.
    uiSession.pendingInteractions.set(new Map<SessionId, SessionPendingInteraction>([
      ...preExisting,
      ['s-2' as SessionId, {
        key: 'p-2',
        kind: 'plan-review',
        sessionId: 's-2' as SessionId,
        questions: [{ question: '批准这个计划吗？' }],
      } as unknown as SessionPendingInteraction],
    ]))
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(notifications).toHaveLength(2)
    expect(notifications[1].options?.body).toContain('会话 2')
    expect(notifications[1].options?.body).toContain('批准这个计划吗？')

    await ctx.fiber.dispose()
  })

  it('retains the conversation facet inside sessions.using to read unopened background session details', async () => {
    vi.useFakeTimers()
    const chatNodes = [
      { kind: 'user', data: { seq: 1, content: [{ type: 'text', text: '帮我跑测试' }], source: { kind: 'user' } } },
      { kind: 'assistant-step', data: { blocks: [{ kind: 'text', text: '全部 15 个测试已通过' }] } },
    ]
    const { ctx, listSource, notifications, usingCalls } = await createHarness({
      initialList: makeList([{ id: 'bg-1', displayTitle: '后台会话', running: true }]),
      chatBySession: new Map([
        ['bg-1', { nodes: { values: () => chatNodes[Symbol.iterator]() } }],
      ]),
    })

    const fiber = ctx.plugin({ name: '@dingyi222666/dsh-session-notification', inject, apply })
    await fiber.await()
    expect(fiber.state).toBe(2)

    // Background session finishes while never retained by mainView.
    listSource.set(makeList([{ id: 'bg-1', displayTitle: '后台会话', running: false, updatedAt: 1 }]))

    await vi.advanceTimersByTimeAsync(300)

    expect(usingCalls).toHaveLength(1)
    expect(usingCalls[0]).toEqual({
      id: 'bg-1',
      opts: { source: 'sessionNotification', facets: { conversation: true } },
    })
    expect(notifications).toHaveLength(1)
    expect(notifications[0].options?.body).toBe('「帮我跑测试」已完成\n全部 15 个测试已通过')

    await ctx.fiber.dispose()
  })

  it('detects turn-error failures in unopened background sessions via conversation-faceted using', async () => {
    vi.useFakeTimers()
    const chatNodes = [
      { kind: 'user', data: { seq: 1, content: [{ type: 'text', text: '部署服务' }], source: { kind: 'user' } } },
      { kind: 'turn-error', data: { seq: 2, message: 'provider timeout' } },
    ]
    const { ctx, listSource, notifications } = await createHarness({
      initialList: makeList([{ id: 'bg-fail', displayTitle: '失败会话', running: true }]),
      chatBySession: new Map([
        ['bg-fail', { nodes: { values: () => chatNodes[Symbol.iterator]() } }],
      ]),
    })

    const fiber = ctx.plugin({ name: '@dingyi222666/dsh-session-notification', inject, apply })
    await fiber.await()
    expect(fiber.state).toBe(2)

    listSource.set(makeList([{ id: 'bg-fail', displayTitle: '失败会话', running: false, updatedAt: 1 }]))

    await vi.advanceTimersByTimeAsync(300)

    expect(notifications).toHaveLength(1)
    expect(notifications[0].options?.tag).toBe('dsh-session-notification:failed')
    expect(notifications[0].options?.body).toContain('部署服务')
    expect(notifications[0].options?.body).toContain('provider timeout')

    await ctx.fiber.dispose()
  })

  it('skips sessions.using when the session already retains the conversation facet', async () => {
    vi.useFakeTimers()
    const chatNodes = [
      { kind: 'user', data: { seq: 1, content: [{ type: 'text', text: '前台问题' }], source: { kind: 'user' } } },
      { kind: 'assistant-step', data: { blocks: [{ kind: 'text', text: '前台回答' }] } },
    ]
    const { ctx, listSource, notifications, usingCalls } = await createHarness({
      retainedSessions: new Set(['fg-1']),
      initialList: makeList([{ id: 'fg-1', displayTitle: '前台会话', running: true, retainedBy: { mainView: 1 } }]),
      chatBySession: new Map([
        ['fg-1', { nodes: { values: () => chatNodes[Symbol.iterator]() } }],
      ]),
    })

    const fiber = ctx.plugin({ name: '@dingyi222666/dsh-session-notification', inject, apply })
    await fiber.await()
    expect(fiber.state).toBe(2)

    listSource.set(makeList([{ id: 'fg-1', displayTitle: '前台会话', running: false, retainedBy: { mainView: 1 }, updatedAt: 1 }]))

    await vi.advanceTimersByTimeAsync(300)

    expect(usingCalls).toHaveLength(0)
    expect(notifications).toHaveLength(1)
    expect(notifications[0].options?.body).toBe('「前台问题」已完成\n前台回答')

    await ctx.fiber.dispose()
  })
})
