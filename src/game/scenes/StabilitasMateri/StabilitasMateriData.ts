/** Text content for the 6-step "Materi Stabilitas" slideshow. Illustration
 * code lives in StabilitasMateri.ts since each step's visual differs too
 * much (ship tilt demo, point diagram, formula cards, tank cross-section) to
 * usefully data-drive — this file only holds the copy. */

export interface StabilityPointInfo {
    key: "K" | "B" | "G" | "M";
    label: string;
    description: string;
}

export const STABILITY_POINTS: StabilityPointInfo[] = [
    { key: "K", label: "KEEL / LUNAS", description: "Titik referensi paling dasar kapal." },
    { key: "B", label: "CENTER OF BUOYANCY", description: "Titik pusat gaya apung yang bekerja ke atas." },
    { key: "G", label: "CENTER OF GRAVITY", description: "Titik pusat berat seluruh kapal yang bekerja ke bawah." },
    { key: "M", label: "METACENTER", description: "Titik potong garis gaya apung baru dengan garis tengah kapal ketika kapal mengalami kemiringan kecil." },
];

export interface EquilibriumCardInfo {
    id: "positif" | "netral" | "negatif";
    title: string;
    order: ["M", "G"] | ["G", "M"] | ["M/G"];
    gmLabel: string;
    positionNote: string;
    statusLabel: string;
    body: string;
    accentHex: string;
    accent: number;
    heelSequence: number[];
}

export const EQUILIBRIUM_CARDS: EquilibriumCardInfo[] = [
    {
        id: "positif",
        title: "STABILITAS POSITIF",
        order: ["M", "G"],
        gmLabel: "GM > 0",
        positionNote: "M berada di atas G.",
        statusLabel: "✓ STABIL",
        body: "Kapal memiliki kecenderungan untuk kembali tegak.",
        accentHex: "#1f8d52",
        accent: 0x1f8d52,
        heelSequence: [6, 0],
    },
    {
        id: "netral",
        title: "STABILITAS NETRAL",
        order: ["M/G"],
        gmLabel: "GM = 0",
        positionNote: "M berimpit dengan G.",
        statusLabel: "— NETRAL",
        body: "Kapal cenderung tetap pada sudut kemiringannya.",
        accentHex: "#e0792e",
        accent: 0xe0792e,
        heelSequence: [6],
    },
    {
        id: "negatif",
        title: "STABILITAS NEGATIF / LABIL",
        order: ["G", "M"],
        gmLabel: "GM < 0",
        positionNote: "M berada di bawah G.",
        statusLabel: "! LABIL",
        body: "Kapal cenderung menambah kemiringan dan berisiko terbalik.",
        accentHex: "#c0392b",
        accent: 0xc0392b,
        heelSequence: [6, 11],
    },
];

export const FREE_SURFACE_SUMMARY = ["Slack Tank", "Cairan Bergerak", "Virtual Rise of G", "GM Berkurang", "Stabilitas Berkurang"];

export const MATERIAL_COMPLETION_CHECKLIST = [
    "Pengertian Stabilitas",
    "Titik K, B, G, M",
    "GM dan GZ",
    "Kondisi Keseimbangan",
    "Stiff & Tender Vessel",
    "Free Surface Effect",
];
