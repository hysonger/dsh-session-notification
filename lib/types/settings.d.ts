/**
 * Durable notification preferences shared by the Host schema and the browser
 * scope. This module is deliberately free of schemastery so the browser half
 * and the test suite can import it without a Host dependency; the schemastery
 * wire schema lives in `schema.ts` (Host half only).
 */
/** Settings namespace owned by the notification plugin. */
export declare const NOTIFICATIONS_NS = "dsh-session-notification";
/** The four notification kinds the plugin can raise. */
export declare const NOTIFICATION_TYPES: readonly ["completed", "failed", "question", "permission"];
/** One selectable notification kind. */
export type NotificationType = typeof NOTIFICATION_TYPES[number];
/**
 * When the currently active (viewed) session alerts:
 * - `hidden`: only when the tab is backgrounded or the window minimized (default);
 * - `unfocused`: also alerts when focus switches to another application (even if still on screen);
 * - `always`: always alerts, even while actively viewing the foreground session.
 */
export declare const CURRENT_NOTIFICATION_MODES: readonly ["hidden", "unfocused", "always"];
/** One current-session notification mode. */
export type CurrentNotificationMode = typeof CURRENT_NOTIFICATION_MODES[number];
/**
 * Which sessions alert, and whether a main session waits for its subagents:
 * - `all`: every session alerts, including subagents;
 * - `main`: only the main session alerts, as soon as it goes idle;
 * - `main-wait`: only the main session alerts, held until every subagent it
 *   spawned has finished (the fan-out, not a pause between waves).
 */
export declare const NOTIFICATION_MODES: readonly ["all", "main", "main-wait"];
/** One notification-scope mode. */
export type NotificationMode = typeof NOTIFICATION_MODES[number];
/**
 * The four built-in sound effects. Each notification kind defaults to one of
 * them and can be reassigned to any other (or to `none`).
 */
export declare const SOUND_IDS: readonly ["chime", "fault", "pop", "alert"];
/** A selectable sound effect; `none` mutes the kind, `custom` plays the
 *  kind's uploaded audio (resolved at dispatch time, never persisted). */
export type SoundId = typeof SOUND_IDS[number] | 'none' | 'custom';
/** Per-kind preference: whether the kind notifies and which sound it plays. */
export interface NotificationTypeSettings {
    /** Whether this kind raises notifications at all. */
    enabled: boolean;
    /** Sound played for this kind; `none` plays nothing. */
    sound: SoundId;
}
/** Durable notification preferences. */
export interface NotificationSettings {
    /** Master switch for browser (OS-level) notifications. */
    browserEnabled: boolean;
    /** When events from the session you are currently reading also alert. */
    currentNotificationMode: CurrentNotificationMode;
    /** Which sessions alert and whether the main session waits for subagents. */
    notificationMode: NotificationMode;
    /** Master switch for sound playback. */
    soundEnabled: boolean;
    /** Master playback volume in [0, 1] (0–100%); the sound chain applies a
     *  fixed loudness boost on top, so the scale itself never needs to exceed 1. */
    volume: number;
    /** Per-kind preferences. */
    types: Record<NotificationType, NotificationTypeSettings>;
}
/** Default preferences applied when the user document holds no override. */
export declare const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings;
/** Default sound per notification kind (the "default four sound effects"). */
export declare const DEFAULT_SOUND: Record<NotificationType, SoundId>;
/**
 * Narrow one candidate to a sound id.
 * @param value - value crossing the settings or wire boundary.
 * @returns whether the value is a selectable sound id.
 */
export declare function isSoundId(value: unknown): value is SoundId;
/**
 * Narrow one candidate to a notification kind.
 * @param value - value crossing the settings or wire boundary.
 * @returns whether the value is a notification kind.
 */
export declare function isNotificationType(value: unknown): value is NotificationType;
/**
 * Narrow one candidate to a current-session notification mode.
 * @param value - value crossing the settings or wire boundary.
 * @returns whether the value is a selectable current-session notification mode.
 */
export declare function isCurrentNotificationMode(value: unknown): value is CurrentNotificationMode;
/**
 * Narrow one candidate to a notification mode.
 * @param value - value crossing the settings or wire boundary.
 * @returns whether the value is a selectable notification mode.
 */
export declare function isNotificationMode(value: unknown): value is NotificationMode;
/**
 * Merge an unknown wire section over the defaults, dropping malformed fields
 * so a hand-edited user document degrades to the default rather than to a
 * broken player configuration.
 * @param raw - the raw user-layer section (or undefined when absent).
 * @returns a complete, valid settings object.
 */
export declare function resolveNotificationSettings(raw: unknown): NotificationSettings;
