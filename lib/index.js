import z from "@deepseek-ai/schemastery";
// src/settings.ts
/**
* Durable notification preferences shared by the Host schema and the browser
* scope. This module is deliberately free of schemastery so the browser half
* and the test suite can import it without a Host dependency; the schemastery
* wire schema lives in `schema.ts` (Host half only).
*/
/** Settings namespace owned by the notification plugin. */
const NOTIFICATIONS_NS = "dsh-session-notification";
/** The four notification kinds the plugin can raise. */
const NOTIFICATION_TYPES = [
	"completed",
	"failed",
	"question",
	"permission"
];
/**
* When the currently active (viewed) session alerts:
* - `hidden`: only when the tab is backgrounded or the window minimized (default);
* - `unfocused`: also alerts when focus switches to another application (even if still on screen);
* - `always`: always alerts, even while actively viewing the foreground session.
*/
const CURRENT_NOTIFICATION_MODES = [
	"hidden",
	"unfocused",
	"always"
];
/**
* Which sessions alert, and whether a main session waits for its subagents:
* - `all`: every session alerts, including subagents;
* - `main`: only the main session alerts, as soon as it goes idle;
* - `main-wait`: only the main session alerts, held until every subagent it
*   spawned has finished (the fan-out, not a pause between waves).
*/
const NOTIFICATION_MODES = [
	"all",
	"main",
	"main-wait"
];
/**
* The four built-in sound effects. Each notification kind defaults to one of
* them and can be reassigned to any other (or to `none`).
*/
const SOUND_IDS = [
	"chime",
	"fault",
	"pop",
	"alert"
];
/** Default preferences applied when the user document holds no override. */
const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
	browserEnabled: false,
	currentNotificationMode: "hidden",
	notificationMode: "main-wait",
	soundEnabled: true,
	volume: .6,
	types: Object.freeze({
		completed: Object.freeze({
			enabled: true,
			sound: "chime"
		}),
		failed: Object.freeze({
			enabled: true,
			sound: "fault"
		}),
		question: Object.freeze({
			enabled: true,
			sound: "pop"
		}),
		permission: Object.freeze({
			enabled: true,
			sound: "alert"
		})
	})
});
/** Default sound per notification kind (the "default four sound effects"). */
const DEFAULT_SOUND = Object.freeze({
	completed: "chime",
	failed: "fault",
	question: "pop",
	permission: "alert"
});
/**
* Narrow one candidate to a sound id.
* @param value - value crossing the settings or wire boundary.
* @returns whether the value is a selectable sound id.
*/
function isSoundId(value) {
	return value === "none" || value === "custom" || SOUND_IDS.some((sound) => sound === value);
}
/**
* Narrow one candidate to a current-session notification mode.
* @param value - value crossing the settings or wire boundary.
* @returns whether the value is a selectable current-session notification mode.
*/
function isCurrentNotificationMode(value) {
	return CURRENT_NOTIFICATION_MODES.some((mode) => mode === value);
}
/**
* Narrow one candidate to a notification mode.
* @param value - value crossing the settings or wire boundary.
* @returns whether the value is a selectable notification mode.
*/
function isNotificationMode(value) {
	return NOTIFICATION_MODES.some((mode) => mode === value);
}
/**
* Merge an unknown wire section over the defaults, dropping malformed fields
* so a hand-edited user document degrades to the default rather than to a
* broken player configuration.
* @param raw - the raw user-layer section (or undefined when absent).
* @returns a complete, valid settings object.
*/
function resolveNotificationSettings(raw) {
	const source = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
	const typeConfig = (kind) => {
		const entry = source.types;
		const own = typeof entry === "object" && entry !== null && !Array.isArray(entry) ? entry[kind] : void 0;
		const config = typeof own === "object" && own !== null && !Array.isArray(own) ? own : {};
		return {
			enabled: typeof config.enabled === "boolean" ? config.enabled : true,
			sound: isSoundId(config.sound) ? config.sound : DEFAULT_SOUND[kind]
		};
	};
	const volume = typeof source.volume === "number" && Number.isFinite(source.volume) ? Math.min(1, Math.max(0, source.volume)) : DEFAULT_NOTIFICATION_SETTINGS.volume;
	const currentMode = () => isCurrentNotificationMode(source.currentNotificationMode) ? source.currentNotificationMode : source.notifyCurrent === true ? "always" : DEFAULT_NOTIFICATION_SETTINGS.currentNotificationMode;
	const mode = () => {
		if (isNotificationMode(source.notificationMode)) return source.notificationMode;
		if (source.mainOnly === false) return "all";
		if (source.waitForSubagents === false) return "main";
		return DEFAULT_NOTIFICATION_SETTINGS.notificationMode;
	};
	return {
		browserEnabled: typeof source.browserEnabled === "boolean" ? source.browserEnabled : DEFAULT_NOTIFICATION_SETTINGS.browserEnabled,
		currentNotificationMode: currentMode(),
		notificationMode: mode(),
		soundEnabled: typeof source.soundEnabled === "boolean" ? source.soundEnabled : DEFAULT_NOTIFICATION_SETTINGS.soundEnabled,
		volume,
		types: {
			completed: typeConfig("completed"),
			failed: typeConfig("failed"),
			question: typeConfig("question"),
			permission: typeConfig("permission")
		}
	};
}
// src/schema.ts
/**
* Schemastery wire schema for the `dsh-session-notification` settings namespace.
* Host-half only: the browser scope validates against the serialized wire
* schema served by the Host, never this module. The schema types the
* PERSISTED shape — `sound` never stores `custom` (custom audio is resolved
* at dispatch time from browser-local storage).
*/
const SOUND_UNION = z.union([
	...SOUND_IDS,
	"custom",
	"none"
]);
const typeSchema = z.object({
	enabled: z.boolean().default(true),
	sound: SOUND_UNION.default("none")
});
/** Durable notification-preferences schema shared by the settings seam. */
const NotificationSettingsSchema = z.object({
	browserEnabled: z.boolean().default(DEFAULT_NOTIFICATION_SETTINGS.browserEnabled),
	currentNotificationMode: z.union([...CURRENT_NOTIFICATION_MODES]).default(DEFAULT_NOTIFICATION_SETTINGS.currentNotificationMode),
	notificationMode: z.union([...NOTIFICATION_MODES]).default(DEFAULT_NOTIFICATION_SETTINGS.notificationMode),
	soundEnabled: z.boolean().default(DEFAULT_NOTIFICATION_SETTINGS.soundEnabled),
	volume: z.number().min(0).max(1).default(DEFAULT_NOTIFICATION_SETTINGS.volume),
	types: z.object({
		[NOTIFICATION_TYPES[0]]: typeSchema,
		[NOTIFICATION_TYPES[1]]: typeSchema,
		[NOTIFICATION_TYPES[2]]: typeSchema,
		[NOTIFICATION_TYPES[3]]: typeSchema
	}).default({
		completed: {
			enabled: true,
			sound: "chime"
		},
		failed: {
			enabled: true,
			sound: "fault"
		},
		question: {
			enabled: true,
			sound: "pop"
		},
		permission: {
			enabled: true,
			sound: "alert"
		}
	})
});
// src/index.ts
/**
* Inert host half: the settings namespace is no longer reserved through the
* settings service (0.1.7 derives plugin config forms from Loader entries),
* and nothing else runs host-side.
* @param _ctx - Host context (unused).
*/
function apply(_ctx) {}
export { CURRENT_NOTIFICATION_MODES, DEFAULT_NOTIFICATION_SETTINGS, NOTIFICATIONS_NS, NOTIFICATION_TYPES, NotificationSettingsSchema, SOUND_IDS, apply, resolveNotificationSettings };
