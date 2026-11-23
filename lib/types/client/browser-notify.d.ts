/**
 * Browser `Notification` API wrapper. Every call is guarded so non-browser
 * or permission-less environments degrade to a no-op instead of throwing.
 */
/** Notification permission state, with `unsupported` for non-browser runs. */
export type BrowserPermission = 'granted' | 'denied' | 'default' | 'unsupported';
/** Tag prefix shared by every alert from this plugin. */
export declare const NOTIFICATION_TAG_PREFIX = "dsh-session-notification";
/** The current notification permission state. */
export declare function browserPermission(): BrowserPermission;
/**
 * Request notification permission. A 'default' state triggers the browser's
 * permission prompt — call from a user gesture (the settings toggle click).
 * @returns the resulting permission state.
 */
export declare function requestBrowserPermission(): Promise<BrowserPermission>;
/**
 * Whether this page runs inside the dsh desktop (Electron) shell. The official
 * client code detects it the same way (`dshDesktop` comes from the desktop
 * preload); the main frame always carries it.
 */
export declare function isDesktopShell(): boolean;
/**
 * Show one system notification, carrying the page's own icon (favicon).
 * Notifications are tagged so a burst of the same kind collapses into a
 * single OS-level card, and `renotify` makes that collapse re-alert instead
 * of updating the card silently (the Windows/Chromium behaviour). Suppressed
 * notifications log the reason (missing API, missing permission, constructor
 * failure) so a silent "no notification" is diagnosable from the console
 * instead of being swallowed; an icon the browser cannot rasterize falls back
 * to an icon-less notification rather than dropping the alert.
 * @param title - notification title.
 * @param body - notification body.
 * @param tag - collapse key; alerts of one kind share it, kinds differ.
 * @param onActivate - click action, run after the page is focused (the client
 * wiring navigates to the event's session here).
 * @returns whether a notification was actually shown.
 */
export declare function showBrowserNotification(title: string, body: string, tag?: string, onActivate?: () => void): boolean;
