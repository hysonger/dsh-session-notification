import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { CurrentNotificationMode, NotificationMode, NotificationType, NotificationTypeSettings, SoundId } from '../settings.ts';
import type { createNotificationsStore } from './settings-store.ts';
/** Injected business face: preference writes, sound preview, permission and
 *  custom-audio flows. */
export interface NotificationsSectionInjected {
    /** Persist the browser-notification master switch (grants permission first). */
    setBrowserEnabled: (enabled: boolean) => Promise<void>;
    /** Persist when the current session alerts. */
    setCurrentNotificationMode: (mode: CurrentNotificationMode) => void;
    /** Persist the notification scope (which sessions alert, subagent wait). */
    setNotificationMode: (mode: NotificationMode) => void;
    /** Persist the sound master switch. */
    setSoundEnabled: (enabled: boolean) => void;
    /** Persist the master volume. */
    setVolume: (volume: number) => void;
    /** Persist one per-kind preference. */
    setType: (kind: NotificationType, patch: Partial<NotificationTypeSettings>) => void;
    /** Preview one sound effect (custom carries the data URL). */
    testSound: (sound: SoundId, customUrl?: string) => void;
    /** Request browser notification permission (user gesture). */
    requestPermission: () => Promise<void>;
    /** Show one system notification immediately, to verify the channel. */
    testBrowserNotification: () => void;
    /** Store one kind's custom audio from a picked file. */
    uploadCustomSound: (kind: NotificationType, file: File) => Promise<void>;
}
/** Full component props: runtime share + store share + locale seat + injected face. */
export type NotificationsSectionProps = PropsRuntime<'settings.section'> & PropsStore<ReturnType<typeof createNotificationsStore>> & PropsLocale<'notifications'> & NotificationsSectionInjected;
/**
 * Render the Notifications settings section.
 * @param props - composed slot props.
 */
export declare function NotificationsSection({ t, useStore, setBrowserEnabled, setCurrentNotificationMode, setNotificationMode, setSoundEnabled, setVolume, setType, testSound, requestPermission, testBrowserNotification, uploadCustomSound, }: NotificationsSectionProps): import("react").JSX.Element;
