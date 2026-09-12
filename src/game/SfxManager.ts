import { Scene } from "phaser";

export const SFX_KEYS = {
    click: "sfx.menuClick",
    quizWrong: "sfx.quizWrong",
    quizCorrect: "sfx.quizCorrect",
    greeting: "bgm.dubbing_greeting",
    keteranganStabilitas: "sfx.keterangan.stabilitas",
    menuAnatomi: "sfx.menu.anatomi",
    menuSimulator: "sfx.menu.simulator",
    menuEvaluasi: "sfx.menu.evaluasi",
    menuTentang: "sfx.menu.tentang",
    menuKeluar: "sfx.menu.keluar",
    menuKuis: "sfx.menu.kuis",
    nilaiBaik: "sfx.nilai.baik",
    nilaiKurang: "sfx.nilai.kurang",
} as const;

/** Plays a one-shot sound effect by key. Scene.sound is a shared reference
 * to the game's global sound manager, so this is safe to call even right
 * before a scene.start() navigation — the clip keeps playing regardless of
 * the originating scene's lifecycle. */
export function playSfx(scene: Scene, key: string, volume = 0.7) {
    scene.sound.play(key, { volume });
}

/** Score threshold used to pick the nilai_baik/nilai_kurang result cue —
 * >=70 is "baik", below is "kurang". */
export const NILAI_BAIK_THRESHOLD = 70;

let currentVoice: Phaser.Sound.BaseSound | null = null;

/** Immediately stops (and releases) whatever voice line is currently
 * playing, if any — e.g. cutting off the character greeting the moment the
 * player navigates away from MainMenu, even if nothing else happens to
 * trigger a replacement voice line right away. */
export function stopVoiceSfx() {
    if (currentVoice) {
        currentVoice.stop();
        currentVoice.destroy();
        currentVoice = null;
    }
}

/** Plays a one-shot "voice" line — narration, a menu-hover cue, or a quiz
 * result cue — stopping whatever voice line is currently playing first so
 * they never overlap each other. Distinct from playSfx(), which is for
 * short UI blips (clicks, correct/wrong dings) that are fine to overlap. */
export function playVoiceSfx(scene: Scene, key: string, volume = 0.85) {
    stopVoiceSfx();

    const voice = scene.sound.add(key, { volume });
    currentVoice = voice;
    voice.once("complete", () => {
        if (currentVoice === voice) {
            currentVoice = null;
        }
        voice.destroy();
    });
    voice.play();
}
