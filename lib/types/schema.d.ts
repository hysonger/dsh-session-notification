/**
 * Schemastery wire schema for the `dsh-session-notification` settings namespace.
 * Host-half only: the browser scope validates against the serialized wire
 * schema served by the Host, never this module. The schema types the
 * PERSISTED shape — `sound` never stores `custom` (custom audio is resolved
 * at dispatch time from browser-local storage).
 */
import z from '@deepseek-ai/schemastery';
import { SOUND_IDS, type NotificationSettings, type NotificationType } from './settings.ts';
/** Persisted sound choices: the four built-ins, `custom`, and `none`. */
type PersistedSound = typeof SOUND_IDS[number] | 'custom' | 'none';
/** Persisted per-kind settings (the transient custom audio is stored browser-locally). */
type PersistedTypeSettings = {
    enabled: boolean;
    sound: PersistedSound;
};
/** Persisted section shape, narrowing {@link NotificationSettings}. */
export type PersistedNotificationSettings = Omit<NotificationSettings, 'types'> & {
    types: Record<NotificationType, PersistedTypeSettings>;
};
/** Durable notification-preferences schema shared by the settings seam. */
export declare const NotificationSettingsSchema: z<PersistedNotificationSettings>;
export {};
