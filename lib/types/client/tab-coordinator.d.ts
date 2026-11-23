/**
 * Cross-tab notification arbitration (B + C).
 *
 * Every open dsh tab runs its own plugin instance and receives the same
 * session events, so one completion would ring once per open tab. This
 * coordinator claims each event (`sessionId:kind`) over a BroadcastChannel:
 * a claim is broadcast, a short arbitration window collects rivals, and one
 * tab wins — the earliest claim, tab id breaking a tie. The winner dispatches,
 * every other tab stays silent for that event.
 *
 * Visibility first (C): a visible tab claims immediately, a background tab
 * waits a short grace period so the tab you are actually looking at takes the
 * event first; only when no visible tab claims does a background tab proceed.
 *
 * Without BroadcastChannel the claim always succeeds — the pre-coordination
 * behavior (one alert per tab) rather than silence.
 */
/** Minimal BroadcastChannel face (injectable so tests need no real channel). */
export interface TabChannel {
    postMessage: (message: unknown) => void;
    addEventListener: (type: 'message', listener: (event: {
        data: unknown;
    }) => void) => void;
    removeEventListener: (type: 'message', listener: (event: {
        data: unknown;
    }) => void) => void;
    close: () => void;
}
/** Cross-tab event arbiter. */
export interface TabCoordinator {
    /** @param key - event identity. @returns true when this tab should dispatch it. */
    claim: (key: string) => Promise<boolean>;
    /** Close the channel and drop the listener. */
    dispose: () => void;
}
/** Options for {@link createTabCoordinator} (tests override the defaults). */
export interface TabCoordinatorOptions {
    /** Explicit channel; `null` disables coordination, undefined auto-creates. */
    channel?: TabChannel | null;
    tabId?: string;
    arbitrationMs?: number;
    visibleGraceMs?: number;
    dedupeWindowMs?: number;
    /** Whether this tab is visible (C); defaults to `document.visibilityState`. */
    visible?: () => boolean;
    now?: () => number;
}
/**
 * Create the cross-tab coordinator.
 * @param options - channel/clock/window overrides (tests).
 * @returns the coordinator.
 */
export declare function createTabCoordinator(options?: TabCoordinatorOptions): TabCoordinator;
