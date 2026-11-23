/**
 * Notifications settings section store: a mirror of the plugin's
 * browser-local preferences scope, plus the write actions the section's
 * inject face exposes. The slot renderer owns the store instance and hands
 * its bound actions to the inject factory (the ui-theme row pattern); the
 * apply world syncs accepted scope snapshots through those actions. Component
 * reads go through `useStore`.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type CurrentNotificationMode, type NotificationMode, type NotificationSettings, type NotificationType, type NotificationTypeSettings } from '../settings.ts';
import { type BrowserPermission } from './browser-notify.ts';
import { type CustomSounds } from './custom-audio.ts';
export type { BrowserPermission } from './browser-notify.ts';
/** Store state mirrored from the preferences scope. */
export interface NotificationsState {
    /** Scope readiness (`unavailable` = no accepted snapshot — defaults apply). */
    status: 'loading' | 'ready' | 'unavailable';
    /** Whether the preferences accept writes. */
    writable: boolean;
    /** Current durable preferences. */
    settings: NotificationSettings;
    /** Browser notification permission (updated after user-gesture requests). */
    permission: BrowserPermission;
    /** Per-kind custom sound data URLs (browser-local; override the built-ins). */
    customSounds: CustomSounds;
}
/** Declared action shape giving the exported factory a stable return type. */
type NotificationsActions = {
    adopt: (draft: NotificationsState, snapshot: ConfigFormSnapshot<NotificationSettings>) => void;
    setBrowserEnabled: (draft: NotificationsState, enabled: boolean) => void;
    setCurrentNotificationMode: (draft: NotificationsState, mode: CurrentNotificationMode) => void;
    setNotificationMode: (draft: NotificationsState, mode: NotificationMode) => void;
    setSoundEnabled: (draft: NotificationsState, enabled: boolean) => void;
    setVolume: (draft: NotificationsState, volume: number) => void;
    setType: (draft: NotificationsState, kind: NotificationType, patch: Partial<NotificationTypeSettings>) => void;
    setPermission: (draft: NotificationsState, permission: BrowserPermission) => void;
    setCustomSound: (draft: NotificationsState, kind: NotificationType, dataUrl: string | null) => void;
};
/**
 * Declares the Notifications section state and write surface.
 * @returns the store handle.
 */
export declare function createNotificationsStore(): EngineStoreHandle<NotificationsState, NotificationsActions>;
