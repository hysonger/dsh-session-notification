/**
 * Browser-local preferences scope for the notification plugin.
 *
 * The notification preferences are owned end to end by this plugin and
 * persist in the browser (localStorage), so the plugin works against a
 * pristine harness — no host-side settings-namespace exposure, no change to
 * `packages/host/apiproxy` or any other host package. dsh 0.1.7-alpha.1
 * renamed the client settings contract to `ConfigForm` (schema-derived plugin
 * config forms over the profile patch); this scope implements that official
 * contract over localStorage, so nothing else in the plugin depends on the
 * host settings transport. Reads resolve through the same
 * `resolveNotificationSettings` decoder the host document path used, so
 * hand-edited or malformed storage degrades to the defaults.
 */
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type NotificationSettings } from '../settings.ts';
/** Re-exported for the section store (the official 0.1.7 form snapshot). */
export type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client';
/** localStorage key holding the whole preferences section. */
export declare const LOCAL_STORAGE_KEY = "dsh-session-notification:preferences";
/**
 * Create the browser-local scope.
 * @returns a scope whose snapshot is `ready` immediately, backed by
 * localStorage when available and by memory otherwise.
 */
export declare function createLocalSettingsScope(): ConfigForm<NotificationSettings>;
