import { ControlData, ControlFlag } from "../../core/SimulationState";

export type ControlAction = "equipment" | "control-source" | "install-boom" | "close-scupper" | "apply-absorbent" | "isolate-area" | "prepare-waste";

/** Everything is expressed in normalized (0–1) coordinates of the background
 * illustration, so hotspots stay glued to their objects at any resolution. */
export interface NormalizedPoint { x: number; y: number }
export interface NormalizedZone extends NormalizedPoint { rx: number; ry: number }

export interface ControlHotspotConfig {
    id: string;
    title: string;
    description: string;
    /** Shown in the callout once the action is done. */
    doneText: string;
    /** Toast message on success. */
    success: string;
    action: ControlAction;
    flag: ControlFlag;
    anchor: NormalizedPoint;
    /** Callout top-left, relative to the anchor in design pixels. */
    callout: { dx: number; dy: number };
    /** Area of the illustration highlighted once the action is complete. */
    zone: NormalizedZone;
}

export const STEP4_HOTSPOTS: ControlHotspotConfig[] = [
    {
        id: "spill-kit", title: "PERALATAN SPILL KIT", description: "Klik untuk memilih peralatan pengendalian yang sesuai.",
        doneText: "Peralatan dari Step 3 siap digunakan.", success: "Peralatan spill kit siap digunakan.",
        action: "equipment", flag: "equipmentReady",
        anchor: { x: 0.154, y: 0.5 }, callout: { dx: -140, dy: -150 }, zone: { x: 0.154, y: 0.484, rx: 0.095, ry: 0.122 },
    },
    {
        id: "source", title: "SUMBER TUMPAHAN", description: "Klik untuk memastikan katup/sumber kebocoran telah dikendalikan.",
        doneText: "Sumber kebocoran telah dikendalikan.", success: "Sumber tumpahan berhasil dikendalikan.",
        action: "control-source", flag: "sourceControlled",
        anchor: { x: 0.62, y: 0.447 }, callout: { dx: -118, dy: -165 }, zone: { x: 0.616, y: 0.441, rx: 0.06, ry: 0.1 },
    },
    {
        id: "boom", title: "PEMBATAS TUMPAHAN", description: "Klik untuk memasang absorbent boom di sekitar tumpahan.",
        doneText: "Oil boom terpasang mengelilingi tumpahan.", success: "Pembatas tumpahan berhasil dipasang.",
        action: "install-boom", flag: "boomInstalled",
        anchor: { x: 0.209, y: 0.638 }, callout: { dx: -30, dy: -160 }, zone: { x: 0.496, y: 0.68, rx: 0.297, ry: 0.146 },
    },
    {
        id: "scupper", title: "SALURAN PEMBUANGAN", description: "Klik untuk menutup scupper agar minyak tidak masuk ke laut.",
        doneText: "Scupper tertutup rapat.", success: "Scupper berhasil ditutup.",
        action: "close-scupper", flag: "scupperClosed",
        anchor: { x: 0.218, y: 0.855 }, callout: { dx: -235, dy: -140 }, zone: { x: 0.218, y: 0.855, rx: 0.1, ry: 0.075 },
    },
    {
        id: "absorbent", title: "PENYERAP MINYAK", description: "Klik untuk menggunakan absorbent pad/serbuk penyerap.",
        doneText: "Absorbent menyerap minyak di permukaan.", success: "Absorbent berhasil digunakan.",
        action: "apply-absorbent", flag: "absorbentApplied",
        anchor: { x: 0.496, y: 0.69 }, callout: { dx: -40, dy: -150 }, zone: { x: 0.598, y: 0.7, rx: 0.19, ry: 0.075 },
    },
    {
        id: "isolation", title: "AREA ISOLASI", description: "Klik untuk membatasi area agar aman dari lalu lintas crew.",
        doneText: "Area kejadian telah diisolasi.", success: "Area berhasil diisolasi.",
        action: "isolate-area", flag: "areaIsolated",
        anchor: { x: 0.673, y: 0.9 }, callout: { dx: -135, dy: -150 }, zone: { x: 0.673, y: 0.91, rx: 0.05, ry: 0.08 },
    },
    {
        id: "waste", title: "PENGUMPULAN LIMBAH", description: "Klik untuk menyiapkan wadah limbah bekas penyerap.",
        doneText: "Wadah limbah siap digunakan.", success: "Limbah siap dikumpulkan.",
        action: "prepare-waste", flag: "wasteCollectionReady",
        anchor: { x: 0.036, y: 0.776 }, callout: { dx: 40, dy: -170 }, zone: { x: 0.036, y: 0.776, rx: 0.045, ry: 0.07 },
    },
];

/** Recommended procedure for a deck spill: prepare the spill kit, stop the source, secure the area,
 * plug the scuppers, contain, absorb, then collect the waste.
 * Doing an action out of order is never a failure —
 * the learner is only told what should come first. */
export const CONTROL_SEQUENCE: ControlFlag[] = ["equipmentReady", "sourceControlled", "areaIsolated", "scupperClosed", "boomInstalled", "absorbentApplied", "wasteCollectionReady"];

export const SEQUENCE_WARNINGS: Partial<Record<ControlFlag, string>> = {
    equipmentReady: "Siapkan peralatan spill kit terlebih dahulu.",
    sourceControlled: "Amankan sumber tumpahan terlebih dahulu.",
    areaIsolated: "Isolasi area kejadian sebelum melanjutkan.",
    scupperClosed: "Cegah minyak mencapai saluran pembuangan sebelum melanjutkan.",
    boomInstalled: "Pasang pembatas tumpahan sebelum menyerap minyak.",
    absorbentApplied: "Serap minyak sebelum menyiapkan pengumpulan limbah.",
};

/** The earliest unfinished step that must precede `flag`, if any. */
export function findBlockingFlag(control: Readonly<ControlData>, flag: ControlFlag): ControlFlag | null {
    const index = CONTROL_SEQUENCE.indexOf(flag);
    if (index < 0) return null;
    return CONTROL_SEQUENCE.slice(0, index).find((earlier) => !control[earlier]) ?? null;
}

export const CHECKLIST_ITEMS: Array<{ flag: ControlFlag; label: string }> = [
    { flag: "equipmentReady", label: "Siapkan peralatan spill kit" },
    { flag: "sourceControlled", label: "Kendalikan sumber tumpahan" },
    { flag: "areaIsolated", label: "Isolasi area kejadian" },
    { flag: "scupperClosed", label: "Tutup saluran pembuangan (scupper)" },
    { flag: "boomInstalled", label: "Pasang pembatas tumpahan" },
    { flag: "absorbentApplied", label: "Gunakan penyerap minyak" },
    { flag: "wasteCollectionReady", label: "Siapkan pengumpulan limbah" },
];

/** Visual anchors on the background for the transient effects. */
export const STEP4_EFFECTS = {
    pool: { x: 0.496, y: 0.69, rx: 0.22, ry: 0.06 },
    valveWheel: { x: 0.619, y: 0.367 },
    drainCover: { x: 0.218, y: 0.855, width: 0.224 },
};
