/**
 * Browser-local storage for per-kind custom notification sounds. Audio files
 * are device-local media assets, so they live in localStorage (as data URLs)
 * rather than the shared user-settings document — this also keeps the schema
 * and Host half untouched. Reads are guarded so non-browser runs degrade to
 * "no custom sound".
 */
import type { NotificationType } from '../settings.ts';
/** Per-kind custom sound data URLs (empty string = none). */
export type CustomSounds = Partial<Record<NotificationType, string>>;
/** Upper bound for one custom audio file (base64 payload after encoding). */
export declare const MAX_CUSTOM_AUDIO_BYTES = 1048576;
/** Read the whole custom-sound map from localStorage. */
export declare function readCustomSounds(): CustomSounds;
/** Read one kind's custom sound data URL (undefined = none). */
export declare function readCustomSound(kind: NotificationType): string | undefined;
/** Persist one kind's custom sound (null removes it). */
export declare function writeCustomSound(kind: NotificationType, dataUrl: string | null): void;
/** The sound map with one entry replaced (pure helper for store mirrors). */
export declare function withCustomSound(current: CustomSounds, kind: NotificationType, dataUrl: string | null): CustomSounds;
/** Read a picked audio file as a data URL (the stored custom-sound form). */
export declare function readFileAsDataUrl(file: File): Promise<string>;
