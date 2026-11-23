/**
 * The notification engine: watches the sessions-list snapshot for running
 * edges and the uiSession pending-interactions map for question/approval
 * edges, classifies each finished run as completed or failed from the chat
 * view nodes, and hands classified events to a dispatcher. The engine is
 * dependency-injected and DOM-free so the classification logic runs under
 * plain vitest; the browser wiring lives in `index.ts`.
 *
 * dsh 0.2.2-rc.2+ data model: the session snapshot still carries no chat
 * view or pending interaction — the chat view comes from
 * `uiConversation.binding(binding).target('chat')` (while a reference retains
 * the `conversation` facet, required since 0.2.2-rc.3) and pending
 * interactions from `ctx.uiSession.pendingInteractions`. The engine's session
 * types come from the api-session-controller client; `AssistantBlock` /
 * `TurnErrorNode` live with the ui-conversation records.
 */
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client';
import type { SessionListState, SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client';
import type { NotificationMode, NotificationSettings, NotificationType, SoundId } from '../settings.ts';
/** One selectable notification kind (re-export for the settings rows). */
export type { NotificationType } from '../settings.ts';
/** Minimal structural view of the alpha chat target snapshot (ui-chat ChatSnapshot). */
export interface ChatViewNode {
    kind: string;
    data: unknown;
}
/** Minimal structural view of the chat node store. */
export interface ChatNodeStoreLike {
    values(): IterableIterator<ChatViewNode>;
}
/** Minimal structural view of the chat snapshot the engine classifies on. */
export interface ChatSnapshotLike {
    nodes: ChatNodeStoreLike;
}
/** One pending interaction's notification facts (from uiSession). */
export interface PendingFacts {
    /** Interaction identity; a replacement interaction carries a new key. */
    key: string;
    /** Plugin notification kind: question covers 'question'/'plan-review'. */
    kind: 'question' | 'approval';
    /** Interaction detail text (question text / tool name). */
    detail: string;
}
/** Per-session facts the engine reads from the session and chat snapshots. */
export interface SessionDetail {
    /** Max seq of materialized turn-error nodes (unretried failures only). */
    maxTurnErrorSeq: number;
    /** Most recent failure message, when one is visible. */
    failureMessage: string | null;
    /** Host agent-error text, null when none. */
    lastAgentError: string | null;
    /** Text of the last assistant message (the final completion text); '' when none. */
    finalText: string;
    /** Text of the latest human user message (the run's subject), when known. */
    lastUserText?: string;
    /** Max seq of materialized user-turn nodes (human or host-authored), when known. */
    latestUserSeq?: number;
}
/** One classified notification event. */
export interface NotificationEvent {
    kind: NotificationType;
    sessionId: SessionId;
    /** Human display title of the session. */
    title: string;
    /** Kind-specific detail (error message, question text, tool name). */
    detail: string;
}
/** Engine dependencies (injected by the browser wiring; stubbed in tests). */
export interface NotificationEnginePorts {
    /** Read one session's detail snapshot; undefined when unavailable. */
    detailOf: (sessionId: SessionId) => SessionDetail | undefined;
    /**
     * Materialize the detail inputs before the settle read (open a session the
     * UI never opened so its chat view can assemble the final assistant text).
     * May return the detail captured while the temporary retention reference is
     * live, before it is released. Optional and best-effort: a failure must not
     * lose the classification.
     */
    ensureDetail?: (sessionId: SessionId) => Promise<SessionDetail | void | undefined>;
    /** Human display title of one session. */
    titleOf: (sessionId: SessionId) => string;
    /** Wait for trailing wire frames after a running edge (settle window). */
    settle: () => Promise<void>;
    /** Whether one session is a subagent (never the main session). */
    isSubagent: (sessionId: SessionId) => boolean;
    /** Whether one session still has a running descendant (recursive). */
    hasRunningDescendants: (sessionId: SessionId) => boolean;
    /**
     * Whether the host holds work that starts another turn by itself (a queued
     * follow-up or an owed goal round); the running bit is false there, so a
     * completion notice would announce an end that has not happened.
     */
    hasUnfinishedWork?: (sessionId: SessionId) => boolean;
    /** Deliver one classified event. */
    emit: (event: NotificationEvent) => void;
}
/**
 * Classifies session lifecycle edges into notification events. Running
 * true→false transitions arm a classification (completed vs failed) after the
 * settle window; a pending-interaction arrival raises the question/permission
 * kinds (observed through the uiSession pending map). A session that was
 * already idle when observation started raises nothing.
 */
export declare class NotificationEngine {
    private readonly ports;
    private readonly prevRunning;
    private readonly runs;
    private readonly settling;
    private readonly pendingKeys;
    /** Completions held back until every descendant subagent has finished. */
    private readonly heldCompletions;
    /** Notification scope. Defaults to the durable default; wiring syncs it. */
    private mode;
    /** @param ports - injected readers and sink. */
    constructor(ports: NotificationEnginePorts);
    /** Update the notification scope (which sessions alert, subagent wait). */
    setNotificationMode(mode: NotificationMode): void;
    /** Emit every held completion whose descendants have all settled. */
    private releaseHeld;
    /** Whether one session should stay silent (subagents under a main-only mode). */
    private silenced;
    /** Whether one completion must wait for its still-running descendants. */
    private waitsFor;
    /** Drop tracking state for every subagent session (subagents were silenced). */
    private forgetSubagents;
    /**
     * Process one sessions-list snapshot (called on every list change).
     * @param sessions - the latest list snapshot.
     */
    observe(sessions: SessionListState): void;
    /**
     * Establish the baseline before live observation: record every session's
     * current running bit and arm runs already in progress, but raise nothing —
     * idle sessions that predate the plugin raise no notification.
     * @param sessions - the first list snapshot.
     */
    seed(sessions: SessionListState): void;
    /**
     * Establish the pending-interaction baseline before live observation: record
     * pre-existing interaction keys without raising notifications for them.
     * @param pending - current effective pending interaction per session.
     */
    seedPending(pending: ReadonlyMap<SessionId, PendingFacts>): void;
    /**
     * Process one uiSession pending-interactions snapshot. A session entering
     * the map (or replacing its interaction — a new key, or a kind switch)
     * raises the question/permission kind; leaving the map raises nothing.
     * @param pending - current effective pending interaction per session.
     */
    observePending(pending: ReadonlyMap<SessionId, PendingFacts>): void;
    /** Capture the pre-run failure baseline when a run starts. */
    private armRun;
    /** Classify a finished run after the settle window (completed vs failed). */
    private settleRun;
    /** The run's latest user message, else the first-prompt session title. */
    private label;
    /** Raise the question/permission kind on a pending-interaction arrival. */
    private raise;
}
/**
 * Project one session's lifecycle + chat snapshots into the engine's
 * {@link SessionDetail}. The final completion text is the joined text of the
 * last assistant step (the chat view's `assistant-step` node) that carries
 * any; the run's subject is the latest human user message, so a notice names
 * the request it answered instead of the first-prompt session title. Failure
 * classification reads the chat view's turn-error nodes plus the session's
 * host agent-error. An absent chat target (session not opened) yields no
 * turn-error, final-text, or user-message facts, never a throw.
 * @param session - the session lifecycle snapshot (session-controller).
 * @param chat - the session's chat view snapshot, when one is materialized.
 * @returns the derived detail.
 */
export declare function sessionDetailOf(session: SessionSnapshot, chat: ChatSnapshotLike | undefined): SessionDetail;
/** Cap the notification subject (a user message can be a whole paragraph). */
export declare function truncateTitle(text: string, max?: number): string;
/** Cap the detail text shown in a notification. */
export declare function truncateDetail(text: string, max?: number): string;
/** Dispatcher dependencies (injected by the browser wiring; stubbed in tests). */
export interface NotificationDispatcherDeps {
    /** Read the current durable preferences at dispatch time. */
    settings: () => NotificationSettings;
    /** Bound namespace translate. */
    t: (key: string) => string;
    /**
     * Play one sound effect; `custom` carries the data URL resolved from
     * {@link customSoundOf}.
     */
    playSound: (sound: SoundId, customUrl?: string) => void;
    /** Read one kind's custom sound data URL (undefined = use the built-in). */
    customSoundOf: (kind: NotificationType) => string | undefined;
    /** Show one system notification; returns whether it was shown. */
    /**
     * Show one system notification under the event kind's collapse tag; the
     * session id lets the click action navigate back to the event's session.
     */
    showBrowser: (title: string, body: string, tag: string, sessionId: SessionId) => boolean;
    /** Whether one session is the one currently shown in the main view. */
    isCurrent: (sessionId: SessionId) => boolean;
    /** Whether the document is hidden (background tab, minimized, or occluded). */
    isHidden: () => boolean;
    /**
     * Whether the document has focus; false while another application is in
     * front. Optional — an absent reader counts as focused, the quiet side.
     */
    hasFocus?: () => boolean;
}
/**
 * Applies the durable preferences to one classified event. The session you
 * are reading stays quiet by default; `currentNotificationMode` widens that
 * (`unfocused` also alerts once another application is in front, `always`
 * alerts regardless). Every other session alerts whenever you are away from
 * it: the kind's effective sound plays when sound is enabled, and a system
 * notification shows when browser notifications are enabled.
 */
export declare class NotificationDispatcher {
    private readonly deps;
    /** @param deps - injected readers and sinks. */
    constructor(deps: NotificationDispatcherDeps);
    /**
     * Dispatch one event.
     * @param event - the classified event.
     */
    dispatch(event: NotificationEvent): void;
}
