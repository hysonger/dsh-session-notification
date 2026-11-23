window.__ModuleLoader__.load({
	id: "@dingyi222666/dsh-session-notification",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		// src/settings.ts
		/**
		* Durable notification preferences shared by the Host schema and the browser
		* scope. This module is deliberately free of schemastery so the browser half
		* and the test suite can import it without a Host dependency; the schemastery
		* wire schema lives in `schema.ts` (Host half only).
		*/
		/** Settings namespace owned by the notification plugin. */
		const NOTIFICATIONS_NS = "dsh-session-notification";
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
		// src/client/local-settings.ts
		/** localStorage key holding the whole preferences section. */
		const LOCAL_STORAGE_KEY = `${NOTIFICATIONS_NS}:preferences`;
		/** Read the browser storage when present (absent in Node/SSR). */
		function storage() {
			try {
				return typeof localStorage === "undefined" ? void 0 : localStorage;
			} catch {
				return;
			}
		}
		/** Parse one stored section; anything malformed resolves to the defaults. */
		function parseStored(raw) {
			if (raw === null) return void 0;
			try {
				return JSON.parse(raw);
			} catch {
				return;
			}
		}
		/**
		* Create the browser-local scope.
		* @returns a scope whose snapshot is `ready` immediately, backed by
		* localStorage when available and by memory otherwise.
		*/
		function createLocalSettingsScope() {
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const listener of listeners) listener();
			};
			let value = resolveNotificationSettings(parseStored(storage()?.getItem(LOCAL_STORAGE_KEY) ?? null));
			let revision = 1;
			const snapshot = () => ({
				status: "ready",
				value,
				base: DEFAULT_NOTIFICATION_SETTINGS,
				user: void 0,
				revision,
				writable: true
			});
			const commit = (next, persist) => {
				value = next;
				revision += 1;
				if (persist) try {
					storage()?.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
				} catch {}
				notify();
			};
			if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
				if (event.key !== LOCAL_STORAGE_KEY) return;
				commit(resolveNotificationSettings(parseStored(event.newValue)), false);
			});
			return {
				getSnapshot: snapshot,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				async mutate(ops, _expectedRevision) {
					const next = JSON.parse(JSON.stringify(value));
					for (const op of ops) {
						if (op.path.length === 0) {
							if (op.op === "set") {
								for (const key of Object.keys(next)) delete next[key];
								Object.assign(next, op.value);
							}
							continue;
						}
						if (op.op === "set") deepSet(next, op.path, op.value);
						else deepUnset(next, op.path);
					}
					commit(resolveNotificationSettings(next), true);
					return true;
				},
				async set(field, fieldValue) {
					commit(resolveNotificationSettings({
						...value,
						[field]: fieldValue
					}), true);
					return true;
				},
				async unset(field) {
					const fallback = DEFAULT_NOTIFICATION_SETTINGS[field];
					commit(resolveNotificationSettings({
						...value,
						[field]: fallback
					}), true);
					return true;
				}
			};
		}
		/** Walk one path and assign the value at its end (creating intermediates). */
		function deepSet(root, path, value) {
			let cursor = root;
			for (let index = 0; index < path.length - 1; index += 1) {
				const segment = path[index];
				const next = cursor[segment];
				if (typeof next !== "object" || next === null || Array.isArray(next)) {
					const created = {};
					cursor[segment] = created;
					cursor = created;
				} else cursor = next;
			}
			cursor[path[path.length - 1]] = value;
		}
		/** Walk one path and delete the value at its end (no-op when absent). */
		function deepUnset(root, path) {
			let cursor = root;
			for (let index = 0; index < path.length - 1; index += 1) {
				const next = cursor[path[index]];
				if (typeof next !== "object" || next === null || Array.isArray(next)) return;
				cursor = next;
			}
			delete cursor[path[path.length - 1]];
		}
		// src/client/tab-coordinator.ts
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
		/** Channel name shared by every same-origin dsh tab. */
		const CHANNEL_NAME = "dsh-session-notification";
		/** Window in ms during which a rival's claim can beat ours. */
		const DEFAULT_ARBITRATION_MS = 50;
		/** How long a background tab yields the floor to a visible one. */
		const DEFAULT_VISIBLE_GRACE_MS = 60;
		/** Window in ms in which a repeated claim for the same event is a duplicate. */
		const DEFAULT_DEDUPE_WINDOW_MS = 1e3;
		/** The shared channel, when the browser exposes BroadcastChannel. */
		function defaultChannel() {
			try {
				if (typeof BroadcastChannel === "undefined") return void 0;
				return new BroadcastChannel(CHANNEL_NAME);
			} catch {
				return;
			}
		}
		/** Whether this tab is the one the user is looking at. */
		function defaultVisible() {
			return typeof document === "undefined" || document.visibilityState === "visible";
		}
		const delay = (ms) => new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
		/**
		* Create the cross-tab coordinator.
		* @param options - channel/clock/window overrides (tests).
		* @returns the coordinator.
		*/
		function createTabCoordinator(options = {}) {
			const arbitrationMs = options.arbitrationMs ?? DEFAULT_ARBITRATION_MS;
			const visibleGraceMs = options.visibleGraceMs ?? DEFAULT_VISIBLE_GRACE_MS;
			const dedupeWindowMs = options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
			const now = options.now ?? (() => Date.now());
			const visible = options.visible ?? defaultVisible;
			const tabId = options.tabId ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
			const channel = options.channel === void 0 ? defaultChannel() : options.channel ?? void 0;
			const recent = /* @__PURE__ */ new Map();
			const rivals = /* @__PURE__ */ new Map();
			const wins = /* @__PURE__ */ new Set();
			/** Earlier claim wins; equal timestamps fall back to the tab id. */
			const beats = (a, b) => a.at < b.at || a.at === b.at && a.tabId < b.tabId;
			const onMessage = (event) => {
				const message = event.data;
				if (message === null || typeof message !== "object") return;
				const { key, tabId: sender, type, at } = message;
				if (sender === void 0 || sender === tabId || typeof key !== "string") return;
				if (type === "claim" && typeof at === "number") {
					const current = rivals.get(key);
					if (current === void 0 || beats({
						at,
						tabId: sender
					}, current)) rivals.set(key, {
						at,
						tabId: sender
					});
				} else if (type === "win") {
					wins.add(key);
					setTimeout(() => {
						wins.delete(key);
					}, dedupeWindowMs);
				}
			};
			channel?.addEventListener("message", onMessage);
			return {
				async claim(key) {
					const started = now();
					const last = recent.get(key);
					if (last !== void 0 && started - last < dedupeWindowMs) return false;
					recent.set(key, started);
					if (channel === void 0) return true;
					if (!visible()) {
						await delay(visibleGraceMs);
						if (rivals.has(key)) {
							rivals.delete(key);
							return false;
						}
					}
					const mine = {
						at: now(),
						tabId
					};
					channel.postMessage({
						type: "claim",
						key,
						...mine
					});
					await delay(arbitrationMs);
					if (wins.delete(key)) {
						rivals.delete(key);
						return false;
					}
					const rival = rivals.get(key);
					rivals.delete(key);
					if (rival !== void 0 && beats(rival, mine)) return false;
					channel.postMessage({
						type: "win",
						key,
						tabId
					});
					return true;
				},
				dispose() {
					channel?.removeEventListener("message", onMessage);
					channel?.close();
				}
			};
		}
		// src/client/sounds.ts
		/** The four selectable sound effects (the "default four sounds"). */
		const SOUND_PATTERNS = {
			/** 叮咚 — a pleasant ascending two-note chime (E5 → A5). */
			chime: { notes: [{
				at: 0,
				frequency: 659.25,
				duration: .2,
				type: "sine",
				gain: .9
			}, {
				at: .16,
				frequency: 880,
				duration: .4,
				type: "sine",
				gain: .9
			}] },
			/** 低鸣 — a low descending sawtooth pair (A3 → E3). */
			fault: { notes: [{
				at: 0,
				frequency: 220,
				duration: .24,
				type: "sawtooth",
				gain: .45
			}, {
				at: .2,
				frequency: 164.81,
				duration: .42,
				type: "sawtooth",
				gain: .45
			}] },
			/** 轻响 — one short soft triangle pop (A5). */
			pop: { notes: [{
				at: 0,
				frequency: 880,
				duration: .09,
				type: "triangle",
				gain: .8
			}] },
			/** 警示 — a square-wave double beep plus a higher third hit. */
			alert: { notes: [
				{
					at: 0,
					frequency: 660,
					duration: .12,
					type: "square",
					gain: .35
				},
				{
					at: .18,
					frequency: 660,
					duration: .12,
					type: "square",
					gain: .35
				},
				{
					at: .36,
					frequency: 880,
					duration: .24,
					type: "square",
					gain: .35
				}
			] }
		};
		/** Total duration of a pattern in seconds (for scheduling tests). */
		function patternDuration(pattern) {
			let end = 0;
			for (const note of pattern.notes) end = Math.max(end, note.at + note.duration);
			return end;
		}
		/** Fixed loudness preamp applied after the master volume (≈ +6 dB). The
		*  volume slider stays 0–100%; this boost is what makes the sounds louder,
		*  and the soft limiter after it catches the overs instead of hard-clipping. */
		const LOUDNESS_BOOST = 2;
		/** Lead time between `currentTime` and the first scheduled note. */
		const START_LEAD_SECONDS = .02;
		/** Released-oscillator tail kept alive after a note's nominal duration. */
		const NOTE_TAIL_SECONDS = .05;
		/** Quiet margin before the idle suspend, covering gain release and device latency. */
		const IDLE_SUSPEND_MARGIN_SECONDS = .55;
		/** Margin after a custom element or final oscillator ends before suspending. */
		const CUSTOM_IDLE_MARGIN_SECONDS = .25;
		/**
		* Web Audio player. The AudioContext is created lazily on the first play and
		* reused; a suspended context is resumed on every play (including the autoplay
		* policy's initial suspension), so sound starts working as soon as the user
		* has interacted with the page.
		*
		* The context is suspended again once the playback is over — a running
		* AudioContext holds a system output stream (and, on macOS, a
		* `PreventUserIdleSystemSleep` assertion) for as long as it lives, which would
		* pin the machine awake for the whole tab lifetime after a single chime
		* (issue #6). Built-in patterns use their known duration; custom audio uses
		* the element's `ended` event.
		*
		* Signal chain: per-note gain → master (volume) → loudness boost → soft
		* limiter → destination. The boost raises every sound by a fixed amount at
		* any volume setting, and the limiter (threshold −1 dB, ratio 20) tames only
		* the peaks that would otherwise clip, so the loudest notes stay clean.
		*/
		var SoundPlayer = class {
			volume;
			context;
			master;
			/** Pending idle-suspend timer; every new playback clears it. */
			idleTimer;
			/** Current custom-audio element and its per-play source node. */
			customAudio;
			customSource;
			/**
			* @param volume - reads the current master volume in [0, 1] at play time.
			*/
			constructor(volume) {
				this.volume = volume;
			}
			/**
			* Play one built-in sound effect.
			* @param sound - the sound id; `none` and `custom` (which plays through
			* {@link playCustom}) play nothing here.
			*/
			play(sound) {
				if (sound === "none" || sound === "custom") return;
				const context = this.ensureContext();
				if (context === void 0 || this.master === void 0) return;
				const pattern = SOUND_PATTERNS[sound];
				const start = context.currentTime + START_LEAD_SECONDS;
				this.master.gain.setValueAtTime(clampVolume(this.volume()), start);
				let finalOscillator;
				let finalStop = Number.NEGATIVE_INFINITY;
				for (const note of pattern.notes) {
					const oscillator = context.createOscillator();
					const gain = context.createGain();
					oscillator.type = note.type;
					oscillator.frequency.value = note.frequency;
					const at = start + note.at;
					gain.gain.setValueAtTime(0, at);
					gain.gain.linearRampToValueAtTime(note.gain, at + .01);
					gain.gain.exponentialRampToValueAtTime(.001, at + note.duration);
					oscillator.connect(gain).connect(this.master);
					const stop = at + note.duration + NOTE_TAIL_SECONDS;
					oscillator.start(at);
					oscillator.stop(stop);
					if (stop > finalStop) {
						finalStop = stop;
						finalOscillator = oscillator;
					}
				}
				finalOscillator?.addEventListener("ended", () => {
					this.scheduleIdleSuspend(CUSTOM_IDLE_MARGIN_SECONDS);
				}, { once: true });
				this.scheduleIdleSuspend(START_LEAD_SECONDS + patternDuration(pattern) + NOTE_TAIL_SECONDS + IDLE_SUSPEND_MARGIN_SECONDS);
			}
			/** Create (or resume) the shared context; undefined outside browsers. */
			ensureContext() {
				if (typeof AudioContext === "undefined") return void 0;
				if (this.context === void 0) {
					this.context = new AudioContext();
					this.master = this.context.createGain();
					const boost = this.context.createGain();
					boost.gain.value = LOUDNESS_BOOST;
					const limiter = this.context.createDynamicsCompressor();
					limiter.threshold.value = -1;
					limiter.knee.value = 3;
					limiter.ratio.value = 20;
					limiter.attack.value = .001;
					limiter.release.value = .05;
					this.master.connect(boost).connect(limiter).connect(this.context.destination);
				}
				if (this.context.state === "suspended") this.context.resume();
				return this.context;
			}
			/**
			* Play a user-supplied audio file (data URL). The element's audio feeds the
			* same master/boost/limiter chain through a MediaElementSource, so custom
			* audio gets the same loudness treatment as the built-ins instead of being
			* capped at the element's own volume (browser maximum 1.0). When the source
			* cannot be created (unusual browsers), the element plays at the master
			* volume as a fallback.
			*
			* The element's length is unknown, so the idle suspend hangs off `ended`:
			* when playback stops (or is refused) the per-play source is disconnected so
			* nodes do not accumulate, and the shared context is suspended again.
			* @param dataUrl - the audio data URL.
			*/
			playCustom(dataUrl) {
				if (typeof Audio === "undefined") return;
				const context = this.ensureContext();
				if (context === void 0 || this.master === void 0) {
					const audio = new Audio(dataUrl);
					audio.volume = clampVolume(this.volume());
					audio.play().catch(() => {});
					return;
				}
				this.releaseCustomSource();
				this.master.gain.setValueAtTime(clampVolume(this.volume()), context.currentTime);
				const audio = new Audio(dataUrl);
				this.customAudio = audio;
				try {
					const source = context.createMediaElementSource(audio);
					source.connect(this.master);
					this.customSource = source;
				} catch (_sourceFailed) {
					audio.volume = clampVolume(this.volume());
				}
				/** Finish this play: drop its source, then let the context go idle. */
				const release = () => {
					if (this.customAudio !== audio) return;
					this.releaseCustomSource();
					this.scheduleIdleSuspend(CUSTOM_IDLE_MARGIN_SECONDS);
				};
				audio.addEventListener("ended", release, { once: true });
				audio.addEventListener("error", release, { once: true });
				audio.play().catch(() => {
					release();
				});
			}
			/**
			* Release every audio resource this player owns: the pending idle timer, the
			* live custom source, and the shared context. Called when the plugin unloads
			* so an unloaded page never keeps a system output stream (or its power
			* assertion) alive.
			*/
			dispose() {
				this.clearIdleSuspend();
				this.releaseCustomSource();
				const context = this.context;
				this.context = void 0;
				this.master = void 0;
				if (context !== void 0 && context.state !== "closed") context.close();
			}
			/** Disconnect and forget the live custom-audio source, if any. */
			releaseCustomSource() {
				this.customSource?.disconnect();
				this.customSource = void 0;
				this.customAudio = void 0;
			}
			/** Schedule the idle suspend, replacing any pending one. */
			scheduleIdleSuspend(delaySeconds) {
				this.clearIdleSuspend();
				this.idleTimer = setTimeout(() => {
					this.idleTimer = void 0;
					if (this.context?.state === "running") this.context.suspend();
				}, Math.max(0, delaySeconds) * 1e3);
			}
			/** Cancel a pending idle suspend. */
			clearIdleSuspend() {
				if (this.idleTimer === void 0) return;
				clearTimeout(this.idleTimer);
				this.idleTimer = void 0;
			}
		};
		/** Clamp a volume candidate to [0, 1] (0–100%); the loudness boost is applied
		*  separately on the Web Audio chain, so the slider never needs to exceed 1. */
		function clampVolume(volume) {
			return Math.min(1, Math.max(0, volume));
		}
		// src/client/browser-notify.ts
		/** Tag prefix shared by every alert from this plugin. */
		const NOTIFICATION_TAG_PREFIX = "dsh-session-notification";
		/**
		* Live notifications kept referenced until they close: a click handler is a
		* property of the JS wrapper, so letting it be collected can swallow the
		* activation (the platform side only knows the notification id).
		*/
		const liveNotifications = /* @__PURE__ */ new Set();
		/** The current notification permission state. */
		function browserPermission() {
			if (typeof Notification === "undefined") return "unsupported";
			return Notification.permission;
		}
		/**
		* Request notification permission. A 'default' state triggers the browser's
		* permission prompt — call from a user gesture (the settings toggle click).
		* @returns the resulting permission state.
		*/
		async function requestBrowserPermission() {
			if (typeof Notification === "undefined") return "unsupported";
			let permission = Notification.permission;
			if (permission === "default") permission = await Notification.requestPermission();
			return permission;
		}
		/** Schemes a native notification layer can fetch an icon from. */
		const ICON_URL_SCHEME = /^(?:https?|blob):/i;
		/**
		* A `data:` icon is usable only when it carries a raster image: native
		* notification layers decode bitmaps and never rasterize SVG documents.
		*/
		const RASTER_DATA_ICON = /^data:image\/(?!svg)/i;
		/** One declared icon link, or undefined when absent or unusable natively. */
		function iconUrlOf(link) {
			if (link === null || link.href.length === 0) return void 0;
			if (ICON_URL_SCHEME.test(link.href)) return link.href;
			return RASTER_DATA_ICON.test(link.href) ? link.href : void 0;
		}
		/**
		* Whether this page runs inside the dsh desktop (Electron) shell. The official
		* client code detects it the same way (`dshDesktop` comes from the desktop
		* preload); the main frame always carries it.
		*/
		function isDesktopShell() {
			return typeof globalThis !== "undefined" && "dshDesktop" in globalThis;
		}
		/**
		* Resolve the current page's own icon (favicon) as an absolute URL, preferring
		* the largest declared one (`apple-touch-icon` over `rel=icon`). `link.href`
		* is the resolved absolute URL, so relative favicon paths need no base work.
		* @returns the icon URL, or undefined when the page declares none.
		*/
		function pageIconUrl() {
			if (typeof document === "undefined") return void 0;
			return iconUrlOf(document.querySelector("link[rel=\"apple-touch-icon\"]")) ?? iconUrlOf(document.querySelector("link[rel~=\"icon\"]"));
		}
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
		function showBrowserNotification(title, body, tag = NOTIFICATION_TAG_PREFIX, onActivate) {
			if (typeof Notification === "undefined") {
				console.warn("[dsh-session-notification] browser Notification API is unavailable (insecure context or unsupported browser)");
				return false;
			}
			if (Notification.permission !== "granted") {
				console.warn(`[dsh-session-notification] browser notification suppressed: permission is "${Notification.permission}"`);
				return false;
			}
			/** Focus the page, run the caller's navigation, then dismiss the card. */
			const activate = (notification) => {
				liveNotifications.add(notification);
				const forget = () => {
					liveNotifications.delete(notification);
				};
				if (typeof notification.addEventListener === "function") notification.addEventListener("close", forget, { once: true });
				notification.onclick = () => {
					forget();
					window.focus();
					try {
						onActivate?.();
					} catch (error) {
						console.warn("[dsh-session-notification] notification click action failed", error);
					}
					notification.close();
				};
			};
			const icon = pageIconUrl();
			const options = {
				body,
				tag,
				renotify: true,
				...isDesktopShell() ? { silent: true } : {},
				...icon === void 0 ? {} : { icon }
			};
			try {
				activate(new Notification(title, options));
				return true;
			} catch (error) {
				if (icon !== void 0) try {
					activate(new Notification(title, {
						body,
						tag,
						renotify: true
					}));
					console.warn("[dsh-session-notification] page icon was rejected; notification shown without it", error);
					return true;
				} catch (_secondFailure) {
					console.warn("[dsh-session-notification] Notification constructor failed; check the browser/OS notification settings", _secondFailure);
					return false;
				}
				console.warn("[dsh-session-notification] Notification constructor failed; check the browser/OS notification settings", error);
				return false;
			}
		}
		// src/client/custom-audio.ts
		/** localStorage key for the custom-sound map. */
		const STORAGE_KEY = "dsh-session-notification.customSounds";
		/** Read the whole custom-sound map from localStorage. */
		function readCustomSounds() {
			if (typeof localStorage === "undefined") return {};
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return {};
				const parsed = JSON.parse(raw);
				if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
				return parsed;
			} catch (_corruptEntry) {
				return {};
			}
		}
		/** Read one kind's custom sound data URL (undefined = none). */
		function readCustomSound(kind) {
			const url = readCustomSounds()[kind];
			return url !== void 0 && url.length > 0 ? url : void 0;
		}
		/** Persist one kind's custom sound (null removes it). */
		function writeCustomSound(kind, dataUrl) {
			if (typeof localStorage === "undefined") return;
			const next = { ...readCustomSounds() };
			if (dataUrl === null) delete next[kind];
			else next[kind] = dataUrl;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		}
		/** The sound map with one entry replaced (pure helper for store mirrors). */
		function withCustomSound(current, kind, dataUrl) {
			const next = { ...current };
			if (dataUrl === null) delete next[kind];
			else next[kind] = dataUrl;
			return next;
		}
		/** Read a picked audio file as a data URL (the stored custom-sound form). */
		function readFileAsDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const result = reader.result;
					if (typeof result === "string") resolve(result);
					else reject(/* @__PURE__ */ new Error("audio file read produced no data URL"));
				};
				reader.onerror = () => {
					reject(reader.error ?? /* @__PURE__ */ new Error("audio file read failed"));
				};
				reader.readAsDataURL(file);
			});
		}
		// src/client/notification-service.ts
		/**
		* Classifies session lifecycle edges into notification events. Running
		* true→false transitions arm a classification (completed vs failed) after the
		* settle window; a pending-interaction arrival raises the question/permission
		* kinds (observed through the uiSession pending map). A session that was
		* already idle when observation started raises nothing.
		*/
		var NotificationEngine = class {
			ports;
			prevRunning = /* @__PURE__ */ new Map();
			runs = /* @__PURE__ */ new Map();
			settling = /* @__PURE__ */ new Set();
			pendingKeys = /* @__PURE__ */ new Map();
			/** Completions held back until every descendant subagent has finished. */
			heldCompletions = /* @__PURE__ */ new Map();
			/** Notification scope. Defaults to the durable default; wiring syncs it. */
			mode = "main-wait";
			/** @param ports - injected readers and sink. */
			constructor(ports) {
				this.ports = ports;
			}
			/** Update the notification scope (which sessions alert, subagent wait). */
			setNotificationMode(mode) {
				const previous = this.mode;
				this.mode = mode;
				if (mode !== "all") this.forgetSubagents();
				if (previous === "main-wait" && mode !== "main-wait") this.releaseHeld();
			}
			/** Emit every held completion whose descendants have all settled. */
			releaseHeld() {
				for (const [id, detail] of [...this.heldCompletions]) {
					if (this.ports.hasUnfinishedWork?.(id) === true) {
						this.heldCompletions.delete(id);
						continue;
					}
					if (this.waitsFor(id)) continue;
					this.heldCompletions.delete(id);
					this.ports.emit({
						kind: "completed",
						sessionId: id,
						title: this.ports.titleOf(id),
						detail
					});
				}
			}
			/** Whether one session should stay silent (subagents under a main-only mode). */
			silenced(id) {
				return this.mode !== "all" && this.ports.isSubagent(id);
			}
			/** Whether one completion must wait for its still-running descendants. */
			waitsFor(id) {
				return this.mode === "main-wait" && this.ports.hasRunningDescendants(id);
			}
			/** Drop tracking state for every subagent session (subagents were silenced). */
			forgetSubagents() {
				for (const id of /* @__PURE__ */ new Set([
					...this.prevRunning.keys(),
					...this.runs.keys(),
					...this.pendingKeys.keys()
				])) {
					if (!this.ports.isSubagent(id)) continue;
					this.prevRunning.delete(id);
					this.runs.delete(id);
					this.pendingKeys.delete(id);
				}
			}
			/**
			* Process one sessions-list snapshot (called on every list change).
			* @param sessions - the latest list snapshot.
			*/
			observe(sessions) {
				const seen = /* @__PURE__ */ new Set();
				for (const summary of Object.values(sessions.byId)) {
					const id = summary.id;
					seen.add(id);
					if (this.silenced(id)) {
						this.prevRunning.delete(id);
						this.runs.delete(id);
						this.pendingKeys.delete(id);
						continue;
					}
					const prevRunning = this.prevRunning.get(id) ?? false;
					if (prevRunning && !summary.running) this.settleRun(id);
					else if (!prevRunning && summary.running) this.armRun(id);
					this.prevRunning.set(id, summary.running);
				}
				for (const id of this.prevRunning.keys()) if (!seen.has(id)) {
					this.prevRunning.delete(id);
					this.runs.delete(id);
					this.pendingKeys.delete(id);
					this.heldCompletions.delete(id);
				}
				this.releaseHeld();
			}
			/**
			* Establish the baseline before live observation: record every session's
			* current running bit and arm runs already in progress, but raise nothing —
			* idle sessions that predate the plugin raise no notification.
			* @param sessions - the first list snapshot.
			*/
			seed(sessions) {
				for (const summary of Object.values(sessions.byId)) {
					const id = summary.id;
					if (this.silenced(id)) continue;
					this.prevRunning.set(id, summary.running);
					if (summary.running) this.armRun(id);
				}
			}
			/**
			* Establish the pending-interaction baseline before live observation: record
			* pre-existing interaction keys without raising notifications for them.
			* @param pending - current effective pending interaction per session.
			*/
			seedPending(pending) {
				for (const [id, facts] of pending) {
					if (this.silenced(id)) continue;
					this.pendingKeys.set(id, facts.key);
				}
			}
			/**
			* Process one uiSession pending-interactions snapshot. A session entering
			* the map (or replacing its interaction — a new key, or a kind switch)
			* raises the question/permission kind; leaving the map raises nothing.
			* @param pending - current effective pending interaction per session.
			*/
			observePending(pending) {
				for (const [id, facts] of pending) {
					if (this.silenced(id)) {
						this.pendingKeys.delete(id);
						continue;
					}
					const prevKey = this.pendingKeys.get(id);
					if (prevKey === void 0 || prevKey !== facts.key) this.raise(facts.kind, id, facts.detail);
					this.pendingKeys.set(id, facts.key);
				}
				for (const id of this.pendingKeys.keys()) if (!pending.has(id)) this.pendingKeys.delete(id);
			}
			/** Capture the pre-run failure baseline when a run starts. */
			armRun(id) {
				this.heldCompletions.delete(id);
				const detail = this.ports.detailOf(id);
				this.runs.set(id, {
					baselineErrorSeq: detail?.maxTurnErrorSeq ?? 0,
					baselineAgentError: detail?.lastAgentError ?? null,
					hadBaselineDetail: detail !== void 0
				});
			}
			/** Classify a finished run after the settle window (completed vs failed). */
			async settleRun(id) {
				const run = this.runs.get(id);
				if (run === void 0 || this.settling.has(id)) return;
				this.runs.delete(id);
				this.settling.add(id);
				try {
					await this.ports.settle();
					if (this.runs.has(id)) return;
					if (this.silenced(id)) {
						this.prevRunning.delete(id);
						return;
					}
					let materialized;
					try {
						materialized = await this.ports.ensureDetail?.(id) ?? void 0;
					} catch {}
					if (this.runs.has(id)) return;
					if (this.silenced(id)) {
						this.prevRunning.delete(id);
						return;
					}
					const detail = materialized ?? this.ports.detailOf(id);
					const turnErrorNew = detail !== void 0 && (run.hadBaselineDetail ? detail.maxTurnErrorSeq > run.baselineErrorSeq : detail.maxTurnErrorSeq > 0 && detail.maxTurnErrorSeq > (detail.latestUserSeq ?? 0));
					const agentErrorNew = detail !== void 0 && detail.lastAgentError !== null && detail.lastAgentError !== run.baselineAgentError;
					const failed = turnErrorNew || agentErrorNew;
					const message = failed ? detail?.failureMessage ?? detail?.lastAgentError ?? "" : detail?.finalText ?? "";
					if (failed) {
						this.heldCompletions.delete(id);
						this.ports.emit({
							kind: "failed",
							sessionId: id,
							title: this.label(id, detail),
							detail: message
						});
						return;
					}
					if (this.ports.hasUnfinishedWork?.(id) === true) return;
					if (this.waitsFor(id)) {
						this.heldCompletions.set(id, message);
						return;
					}
					this.ports.emit({
						kind: "completed",
						sessionId: id,
						title: this.label(id, detail),
						detail: message
					});
				} finally {
					this.settling.delete(id);
				}
			}
			/** The run's latest user message, else the first-prompt session title. */
			label(id, detail) {
				const text = truncateTitle(detail?.lastUserText ?? "");
				return text.length > 0 ? text : this.ports.titleOf(id);
			}
			/** Raise the question/permission kind on a pending-interaction arrival. */
			raise(kind, id, detail) {
				this.ports.emit({
					kind: kind === "approval" ? "permission" : "question",
					sessionId: id,
					title: this.ports.titleOf(id),
					detail
				});
			}
		};
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
		function sessionDetailOf(session, chat) {
			let maxTurnErrorSeq = 0;
			let failureMessage = null;
			let finalText = "";
			let lastUserText = "";
			let latestUserSeq = 0;
			if (chat !== void 0) {
				for (const node of chat.nodes.values()) if (node.kind === "turn-error") {
					const data = node.data;
					if (data.seq > maxTurnErrorSeq) {
						maxTurnErrorSeq = data.seq;
						failureMessage = data.message;
					}
				} else if (node.kind === "assistant-step") {
					const text = node.data.blocks.filter((block) => block.kind === "text").map((block) => block.text).join("");
					if (text.length > 0) finalText = text;
				} else if (node.kind === "user") {
					const data = node.data;
					if (typeof data.seq === "number" && data.seq > latestUserSeq) latestUserSeq = data.seq;
					if (data.source?.kind === "user") lastUserText = data.content.filter((block) => block.type === "text" && block.text !== void 0).map((block) => block.text).join("");
				}
			}
			return {
				maxTurnErrorSeq,
				failureMessage,
				lastAgentError: session.lastAgentError,
				finalText,
				lastUserText,
				latestUserSeq
			};
		}
		/** Cap the notification subject (a user message can be a whole paragraph). */
		function truncateTitle(text, max = 60) {
			const collapsed = text.replace(/\s+/g, " ").trim();
			if (collapsed.length <= max) return collapsed;
			return `${collapsed.slice(0, max - 1)}…`;
		}
		/** Cap the detail text shown in a notification. */
		function truncateDetail(text, max = 160) {
			if (text.length <= max) return text;
			return `${text.slice(0, max - 1)}…`;
		}
		/**
		* Applies the durable preferences to one classified event. The session you
		* are reading stays quiet by default; `currentNotificationMode` widens that
		* (`unfocused` also alerts once another application is in front, `always`
		* alerts regardless). Every other session alerts whenever you are away from
		* it: the kind's effective sound plays when sound is enabled, and a system
		* notification shows when browser notifications are enabled.
		*/
		var NotificationDispatcher = class {
			deps;
			/** @param deps - injected readers and sinks. */
			constructor(deps) {
				this.deps = deps;
			}
			/**
			* Dispatch one event.
			* @param event - the classified event.
			*/
			dispatch(event) {
				const settings = this.deps.settings();
				const type = settings.types[event.kind];
				if (!type.enabled) return;
				const isCurrent = this.deps.isCurrent(event.sessionId);
				const mode = settings.currentNotificationMode;
				const away = this.deps.isHidden() || mode === "unfocused" && this.deps.hasFocus?.() === false;
				if (isCurrent && !away && mode !== "always") return;
				const title = this.deps.t(`notify.${event.kind}.title`);
				const template = this.deps.t(`notify.${event.kind}.body`);
				const detail = truncateDetail(event.detail);
				const base = template.replaceAll("{title}", event.title);
				const body = event.kind === "completed" ? detail.length > 0 ? `${base}\n${detail}` : base : base.replaceAll("{detail}", detail);
				if (settings.soundEnabled) {
					if (type.sound === "custom") {
						const customUrl = this.deps.customSoundOf(event.kind);
						if (customUrl !== void 0) this.deps.playSound("custom", customUrl);
					} else if (type.sound !== "none") this.deps.playSound(type.sound);
				}
				if (!settings.browserEnabled) return;
				this.deps.showBrowser(title, body, `${NOTIFICATION_TAG_PREFIX}:${event.kind}`, event.sessionId);
			}
		};
		// src/client/settings-store.ts
		/**
		* Notifications settings section store: a mirror of the plugin's
		* browser-local preferences scope, plus the write actions the section's
		* inject face exposes. The slot renderer owns the store instance and hands
		* its bound actions to the inject factory (the ui-theme row pattern); the
		* apply world syncs accepted scope snapshots through those actions. Component
		* reads go through `useStore`.
		*/
		/**
		* Declares the Notifications section state and write surface.
		* @returns the store handle.
		*/
		function createNotificationsStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					status: "loading",
					writable: false,
					settings: DEFAULT_NOTIFICATION_SETTINGS,
					permission: browserPermission(),
					customSounds: readCustomSounds()
				}),
				actions: {
					adopt: (draft, snapshot) => {
						draft.status = snapshot.status;
						draft.writable = snapshot.writable;
						if (snapshot.status === "ready" && snapshot.value !== void 0) draft.settings = snapshot.value;
					},
					setBrowserEnabled: (draft, enabled) => {
						draft.settings = {
							...draft.settings,
							browserEnabled: enabled
						};
					},
					setCurrentNotificationMode: (draft, mode) => {
						draft.settings = {
							...draft.settings,
							currentNotificationMode: mode
						};
					},
					setNotificationMode: (draft, mode) => {
						draft.settings = {
							...draft.settings,
							notificationMode: mode
						};
					},
					setSoundEnabled: (draft, enabled) => {
						draft.settings = {
							...draft.settings,
							soundEnabled: enabled
						};
					},
					setVolume: (draft, volume) => {
						draft.settings = {
							...draft.settings,
							volume
						};
					},
					setType: (draft, kind, patch) => {
						draft.settings = {
							...draft.settings,
							types: {
								...draft.settings.types,
								[kind]: {
									...draft.settings.types[kind],
									...patch
								}
							}
						};
					},
					setPermission: (draft, permission) => {
						draft.permission = permission;
					},
					setCustomSound: (draft, kind, dataUrl) => {
						draft.customSounds = withCustomSound(draft.customSounds, kind, dataUrl);
					}
				}
			});
		}
		// \0dsh-css:/Users/songer/Projects/dsh-session-notification/src/client/NotificationsSection.module.css.mjs
		const css = ".DzMkMG_section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.DzMkMG_title{color:var(--dsw-alias-label-primary);margin:0;font-size:18px;font-weight:600;line-height:28px}.DzMkMG_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}.DzMkMG_rows{flex-direction:column;margin:8px 0 0;padding:0;list-style:none;display:flex}.DzMkMG_row{border-bottom:1px solid var(--dsw-alias-border-l2);flex-wrap:wrap;align-items:center;gap:8px;padding:16px 0;display:flex}.DzMkMG_row:last-child{border-bottom:none}.DzMkMG_rowIcon{color:var(--dsw-alias-label-tertiary);flex:none}.DzMkMG_rowText{flex-direction:column;flex:180px;gap:4px;min-width:0;display:flex}.DzMkMG_rowTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.DzMkMG_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.DzMkMG_rowActions{align-items:center;gap:6px;margin-left:auto;display:inline-flex}.DzMkMG_permissionState{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.DzMkMG_selector:focus-visible,.DzMkMG_slider:focus-visible,.DzMkMG_switch:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3);outline:none}.DzMkMG_selector{background:var(--dsw-alias-bg-module-platform);height:28px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:14px;align-items:center;gap:8px;padding:0 10px;font-size:12px;line-height:18px;display:inline-flex}.DzMkMG_selector:hover{background:var(--dsw-alias-interactive-bg-hover)}.DzMkMG_chevron{flex:none}.DzMkMG_switch{cursor:pointer;background:0 0;border:0;border-radius:0;flex:none;justify-content:center;align-items:center;width:32px;height:20px;padding:0;display:inline-flex}.DzMkMG_switchTrack{background:var(--dsw-alias-border-l2);width:28px;height:16px;transition:background-color .12s var(--ds-ease-in-out);border-radius:8px;flex:none;display:inline-block;position:relative}.DzMkMG_switchThumb{background:var(--dsw-alias-bg-layer-1);width:12px;height:12px;transition:transform .12s var(--ds-ease-in-out);border-radius:50%;position:absolute;top:2px;left:2px}.DzMkMG_switchTrack[data-on=true]{background:var(--dsw-alias-state-business-primary)}.DzMkMG_switchTrack[data-on=true] .DzMkMG_switchThumb{transform:translate(12px)}.DzMkMG_volumeControl{align-items:center;gap:8px;display:inline-flex}.DzMkMG_slider{cursor:pointer;touch-action:none;width:140px;height:20px;position:relative}.DzMkMG_sliderRail{background:var(--dsw-alias-border-l2);border-radius:2px;height:4px;position:absolute;top:50%;left:0;right:0;transform:translateY(-50%)}.DzMkMG_sliderFill{background:var(--dsw-alias-state-business-primary);border-radius:2px;height:4px;position:absolute;top:50%;left:0;transform:translateY(-50%)}.DzMkMG_sliderThumb{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:50%;width:14px;height:14px;position:absolute;top:50%;transform:translate(-50%,-50%)}.DzMkMG_volumeValue{min-width:36px;color:var(--dsw-alias-label-tertiary);text-align:right;font-size:12px;line-height:18px}.DzMkMG_fileInput{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}@media (prefers-reduced-motion:reduce){.DzMkMG_switchTrack{transition:none}}";
		const tagId = "@dingyi222666/dsh-session-notification/NotificationsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dingyi222666/dsh-session-notification";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var NotificationsSection_module_css_default = {
			"volumeValue": "DzMkMG_volumeValue",
			"switch": "DzMkMG_switch",
			"rowActions": "DzMkMG_rowActions",
			"rowIcon": "DzMkMG_rowIcon",
			"slider": "DzMkMG_slider",
			"sliderFill": "DzMkMG_sliderFill",
			"intro": "DzMkMG_intro",
			"rowText": "DzMkMG_rowText",
			"rows": "DzMkMG_rows",
			"rowTitle": "DzMkMG_rowTitle",
			"row": "DzMkMG_row",
			"chevron": "DzMkMG_chevron",
			"switchTrack": "DzMkMG_switchTrack",
			"permissionState": "DzMkMG_permissionState",
			"section": "DzMkMG_section",
			"switchThumb": "DzMkMG_switchThumb",
			"volumeControl": "DzMkMG_volumeControl",
			"fileInput": "DzMkMG_fileInput",
			"desc": "DzMkMG_desc",
			"sliderRail": "DzMkMG_sliderRail",
			"sliderThumb": "DzMkMG_sliderThumb",
			"title": "DzMkMG_title",
			"selector": "DzMkMG_selector"
		};
		// src/client/NotificationsSection.tsx
		/**
		* Notifications settings section: the `settings.section` entry owned by the
		* notification plugin, in the settings-panel design language (models-page
		* vocabulary: 16/24 section title, 14/22 row names, 12/18 captions, capsule
		* controls). Master rows (browser notifications, sound, volume) plus one flat
		* hairline row per notification kind — each with an enable switch, the
		* kind's sound picker (the official Menu), a custom-audio upload, and a
		* preview button. All copy rides the standard locale seat; reads go through
		* `useStore`, business writes through the injected controller callbacks.
		*/
		/** Kind row metadata: icon, copy keys. */
		const KIND_ROWS = [
			{
				kind: "completed",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular,
				title: "type.completed.title",
				desc: "type.completed.desc"
			},
			{
				kind: "failed",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular,
				size: 14,
				title: "type.failed.title",
				desc: "type.failed.desc"
			},
			{
				kind: "question",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconQuestionOutlineRegular,
				title: "type.question.title",
				desc: "type.question.desc"
			},
			{
				kind: "permission",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutlineRegular,
				title: "type.permission.title",
				desc: "type.permission.desc"
			}
		];
		/** Sound menu entries: the four effects, Custom, then None. */
		const SOUND_OPTIONS = [
			...SOUND_IDS,
			"custom",
			"none"
		];
		/** Copy key for each sound id (type-safe dynamic lookup for the Menu). */
		const SOUND_KEY = {
			chime: "sound.chime",
			fault: "sound.fault",
			pop: "sound.pop",
			alert: "sound.alert",
			none: "sound.none",
			custom: "sound.custom"
		};
		/** Official switch: role=switch button with a track + thumb. */
		function Switch({ on, label, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: NotificationsSection_module_css_default.switch,
				role: "switch",
				"aria-checked": on,
				"aria-label": label,
				onClick: () => {
					onChange(!on);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: NotificationsSection_module_css_default.switchTrack,
					"data-on": on || void 0,
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: NotificationsSection_module_css_default.switchThumb })
				})
			});
		}
		/**
		* Official-style volume slider (no native range input): a track with a
		* filled portion and a draggable thumb, driven by pointer and keyboard.
		* The range is 0–100%; the sound chain's fixed loudness boost (see
		* sounds.ts) makes 100% noticeably louder than before.
		*/
		function VolumeSlider({ value, label, onChange }) {
			const trackRef = (0, react.useRef)(null);
			const [dragging, setDragging] = (0, react.useState)(false);
			const valueFromClientX = (clientX) => {
				const rect = trackRef.current?.getBoundingClientRect();
				if (rect === void 0 || rect.width === 0) return value;
				const ratio = (clientX - rect.left) / rect.width;
				return Math.min(1, Math.max(0, ratio));
			};
			const commit = (clientX) => {
				onChange(Math.round(valueFromClientX(clientX) * 20) / 20);
			};
			const onPointerDown = (event) => {
				setDragging(true);
				event.currentTarget.setPointerCapture(event.pointerId);
				commit(event.clientX);
			};
			const onPointerMove = (event) => {
				if (dragging) commit(event.clientX);
			};
			const onKeyDown = (event) => {
				const step = .05;
				if (event.key === "ArrowRight" || event.key === "ArrowUp") {
					event.preventDefault();
					onChange(Math.min(1, value + step));
				} else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
					event.preventDefault();
					onChange(Math.max(0, value - step));
				} else if (event.key === "Home") {
					event.preventDefault();
					onChange(0);
				} else if (event.key === "End") {
					event.preventDefault();
					onChange(1);
				}
			};
			const percent = Math.round(value * 100);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: NotificationsSection_module_css_default.volumeControl,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: trackRef,
					className: NotificationsSection_module_css_default.slider,
					role: "slider",
					"aria-label": label,
					"aria-valuemin": 0,
					"aria-valuemax": 100,
					"aria-valuenow": percent,
					tabIndex: 0,
					onPointerDown,
					onPointerMove,
					onPointerUp: () => {
						setDragging(false);
					},
					onPointerCancel: () => {
						setDragging(false);
					},
					onKeyDown,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: NotificationsSection_module_css_default.sliderRail,
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: NotificationsSection_module_css_default.sliderFill,
							style: { width: `${percent}%` },
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: NotificationsSection_module_css_default.sliderThumb,
							style: { left: `${percent}%` },
							"aria-hidden": "true"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: NotificationsSection_module_css_default.volumeValue,
					children: [percent, "%"]
				})]
			});
		}
		/**
		* Render the Notifications settings section.
		* @param props - composed slot props.
		*/
		function NotificationsSection({ t, useStore, setBrowserEnabled, setCurrentNotificationMode, setNotificationMode, setSoundEnabled, setVolume, setType, testSound, requestPermission, testBrowserNotification, uploadCustomSound }) {
			const { settings, permission, customSounds } = useStore((state) => state);
			const deniedLabel = permission === "denied" ? t("permission.denied") : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: NotificationsSection_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: NotificationsSection_module_css_default.title,
						children: t("section.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: NotificationsSection_module_css_default.intro,
						children: t("section.intro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: NotificationsSection_module_css_default.rows,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: NotificationsSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: NotificationsSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.rowTitle,
										children: t("browser.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.desc,
										children: t("browser.desc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: NotificationsSection_module_css_default.rowActions,
									children: [
										permission === "granted" && settings.browserEnabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											onClick: testBrowserNotification,
											children: t("test.send")
										}),
										deniedLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: NotificationsSection_module_css_default.permissionState,
											children: deniedLabel
										}),
										permission === "unsupported" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: NotificationsSection_module_css_default.permissionState,
											children: t("permission.unsupported")
										}),
										permission === "default" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											onClick: () => {
												requestPermission();
											},
											children: t("permission.request")
										}),
										settings.browserEnabled && permission !== "granted" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: NotificationsSection_module_css_default.permissionState,
											children: t("permission.paused")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
											on: settings.browserEnabled,
											label: t("browser.title"),
											onChange: (next) => {
												setBrowserEnabled(next);
											}
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: NotificationsSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: NotificationsSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.rowTitle,
										children: t("current.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.desc,
										children: t("current.desc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: NotificationsSection_module_css_default.rowActions,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
										t,
										label: t("current.title"),
										value: settings.currentNotificationMode,
										options: CURRENT_NOTIFICATION_MODES,
										labels: CURRENT_MODE_KEY,
										onSelect: setCurrentNotificationMode
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: NotificationsSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: NotificationsSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.rowTitle,
										children: t("mode.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.desc,
										children: t("mode.desc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: NotificationsSection_module_css_default.rowActions,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
										t,
										label: t("mode.title"),
										value: settings.notificationMode,
										options: NOTIFICATION_MODES,
										labels: MODE_KEY,
										onSelect: setNotificationMode
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: NotificationsSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: NotificationsSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.rowTitle,
										children: t("sound.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.desc,
										children: t("sound.desc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: NotificationsSection_module_css_default.rowActions,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
										on: settings.soundEnabled,
										label: t("sound.title"),
										onChange: setSoundEnabled
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: NotificationsSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: NotificationsSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.rowTitle,
										children: t("volume.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: NotificationsSection_module_css_default.desc,
										children: t("volume.desc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: NotificationsSection_module_css_default.rowActions,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VolumeSlider, {
										value: settings.volume,
										label: t("volume.title"),
										onChange: setVolume
									})
								})]
							}),
							KIND_ROWS.map(({ kind, Icon, size, title, desc }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypeRow, {
								kind,
								Icon,
								iconSize: size,
								title: t(title),
								desc: t(desc),
								type: settings.types[kind],
								customUrl: customSounds[kind],
								t,
								onTypeChange: (patch) => {
									setType(kind, patch);
								},
								onTest: () => {
									const customUrl = customSounds[kind];
									if (settings.types[kind].sound === "custom" && customUrl !== void 0 && customUrl.length > 0) testSound("custom", customUrl);
									else if (settings.types[kind].sound !== "none") testSound(settings.types[kind].sound);
								},
								onUpload: (file) => {
									uploadCustomSound(kind, file);
								}
							}, kind))
						]
					})
				]
			});
		}
		/** One notification-kind row: icon, copy, preview, picker (Custom included), switch. */
		function TypeRow({ kind, Icon, iconSize, title, desc, type, customUrl, t, onTypeChange, onTest, onUpload }) {
			const fileRef = (0, react.useRef)(null);
			const hasCustom = customUrl !== void 0 && customUrl.length > 0;
			const customSelected = type.sound === "custom";
			const audible = customSelected && hasCustom || type.sound !== "none" && type.sound !== "custom";
			/** Selecting 自定义 with no file yet opens the picker; with a file it just
			*  selects. The uploaded file's handler persists the selection afterwards. */
			const handleSoundSelect = (sound) => {
				if (sound === "custom" && !hasCustom) {
					fileRef.current?.click();
					return;
				}
				onTypeChange({ sound });
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: NotificationsSection_module_css_default.row,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
						className: NotificationsSection_module_css_default.rowIcon,
						size: iconSize,
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: NotificationsSection_module_css_default.rowText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: NotificationsSection_module_css_default.rowTitle,
							children: title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: NotificationsSection_module_css_default.desc,
							children: desc
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: NotificationsSection_module_css_default.rowActions,
						children: [
							customSelected && hasCustom && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: () => {
									fileRef.current?.click();
								},
								children: t("custom.replace")
							}),
							audible && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: onTest,
								children: t("test.play")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SoundMenu, {
								value: type.sound,
								t,
								onSelect: handleSoundSelect
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
								on: type.enabled,
								label: title,
								onChange: (next) => {
									onTypeChange({ enabled: next });
								}
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						ref: fileRef,
						className: NotificationsSection_module_css_default.fileInput,
						type: "file",
						accept: "audio/*",
						"aria-label": t("sound.custom"),
						onChange: (event) => {
							const file = event.currentTarget.files?.[0];
							if (file !== void 0) onUpload(file);
							event.currentTarget.value = "";
						}
					})
				]
			});
		}
		/** Current-session alert-scope label per mode. */
		const CURRENT_MODE_KEY = {
			hidden: "current.mode.hidden",
			unfocused: "current.mode.unfocused",
			always: "current.mode.always"
		};
		/** Notification-scope label per mode. */
		const MODE_KEY = {
			all: "mode.all",
			main: "mode.main",
			"main-wait": "mode.wait"
		};
		/** One keyed dropdown selector over the official Menu (both scope pickers). */
		function SelectMenu({ t, label, value, options, labels, onSelect }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					setOpen(false);
				},
				items: options.map((option) => ({
					id: option,
					label: t(labels[option])
				})),
				selectedId: value,
				onSelect: (id) => {
					setOpen(false);
					onSelect(id);
				},
				align: "end",
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: NotificationsSection_module_css_default.selector,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					"aria-label": label,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [t(labels[value]), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { className: NotificationsSection_module_css_default.chevron })]
				})
			});
		}
		/** One kind's sound picker (the official Menu). */
		function SoundMenu({ value, onSelect, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					setOpen(false);
				},
				items: SOUND_OPTIONS.map((sound) => ({
					id: sound,
					label: t(SOUND_KEY[sound])
				})),
				selectedId: value,
				onSelect: (id) => {
					setOpen(false);
					onSelect(id);
				},
				align: "end",
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: NotificationsSection_module_css_default.selector,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					"aria-label": t("sound.title"),
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [t(SOUND_KEY[value]), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { className: NotificationsSection_module_css_default.chevron })]
				})
			});
		}
		// src/client/locales.ts
		/**
		* Notification plugin copy. Chinese is the source of truth; English mirrors
		* it key-for-key (the locale gate refuses an asymmetric pair).
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"nav": "通知",
			"section.title": "通知",
			"section.intro": "配置会话状态的通知与提示音。",
			"browser.title": "浏览器通知",
			"browser.desc": "离开当前标签页时，在系统里弹通知；首次开启需要授权。",
			"current.title": "当前会话提醒时机",
			"current.desc": "决定正在阅读的会话何时提醒（非当前会话始终正常提醒）。",
			"current.mode.hidden": "仅后台或最小化",
			"current.mode.unfocused": "切到其他应用时",
			"current.mode.always": "始终提醒",
			"mode.title": "通知范围",
			"mode.desc": "选哪些会话提醒；「主会话 + 等子会话」会等它们全部结束再响。",
			"mode.all": "全部会话",
			"mode.main": "只主会话",
			"mode.wait": "主会话 + 等子会话",
			"sound.title": "提示音",
			"sound.desc": "有通知时播放声音。",
			"volume.title": "音量",
			"volume.desc": "提示音整体音量。",
			"type.completed.title": "会话完成",
			"type.completed.desc": "一轮会话正常结束时提醒。",
			"type.failed.title": "会话失败",
			"type.failed.desc": "一轮会话出错中断时提醒。",
			"type.question.title": "问问题",
			"type.question.desc": "Agent 正在向你提问、等待回答时提醒。",
			"type.permission.title": "权限请求",
			"type.permission.desc": "Agent 请求执行需要授权的操作时提醒。",
			"sound.none": "无",
			"sound.chime": "叮咚",
			"sound.fault": "低鸣",
			"sound.pop": "轻响",
			"sound.alert": "警示",
			"sound.custom": "自定义",
			"test.play": "试听",
			"permission.granted": "已授权",
			"permission.denied": "已拒绝",
			"permission.unsupported": "当前环境不支持浏览器通知",
			"permission.paused": "通知已暂停：缺少浏览器权限",
			"permission.request": "授权",
			"test.send": "测试通知",
			"test.notification.title": "通知测试",
			"test.notification.body": "浏览器通知通道工作正常。",
			"custom.replace": "更换",
			"notify.completed.title": "会话完成",
			"notify.completed.body": "「{title}」已完成",
			"notify.failed.title": "会话失败",
			"notify.failed.body": "「{title}」运行失败：{detail}",
			"notify.question.title": "等待回答",
			"notify.question.body": "「{title}」向你提问：{detail}",
			"notify.permission.title": "权限请求",
			"notify.permission.body": "「{title}」请求权限：{detail}"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"nav": "Notifications",
			"section.title": "Notifications",
			"section.intro": "Configure notifications and sounds for session states.",
			"browser.title": "Browser notifications",
			"browser.desc": "Show a system notification when you leave the tab; enabling this asks for permission first.",
			"current.title": "Current session alerts",
			"current.desc": "Choose when the session you are reading alerts; other sessions always alert.",
			"current.mode.hidden": "Hidden or minimized only",
			"current.mode.unfocused": "When switched away",
			"current.mode.always": "Always",
			"mode.title": "Notify for",
			"mode.desc": "Which sessions alert; the subagent option waits until they all finish.",
			"mode.all": "All sessions",
			"mode.main": "Main only",
			"mode.wait": "Main, after subagents",
			"sound.title": "Sound",
			"sound.desc": "Play a sound when a notification fires.",
			"volume.title": "Volume",
			"volume.desc": "Master volume for notification sounds.",
			"type.completed.title": "Session completed",
			"type.completed.desc": "Alert when a turn finishes normally.",
			"type.failed.title": "Session failed",
			"type.failed.desc": "Alert when a turn breaks with an error.",
			"type.question.title": "Question asked",
			"type.question.desc": "Alert when the agent is asking you a question.",
			"type.permission.title": "Permission requested",
			"type.permission.desc": "Alert when the agent requests an authorized operation.",
			"sound.none": "None",
			"sound.chime": "Chime",
			"sound.fault": "Fault",
			"sound.pop": "Pop",
			"sound.alert": "Alert",
			"sound.custom": "Custom",
			"test.play": "Preview",
			"permission.granted": "Granted",
			"permission.denied": "Denied",
			"permission.unsupported": "Browser notifications are not supported here",
			"permission.paused": "Notifications paused: browser permission missing",
			"permission.request": "Enable",
			"test.send": "Test notification",
			"test.notification.title": "Notification test",
			"test.notification.body": "The browser notification channel works.",
			"custom.replace": "Replace",
			"notify.completed.title": "Session completed",
			"notify.completed.body": "“{title}” has completed",
			"notify.failed.title": "Session failed",
			"notify.failed.body": "“{title}” failed: {detail}",
			"notify.question.title": "Answer needed",
			"notify.question.body": "“{title}” asks you: {detail}",
			"notify.permission.title": "Permission requested",
			"notify.permission.body": "“{title}” requests permission: {detail}"
		};
		// src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "notifications";
		/** How long a finished run waits for trailing wire frames before classification. */
		const SETTLE_MS = 250;
		/** Required services: the slot registry, dictionaries, the session list, the
		*  alpha chat view (uiConversation), and the pending-interaction map
		*  (uiSession). */
		const inject = [
			"slots",
			"locale",
			"sessions",
			"uiConversation",
			"uiSession",
			"uiWorkspace"
		];
		/**
		* Client plugin body: bind the browser-local preferences scope, register the
		* Notifications section, and watch the sessions list for notification events.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-session-notification: dictionaries");
			const scope = createLocalSettingsScope();
			const store = createNotificationsStore();
			let bound;
			const currentSettings = () => {
				const snapshot = scope.getSnapshot();
				return snapshot.status === "ready" && snapshot.value !== void 0 ? snapshot.value : DEFAULT_NOTIFICATION_SETTINGS;
			};
			ctx.effect(() => scope.subscribe(() => {
				bound?.adopt(scope.getSnapshot());
			}), "dsh-session-notification: scope adoption");
			const player = new SoundPlayer(() => currentSettings().volume);
			ctx.effect(() => () => player.dispose(), "dsh-session-notification: sound player");
			const coordinator = createTabCoordinator();
			ctx.effect(() => () => coordinator.dispose(), "dsh-session-notification: tab coordinator");
			const t = ctx.locale.bind(NS);
			const translate = (key) => t(key);
			/** Play the effective sound: a custom audio when one is supplied, else the built-in. */
			const playEffective = (sound, customUrl) => {
				if (sound === "custom" && customUrl !== void 0) player.playCustom(customUrl);
				else player.play(sound);
			};
			const dispatcher = new NotificationDispatcher({
				settings: currentSettings,
				t: translate,
				playSound: (sound, customUrl) => {
					playEffective(sound, customUrl);
				},
				customSoundOf: (kind) => readCustomSound(kind),
				showBrowser: (title, body, tag, sessionId) => showBrowserNotification(title, body, tag, () => {
					try {
						ctx.uiWorkspace.openSession(sessionId);
					} catch (error) {
						console.warn("[dsh-session-notification] could not open the notification session", sessionId, error);
					}
				}),
				isCurrent: (id) => (ctx.sessions.retainInfo(id).getSnapshot().retainedBy.mainView ?? 0) > 0,
				isHidden: () => typeof document === "undefined" ? false : document.visibilityState === "hidden",
				hasFocus: () => typeof document === "undefined" || document.hasFocus()
			});
			const readBindingDetail = (binding) => {
				try {
					const conversation = ctx.uiConversation.binding(binding);
					conversation.activate("chat");
					const chat = conversation.target("chat").getSnapshot();
					return sessionDetailOf(binding.session.getSnapshot(), chat);
				} catch {
					return;
				}
			};
			const engine = new NotificationEngine({
				detailOf: (id) => {
					const binding = ctx.sessions.binding(id);
					if (binding === void 0) return void 0;
					return readBindingDetail(binding);
				},
				ensureDetail: async (id) => {
					const settings = currentSettings();
					if (!settings.browserEnabled && !settings.soundEnabled) return void 0;
					if (!Object.values(settings.types).some((type) => type.enabled)) return void 0;
					const existing = ctx.sessions.binding(id);
					if (existing !== void 0 && (ctx.sessions.retainInfo(id).getSnapshot().retainedFacets?.conversation ?? 0) > 0) return readBindingDetail(existing);
					try {
						return await ctx.sessions.using(id, {
							source: "sessionNotification",
							facets: { conversation: true }
						}, (reference) => readBindingDetail(reference.binding));
					} catch (error) {
						console.warn("[dsh-session-notification] could not load the notification session", id, error);
						return;
					}
				},
				titleOf: (id) => ctx.sessions.list.getSnapshot().byId[id]?.displayTitle ?? id,
				hasUnfinishedWork: (id) => {
					const values = ctx.sessions.list.getSnapshot().projectionsBySession[id]?.values;
					const inbox = values?.inbox;
					if ((inbox?.["next-turn"]?.length ?? 0) > 0 || (inbox?.["next-step"]?.length ?? 0) > 0) return true;
					const goal = values?.goal;
					return goal?.goal.phase === "active" && goal.roundsStarted < goal.goal.maxGoalRounds;
				},
				settle: () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS)),
				isSubagent: (id) => ctx.sessions.list.getSnapshot().byId[id]?.origin === "subagent",
				hasRunningDescendants: (id) => {
					const byId = ctx.sessions.list.getSnapshot().byId;
					const seen = /* @__PURE__ */ new Set([id]);
					const queue = [id];
					while (queue.length > 0) {
						const parent = queue.shift();
						for (const summary of Object.values(byId)) {
							if (summary.parentId !== parent || seen.has(summary.id)) continue;
							seen.add(summary.id);
							if (summary.running) return true;
							queue.push(summary.id);
						}
					}
					return false;
				},
				emit: (event) => {
					coordinator.claim(`${event.sessionId}:${event.kind}`).then((owned) => {
						if (owned) dispatcher.dispatch(event);
					});
				}
			});
			engine.setNotificationMode(currentSettings().notificationMode);
			ctx.effect(() => scope.subscribe(() => {
				engine.setNotificationMode(currentSettings().notificationMode);
			}), "dsh-session-notification: mode sync");
			ctx.effect(() => {
				const unsubscribe = ctx.sessions.list.subscribe(() => engine.observe(ctx.sessions.list.getSnapshot()));
				engine.seed(ctx.sessions.list.getSnapshot());
				return unsubscribe;
			}, "dsh-session-notification: session watch");
			const pendingFactsOf = (pending) => {
				const out = /* @__PURE__ */ new Map();
				for (const [id, interaction] of pending) {
					const kind = interaction.kind === "approval" ? "approval" : interaction.kind === "question" || interaction.kind === "plan-review" ? "question" : void 0;
					if (kind === void 0) continue;
					const questions = interaction.questions;
					const tool = interaction.toolName;
					const detail = questions?.[0]?.question ?? tool ?? "";
					out.set(id, {
						key: interaction.key,
						kind,
						detail
					});
				}
				return out;
			};
			ctx.effect(() => {
				const unsubscribe = ctx.uiSession.pendingInteractions.subscribe(() => {
					engine.observePending(pendingFactsOf(ctx.uiSession.pendingInteractions.getSnapshot()));
				});
				engine.seedPending(pendingFactsOf(ctx.uiSession.pendingInteractions.getSnapshot()));
				return unsubscribe;
			}, "dsh-session-notification: pending watch");
			/** Persist one top-level preference through the scope, mirroring optimistically. */
			const persist = (field, value) => {
				if (field === "browserEnabled") bound?.setBrowserEnabled(value);
				else if (field === "currentNotificationMode") bound?.setCurrentNotificationMode(value);
				else if (field === "notificationMode") bound?.setNotificationMode(value);
				else if (field === "soundEnabled") bound?.setSoundEnabled(value);
				else bound?.setVolume(value);
				scope.set(field, value);
			};
			/** Persist one per-kind preference (the whole `types` section is one field). */
			const persistType = (kind, patch) => {
				const next = {
					...currentSettings().types[kind],
					...patch
				};
				bound?.setType(kind, patch);
				scope.set("types", {
					...currentSettings().types,
					[kind]: next
				});
			};
			const injected = (actions) => {
				bound = actions;
				bound.adopt(scope.getSnapshot());
				return {
					setBrowserEnabled: async (enabled) => {
						if (enabled) {
							let permission = browserPermission();
							if (permission === "default") {
								permission = await requestBrowserPermission();
								bound?.setPermission(permission);
							}
							if (permission !== "granted") return;
						}
						persist("browserEnabled", enabled);
					},
					setCurrentNotificationMode: (mode) => {
						persist("currentNotificationMode", mode);
					},
					setNotificationMode: (mode) => {
						persist("notificationMode", mode);
					},
					setSoundEnabled: (enabled) => {
						persist("soundEnabled", enabled);
					},
					setVolume: (volume) => {
						persist("volume", Math.min(1, Math.max(0, volume)));
					},
					setType: (kind, patch) => {
						persistType(kind, patch);
					},
					testSound: (sound, customUrl) => {
						playEffective(sound, customUrl);
					},
					requestPermission: async () => {
						bound?.setPermission(await requestBrowserPermission());
					},
					testBrowserNotification: () => {
						showBrowserNotification(t("test.notification.title"), t("test.notification.body"), `${NOTIFICATION_TAG_PREFIX}:test`);
					},
					uploadCustomSound: async (kind, file) => {
						if (file.size > 1048576) return;
						const dataUrl = await readFileAsDataUrl(file);
						writeCustomSound(kind, dataUrl);
						bound?.setCustomSound(kind, dataUrl);
						persistType(kind, { sound: "custom" });
					}
				};
			};
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "notifications",
				order: 40,
				label: () => t("nav"),
				store,
				locale: NS,
				inject: injected
			}, NotificationsSection));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map