// ---------------------------------------------------------------------------
// Data for the SOPEP oil-spill-response mission simulator (SopepSimulator.ts)
// and its results screen (SopepHasilUmpanBalik.ts). One linear mission —
// briefing -> incident -> 5 numbered steps -> result — replaces the old
// multi-case ("KASUS 1/3") engine entirely.
// ---------------------------------------------------------------------------

/** Section B — "TARGET MISI" checklist shown on the briefing page. */
export interface SopepMissionTarget {
    id: string;
    label: string;
}

export const SOPEP_MISSION_TARGETS: SopepMissionTarget[] = [
    { id: "identify", label: "Identifikasi insiden" },
    { id: "report", label: "Lakukan pelaporan" },
    { id: "equipment", label: "Pilih tindakan yang tepat" },
    { id: "contain", label: "Kendalikan tumpahan" },
    { id: "document", label: "Lengkapi dokumentasi" },
];

export const SOPEP_MISSION_SCENARIO =
    "Terjadi tumpahan minyak di area kapal. Sebagai awak kapal, Anda harus melakukan tindakan awal, melaporkan kejadian, memilih peralatan penanggulangan, mengendalikan penyebaran minyak, dan membuat catatan insiden.";

/** Section C — the "KONDISI DARURAT" info panel on the incident page. */
export interface SopepIncidentInfo {
    location: string;
    incidentType: string;
    status: string;
}

export const SOPEP_INCIDENT_INFO: SopepIncidentInfo = {
    location: "Main Deck",
    incidentType: "Oil Spill",
    status: "BELUM DITANGANI",
};

// ---- STEP 1 — Identifikasi Insiden (Section D) -----------------------------

/** A clickable hotspot over the incident illustration. Position is given as
 * a fraction of the illustration's width/height (same xFrac/yFrac pattern as
 * OwsMateriData's OWS_COMPONENT_MARKERS), so layout code can place it without
 * hard-coded pixel coordinates. Every hotspot reveals real information —
 * there is no "wrong" hotspot in this discovery step. */
export interface SopepHotspot {
    id: string;
    xFrac: number;
    yFrac: number;
    title: string;
    detail: string;
}

export const SOPEP_IDENTIFY_HOTSPOTS: SopepHotspot[] = [
    { id: "source", xFrac: 0.28, yFrac: 0.58, title: "SUMBER TUMPAHAN", detail: "Kebocoran pada sambungan pipa minyak." },
    { id: "pollutant", xFrac: 0.5, yFrac: 0.72, title: "JENIS PENCEMAR", detail: "Minyak / oily mixture." },
    { id: "location", xFrac: 0.7, yFrac: 0.55, title: "LOKASI", detail: "Main Deck, dekat jalur pipa transfer." },
    { id: "condition", xFrac: 0.5, yFrac: 0.4, title: "KONDISI TUMPAHAN", detail: "Tumpahan meluas perlahan dan belum mencapai saluran pembuangan." },
];

// ---- STEP 2 — Laporkan Insiden (Section E) ---------------------------------

/** One field of the "OIL POLLUTION REPORT" form. `auto` fields (date/time)
 * are filled automatically at render time and are not user-selectable;
 * every other field is a short pick-list of simple choice labels. There are
 * no wrong choices here — this step is data entry, not a quiz. */
export interface SopepReportField {
    id: string;
    label: string;
    auto?: boolean;
    options?: string[];
}

export const SOPEP_REPORT_FIELDS: SopepReportField[] = [
    { id: "dateTime", label: "DATE & TIME", auto: true },
    { id: "location", label: "LOCATION", options: ["Main Deck", "Engine Room", "Cargo Deck", "Pump Room"] },
    { id: "incidentType", label: "TYPE OF INCIDENT", options: ["Oil Spill", "Fuel Leak", "Hydraulic Leak", "Chemical Spill"] },
    { id: "quantity", label: "ESTIMATED QUANTITY", options: ["< 10 Liter", "10 - 50 Liter", "50 - 100 Liter", "> 100 Liter"] },
    { id: "actionTaken", label: "ACTION TAKEN", options: ["Sumber diamankan", "Area dibatasi", "Tumpahan diserap", "Dilaporkan ke Mualim Jaga"] },
    { id: "assistance", label: "ASSISTANCE NEEDED", options: ["Tidak ada", "Tambahan awak", "Peralatan tambahan", "Koordinasi pelabuhan"] },
];

// ---- STEP 3 — Pilih Peralatan SOPEP (Section F) ----------------------------

/** A single equipment slot in the selection grid. Distractors (`correct:
 * false`) are items that are not relevant to an oil-spill response, used to
 * train judgement — selecting one still lets the user continue, but counts
 * as a procedural mistake once confirmed. */
export interface SopepEquipmentItem {
    id: string;
    label: string;
    textureKey?: string;
    correct: boolean;
}

export const SOPEP_EQUIPMENT_ITEMS: SopepEquipmentItem[] = [
    { id: "oilAbsorbent", label: "OIL ABSORBENT", textureKey: "sopep.asset.absorbentRoll", correct: true },
    { id: "absorbentPad", label: "ABSORBENT PAD", textureKey: "sopep.asset.absorbentPad", correct: true },
    { id: "oilBoom", label: "OIL BOOM", textureKey: "sopep.asset.oilBoom", correct: true },
    { id: "scupperPlug", label: "SCUPPER PLUG", textureKey: "sopep.asset.scupperPlug", correct: true },
    { id: "collectionContainer", label: "COLLECTION CONTAINER", textureKey: "sopep.asset.collectionContainer", correct: true },
    { id: "ppe", label: "PPE", textureKey: "sopep.asset.ppe", correct: true },
    { id: "fireExtinguisher", label: "FIRE EXTINGUISHER", correct: false },
    { id: "lifeBuoy", label: "LIFE BUOY", correct: false },
    { id: "paintRoller", label: "PAINT ROLLER", correct: false },
];

// ---- STEP 4 — Kendalikan Tumpahan (Section H) ------------------------------

/** One of the 4 sequential containment phases. `correctItemId` refers to a
 * SopepEquipmentItem id. `wrongFeedback` maps a wrongly-dropped item's id (or
 * the special key "early", used when the player attempts a later phase's
 * drop zone before finishing the current one) to the exact educational
 * message to show — falls back to `default` for any other mismatch. */
export interface SopepContainmentPhase {
    id: string;
    instruction: string;
    correctItemId: string;
    dropZoneLabel: string;
    wrongFeedback: Record<string, string>;
}

export const SOPEP_CONTAINMENT_PHASES: SopepContainmentPhase[] = [
    {
        id: "boom",
        instruction: "Tempatkan OIL BOOM di sekeliling area tumpahan untuk mencegah penyebaran.",
        correctItemId: "oilBoom",
        dropZoneLabel: "AREA OIL BOOM",
        wrongFeedback: {
            scupperPlug: "Belum tepat. Scupper Plug digunakan untuk menutup saluran agar minyak tidak masuk ke sistem pembuangan.",
            default: "Belum tepat. Gunakan Oil Boom untuk membatasi penyebaran tumpahan minyak.",
        },
    },
    {
        id: "scupper",
        instruction: "Tempatkan SCUPPER PLUG pada saluran pembuangan (scupper/drain) agar minyak tidak masuk ke laut.",
        correctItemId: "scupperPlug",
        dropZoneLabel: "AREA SCUPPER PLUG",
        wrongFeedback: {
            oilBoom: "Belum tepat. Oil Boom digunakan untuk membatasi penyebaran tumpahan minyak.",
            default: "Belum tepat. Saluran pembuangan diamankan menggunakan Scupper Plug.",
        },
    },
    {
        id: "absorb",
        instruction: "Serap tumpahan minyak menggunakan ABSORBENT PAD.",
        correctItemId: "absorbentPad",
        dropZoneLabel: "AREA TUMPAHAN MINYAK",
        wrongFeedback: {
            early: "Perhatikan urutan tindakan. Kendalikan penyebaran tumpahan terlebih dahulu.",
            default: "Belum tepat. Gunakan Absorbent Pad untuk menyerap tumpahan minyak.",
        },
    },
    {
        id: "collect",
        instruction: "Kumpulkan limbah hasil penyerapan ke dalam COLLECTION CONTAINER.",
        correctItemId: "collectionContainer",
        dropZoneLabel: "AREA PENGUMPULAN LIMBAH",
        wrongFeedback: {
            early: "Perhatikan urutan tindakan. Selesaikan tahap penyerapan tumpahan terlebih dahulu.",
            default: "Belum tepat. Limbah hasil penyerapan dikumpulkan menggunakan Collection Container.",
        },
    },
];

/** Draggable tray items for Step 4 — a subset of SOPEP_EQUIPMENT_ITEMS (the
 * 4 items actually used across the containment phases), kept as separate
 * data so the tray doesn't accidentally include Step 3's PPE/oil-absorbent
 * items that have no phase of their own. */
export const SOPEP_CONTAINMENT_TRAY_ITEM_IDS = ["oilBoom", "scupperPlug", "absorbentPad", "collectionContainer"];

// ---- STEP 5 — Catat & Dokumentasikan (Section M) ---------------------------

export interface SopepDocumentCard {
    id: string;
    label: string;
    textureKey: string;
}

export const SOPEP_DOCUMENT_CARDS: SopepDocumentCard[] = [
    { id: "incidentReport", label: "INCIDENT REPORT", textureKey: "sopep.asset.incidentReport" },
    { id: "equipmentLog", label: "EQUIPMENT LOG", textureKey: "sopep.asset.equipmentLog" },
    { id: "sopepRecord", label: "SOPEP RECORD", textureKey: "sopep.asset.sopepRecord" },
    { id: "drillRecord", label: "DRILL RECORD", textureKey: "sopep.asset.drillRecord" },
];

export const SOPEP_DOCUMENTATION_CHECKLIST: string[] = [
    "Waktu kejadian dicatat",
    "Lokasi dicatat",
    "Jenis pencemar dicatat",
    "Tindakan penanganan dicatat",
    "Peralatan yang digunakan dicatat",
    "Hasil penanganan dicatat",
];

// ---- Progress row (Section L) ----------------------------------------------

export const SOPEP_PROGRESS_LABELS: string[] = ["Identifikasi", "Pelaporan", "Persiapan", "Pengendalian", "Dokumentasi"];

// ---- Result (Section N) -----------------------------------------------------

/** Passed to SopepHasilUmpanBalik.init() once the mission is complete. This
 * is a linear-completion screen (not per-item pass/fail), so every checklist
 * item in SOPEP_RESULT_CHECKLIST is always shown as done — `mistakeCount`
 * and `accuracyPercent` are what actually vary between playthroughs.
 *
 * Accuracy formula: 100 - min(40, mistakeCount * 8), clamped to [0, 100] —
 * each procedural mistake (a wrong equipment pick still selected at confirm
 * time, or a wrong/early drop during containment) costs 8 points, capped so
 * a rough playthrough still finishes with a passing-adjacent score rather
 * than bottoming out at 0 from a handful of early mistakes. */
export interface SopepMissionResult {
    mistakeCount: number;
    stepsCompleted: number;
    totalSteps: number;
    accuracyPercent: number;
}

export const SOPEP_RESULT_CHECKLIST: string[] = [
    "Insiden berhasil diidentifikasi",
    "Laporan awal dibuat",
    "Peralatan dipilih",
    "Penyebaran tumpahan dikendalikan",
    "Saluran pembuangan diamankan",
    "Tumpahan diserap",
    "Limbah dikumpulkan",
    "Dokumentasi diperbarui",
];

export function computeAccuracyPercent(mistakeCount: number): number {
    return Math.max(0, Math.min(100, 100 - Math.min(40, mistakeCount * 8)));
}
