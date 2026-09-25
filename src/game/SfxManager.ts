import { Scene } from "phaser";

/** Voice lines and cues that ship in assets/soundeffect. */
export const SFX_ASSETS: Array<[string, string]> = [
    ["bgm.dubbing_greeting", "assets/soundeffect/dashboard_ecoship.mp3"],
    ["sfx.menuClick", "assets/soundeffect/menu-click.mp3"],
    ["sfx.quizWrong", "assets/soundeffect/quiz_wrong.webm"],
    ["sfx.quizCorrect", "assets/soundeffect/complete_evaluation.ogg"],
    ["sfx.success", "assets/soundeffect/applepay.mp3"],
    ["sfx.nilai.baik", "assets/soundeffect/nilai_baik.mp3"],
    ["sfx.nilai.kurang", "assets/soundeffect/nilai_kurang.mp3"],

    // Main-menu hover cues.
    ["sfx.menu.simulatorOws", "assets/soundeffect/menu/menu_simulator_ows.mp3"],
    ["sfx.menu.pemilahanSampah", "assets/soundeffect/menu/menu_pemilahan_sampah.mp3"],
    ["sfx.menu.admSopep", "assets/soundeffect/menu/menu_adm_sopep.mp3"],
    ["sfx.menu.evaluasi", "assets/soundeffect/menu/menu_evaluasi_umpan_balik.mp3"],
    ["sfx.menu.kuis", "assets/soundeffect/menu/menu_kuis.mp3"],
    ["sfx.menu.tentang", "assets/soundeffect/menu/menu_tentang.mp3"],
    ["sfx.menu.keluar", "assets/soundeffect/menu/menu_keluar.mp3"],

    // Materi / simulator narration.
    ["sfx.materi.ows", "assets/soundeffect/materi/materi_simulator_ows.mp3"],
    ["sfx.materi.ows2", "assets/soundeffect/materi/materi_simulator_ows2.mp3"],
    ["sfx.ows.pump", "assets/soundeffect/materi/ows/ows_bilge_water_pump.mp3"],
    ["sfx.ows.separator", "assets/soundeffect/materi/ows/ows_bilge_oil_water_sparator.mp3"],
    ["sfx.ows.ocm", "assets/soundeffect/materi/ows/ows_bilge_oil_conten_monitor.mp3"],
    ["sfx.ows.inlet", "assets/soundeffect/materi/ows/ows_inlet_valve.mp3"],
    ["sfx.ows.outlet", "assets/soundeffect/materi/ows/ows_outlet.mp3"],
    ["sfx.ows.bypass", "assets/soundeffect/materi/ows/ows_bypass.mp3"],
    ["sfx.ows.simulasi", "assets/soundeffect/materi/ows/ows_penjelasan_simulasi.mp3"],
    ["sfx.materi.pilahSampah", "assets/soundeffect/materi/materi_pemilahan_sampah.mp3"],
    ["sfx.pilahSampah.instruksi", "assets/soundeffect/materi/materi_pemilahan_sampah_instruksi_simulasi.mp3"],
    ["sfx.materi.sopep", "assets/soundeffect/materi/soped/sopep_materi.mp3"],
    ["sfx.sopep.step1", "assets/soundeffect/materi/soped/sopep_simulator1.mp3"],
    ["sfx.sopep.step2", "assets/soundeffect/materi/soped/sopep_simulator2.mp3"],
    ["sfx.sopep.step3", "assets/soundeffect/materi/soped/sopep_simulator3.mp3"],
    ["sfx.sopep.step4", "assets/soundeffect/materi/soped/sopep_simulator4.mp3"],
    ["sfx.sopep.step5", "assets/soundeffect/materi/soped/sopep_simulator5.mp3"],
];

// playSfx()/playVoiceSfx() skip any key whose file was not loaded.
export const SFX_KEYS = {
    click: "sfx.menuClick",
    quizWrong: "sfx.quizWrong",
    quizCorrect: "sfx.quizCorrect",
    success: "sfx.success",
    greeting: "bgm.dubbing_greeting",
    keteranganStabilitas: "sfx.keterangan.stabilitas",
    // menuAnatomi / menuSimulator are the historic names of the first two menu cues.
    menuAnatomi: "sfx.menu.simulatorOws",
    menuSimulator: "sfx.menu.pemilahanSampah",
    menuSimulatorOws: "sfx.menu.simulatorOws",
    menuPemilahanSampah: "sfx.menu.pemilahanSampah",
    menuAdmSopep: "sfx.menu.admSopep",
    menuEvaluasi: "sfx.menu.evaluasi",
    menuTentang: "sfx.menu.tentang",
    menuKeluar: "sfx.menu.keluar",
    menuKuis: "sfx.menu.kuis",
    nilaiBaik: "sfx.nilai.baik",
    nilaiKurang: "sfx.nilai.kurang",
    materiOws: "sfx.materi.ows",
    materiOws2: "sfx.materi.ows2",
    owsSimulasi: "sfx.ows.simulasi",
    materiPilahSampah: "sfx.materi.pilahSampah",
    pilahSampahInstruksi: "sfx.pilahSampah.instruksi",
    materiSopep: "sfx.materi.sopep",
} as const;

/** OWS component narration, in the same order as OWS_COMPONENT_MARKERS. */
export const OWS_COMPONENT_SFX = ["sfx.ows.pump", "sfx.ows.separator", "sfx.ows.ocm", "sfx.ows.inlet", "sfx.ows.outlet", "sfx.ows.bypass"];

/** SOPEP simulator narration for Step 1–5 (index = step - 1). */
export const SOPEP_STEP_SFX = ["sfx.sopep.step1", "sfx.sopep.step2", "sfx.sopep.step3", "sfx.sopep.step4", "sfx.sopep.step5"];

/** Plays a one-shot sound effect by key. Scene.sound is a shared reference
 * to the game's global sound manager, so this is safe to call even right
 * before a scene.start() navigation — the clip keeps playing regardless of
 * the originating scene's lifecycle. */
export function playSfx(scene: Scene, key: string, volume = 0.7) {
    if (!scene.cache.audio.exists(key)) return;
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
    if (!scene.cache.audio.exists(key)) return;
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
