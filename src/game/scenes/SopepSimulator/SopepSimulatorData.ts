export type SopepSourceId = "drum" | "valve" | "pipe";
export type SopepStopAction = "TUTUP_VALVE" | "MATIKAN_POMPA" | "AMANKAN_AREA";

export const STOP_ACTION_LABEL: Record<SopepStopAction, string> = {
    TUTUP_VALVE: "TUTUP VALVE",
    MATIKAN_POMPA: "MATIKAN POMPA",
    AMANKAN_AREA: "AMANKAN AREA",
};

export const SOURCE_LABEL: Record<SopepSourceId, string> = {
    drum: "Drum Minyak",
    valve: "Valve",
    pipe: "Transfer Pipe",
};

export interface SopepCaseVariant {
    sourceId: SopepSourceId;
    correctStopAction: SopepStopAction;
    spillAmountLiters: number;
    position: string;
}

export interface SopepCaseSlot {
    id: 1 | 2 | 3;
    title: string;
    level: string;
    incidentType: string;
    /** Predefined, logically-consistent variants — one is picked at random
     * each time this case slot is played, instead of generating a fully
     * random (and potentially nonsensical) scenario. */
    variants: SopepCaseVariant[];
}

export const SOPEP_CASE_SLOTS: SopepCaseSlot[] = [
    {
        id: 1,
        title: "Kebocoran Drum / Valve",
        level: "Dasar",
        incidentType: "Kebocoran minyak dari drum penyimpanan",
        variants: [
            { sourceId: "drum", correctStopAction: "AMANKAN_AREA", spillAmountLiters: 20, position: "Main Deck, sisi kanan" },
            { sourceId: "valve", correctStopAction: "TUTUP_VALVE", spillAmountLiters: 15, position: "Main Deck, dekat tangki bahan bakar" },
        ],
    },
    {
        id: 2,
        title: "Transfer Pipe Leak",
        level: "Menengah",
        incidentType: "Kebocoran pada pipa transfer bahan bakar",
        variants: [
            { sourceId: "pipe", correctStopAction: "MATIKAN_POMPA", spillAmountLiters: 45, position: "Main Deck, jalur pipa transfer" },
            { sourceId: "pipe", correctStopAction: "MATIKAN_POMPA", spillAmountLiters: 60, position: "Main Deck, dekat manifold" },
        ],
    },
    {
        id: 3,
        title: "Spill Near Scupper / Overboard Area",
        level: "Lanjutan",
        incidentType: "Tumpahan minyak mendekati scupper",
        variants: [
            { sourceId: "valve", correctStopAction: "TUTUP_VALVE", spillAmountLiters: 80, position: "Main Deck, dekat scupper kanan" },
            { sourceId: "pipe", correctStopAction: "MATIKAN_POMPA", spillAmountLiters: 95, position: "Main Deck, dekat scupper kiri" },
        ],
    },
];

export const SOPEP_KIT_ITEMS: { id: string; label: string; icon: string }[] = [
    { id: "boom", label: "Absorbent Boom", icon: "🟫" },
    { id: "pad", label: "Absorbent Pad", icon: "🟦" },
    { id: "scoop", label: "Scoop", icon: "🥄" },
    { id: "bag", label: "Disposal Bag", icon: "🛍️" },
];

export const SOPEP_CHECKLIST_LABELS = [
    "Identifikasi sumber",
    "Hentikan kebocoran",
    "Amankan scupper",
    "Kendalikan tumpahan",
    "Dokumentasi & laporan",
];

export interface SopepCaseScore {
    identifyFirstTry: boolean;
    stopFirstTry: boolean;
    kitOrderCorrect: boolean;
    reportSubmitted: boolean;
}

export interface SopepResultData {
    caseScores: SopepCaseScore[];
}
