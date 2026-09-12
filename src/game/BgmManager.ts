import { Scene } from "phaser";

// Phaser's sound manager is shared globally across all scenes (Scene.sound
// is just a reference to game.sound), so module-level singletons here keep
// the music playing continuously as the player navigates between scenes
// instead of restarting it every time a scene is (re)created.
const BGM_KEY = "bgm.main";
const QUIZ_BGM_KEY = "bgm.quizThinking";
const TARGET_VOLUME = 0.5;
const FADE_DURATION = 500;

let sound: Phaser.Sound.BaseSound | null = null;
let quizSound: Phaser.Sound.BaseSound | null = null;
let enabled = true;

/** Starts the looping BGM (fading in) if it isn't already playing. Safe to
 * call every time a scene starts — it won't create duplicate sound
 * instances or re-trigger the fade if already playing. */
export function initBgm(scene: Scene) {
    if (!sound) {
        sound = scene.sound.add(BGM_KEY, { loop: true, volume: 0 });
    }

    if (enabled && !sound.isPlaying) {
        sound.play();
        fade(sound, TARGET_VOLUME);
    }
}

/** Flips the enabled state and smoothly fades playback in/out accordingly
 * (rather than an abrupt play/pause). Applies to whichever track is
 * currently active (main theme or the quiz cue). Returns the new enabled
 * state. */
export function toggleBgm(): boolean {
    enabled = !enabled;

    const current = quizSound?.isPlaying || quizSound?.isPaused ? quizSound : sound;
    if (current) {
        if (enabled) {
            if (current.isPaused) {
                current.resume();
            } else if (!current.isPlaying) {
                current.play();
            }
            fade(current, TARGET_VOLUME);
        } else if (current.isPlaying) {
            fade(current, 0, () => current.pause());
        }
    }

    return enabled;
}

export function isBgmEnabled() {
    return enabled;
}

/** Swaps the looping background track to the quiz "thinking" cue — pausing
 * (not stopping) the main theme so stopQuizBgm() can resume it right where
 * it left off once the quiz ends. */
export function startQuizBgm(scene: Scene) {
    if (sound?.isPlaying) {
        fade(sound, 0, () => sound?.pause());
    }

    if (!quizSound) {
        quizSound = scene.sound.add(QUIZ_BGM_KEY, { loop: true, volume: 0 });
    }

    if (enabled && !quizSound.isPlaying) {
        quizSound.play();
        fade(quizSound, TARGET_VOLUME);
    }
}

/** Reverses startQuizBgm(): fades out the quiz cue and resumes the main
 * theme. Safe to call even if the quiz cue never started.
 *
 * This runs from the *outgoing* quiz scene's "shutdown" handler, which
 * fires as part of scene.start()'s teardown — by then that scene's own
 * Phaser systems (including its TweenManager) are being torn down too, so
 * a `scene.tweens.add(...)` fade queued here would never reach its
 * onComplete and both tracks would get stuck (quiz cue stuck playing,
 * main theme never resumed). fade() below sidesteps that entirely by
 * driving the volume ramp with requestAnimationFrame instead of a
 * scene-owned tween. */
export function stopQuizBgm() {
    if (quizSound?.isPlaying) {
        fade(quizSound, 0, () => quizSound?.stop());
    }

    if (sound && enabled) {
        if (sound.isPaused) {
            sound.resume();
        } else if (!sound.isPlaying) {
            sound.play();
        }
        fade(sound, TARGET_VOLUME);
    }
}

// Phaser 4's BaseSound type omits `volume` even though every concrete
// implementation (WebAudioSound, HTML5AudioSound) actually has it — this
// alias documents that gap at the one place it matters instead of
// scattering `as any` casts around.
type VolumeControllableSound = Phaser.Sound.BaseSound & { volume: number };

const fadeHandles = new Map<Phaser.Sound.BaseSound, number>();

/** Ramps `target`'s volume to `volume` over FADE_DURATION using
 * requestAnimationFrame rather than a Scene's TweenManager — sounds are
 * module-level singletons that must keep fading correctly across scene
 * transitions, well past the point where any particular scene (and its
 * tweens) still exists. */
function fade(target: Phaser.Sound.BaseSound, volume: number, onComplete?: () => void) {
    const runningHandle = fadeHandles.get(target);
    if (runningHandle !== undefined) {
        cancelAnimationFrame(runningHandle);
    }

    const soundTarget = target as VolumeControllableSound;
    const startVolume = soundTarget.volume;
    const startTime = performance.now();

    const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / FADE_DURATION);
        soundTarget.volume = startVolume + (volume - startVolume) * t;

        if (t < 1) {
            fadeHandles.set(target, requestAnimationFrame(step));
        } else {
            fadeHandles.delete(target);
            onComplete?.();
        }
    };

    fadeHandles.set(target, requestAnimationFrame(step));
}
