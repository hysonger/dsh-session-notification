import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type NotificationsKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The Notifications settings section's copy. */
        'notifications': NotificationsKey;
    }
}
declare module '@deepseek-ai/dsh-api-session-controller/client' {
    interface SessionReferenceSourceMap {
        /** Reference held while one notification classification reads a session. */
        sessionNotification: unknown;
    }
}
/** Required services: the slot registry, dictionaries, the session list, the
 *  alpha chat view (uiConversation), and the pending-interaction map
 *  (uiSession). */
export declare const inject: string[];
/**
 * Client plugin body: bind the browser-local preferences scope, register the
 * Notifications section, and watch the sessions list for notification events.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
