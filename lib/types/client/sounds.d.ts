/**
 * Built-in sound effects, synthesized with Web Audio so the bundle ships no
 * audio assets. Each notification kind defaults to one pattern and can be
 * reassigned to any other (or muted) in the settings section.
 */
import { SOUND_IDS } from '../settings.ts';
import type { SoundId } from '../settings.ts';
/** One oscillator note inside a sound pattern. */
export interface SoundNote {
    /** Seconds from the pattern start before the note begins. */
    at: number;
    /** Oscillator frequency in Hz. */
    frequency: number;
    /** Note duration in seconds. */
    duration: number;
    /** Oscillator waveform. */
    type: OscillatorType;
    /** Peak gain relative to the master volume. */
    gain: number;
}
/** A synthesized sound effect: an ordered set of notes. */
export interface SoundPattern {
    notes: readonly SoundNote[];
}
/** The four selectable sound effects (the "default four sounds"). */
export declare const SOUND_PATTERNS: Record<typeof SOUND_IDS[number], SoundPattern>;
/** Total duration of a pattern in seconds (for scheduling tests). */
export declare function patternDuration(pattern: SoundPattern): number;
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
export declare class SoundPlayer {
    private readonly volume;
    private context;
    private master;
    /** Pending idle-suspend timer; every new playback clears it. */
    private idleTimer;
    /** Current custom-audio element and its per-play source node. */
    private customAudio;
    private customSource;
    /**
     * @param volume - reads the current master volume in [0, 1] at play time.
     */
    constructor(volume: () => number);
    /**
     * Play one built-in sound effect.
     * @param sound - the sound id; `none` and `custom` (which plays through
     * {@link playCustom}) play nothing here.
     */
    play(sound: SoundId): void;
    /** Create (or resume) the shared context; undefined outside browsers. */
    private ensureContext;
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
    playCustom(dataUrl: string): void;
    /**
     * Release every audio resource this player owns: the pending idle timer, the
     * live custom source, and the shared context. Called when the plugin unloads
     * so an unloaded page never keeps a system output stream (or its power
     * assertion) alive.
     */
    dispose(): void;
    /** Disconnect and forget the live custom-audio source, if any. */
    private releaseCustomSource;
    /** Schedule the idle suspend, replacing any pending one. */
    private scheduleIdleSuspend;
    /** Cancel a pending idle suspend. */
    private clearIdleSuspend;
}
/** Clamp a volume candidate to [0, 1] (0–100%); the loudness boost is applied
 *  separately on the Web Audio chain, so the slider never needs to exceed 1. */
export declare function clampVolume(volume: number): number;
