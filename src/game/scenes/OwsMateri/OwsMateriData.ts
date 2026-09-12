/** Text content for the 4-step "Materi OWS" slideshow. Illustration code
 * lives in OwsMateri.ts since each step's visual differs too much (tank
 * cross-section, OCM gauge, valve legend, bypass warning) to usefully
 * data-drive — this file only holds the copy. */

export interface OwsValveInfo {
    number: 1 | 2 | 3;
    label: string;
    role: string;
    colorHex: string;
    color: number;
}

export const OWS_VALVES: OwsValveInfo[] = [
    {
        number: 1,
        label: "KATUP 1 — INLET",
        role: "Membuka aliran air got (bilge water) yang kotor dari tangki menuju separator untuk mulai disaring.",
        colorHex: "#c0392b",
        color: 0xc0392b,
    },
    {
        number: 2,
        label: "KATUP 2 — OUTLET",
        role: "Membuang air yang sudah bersih (di bawah 15 PPM) ke laut. Hanya boleh terbuka setelah OCM menyatakan aman.",
        colorHex: "#1f8d52",
        color: 0x1f8d52,
    },
    {
        number: 3,
        label: "KATUP 3 — BYPASS",
        role: "Jalur darurat yang melewati separator. HARUS selalu tertutup selama operasi normal — membukanya membuang air kotor langsung ke laut.",
        colorHex: "#2f68d8",
        color: 0x2f68d8,
    },
];

export const MATERIAL_COMPLETION_CHECKLIST = [
    "Fungsi Oily Water Separator (OWS)",
    "Batas aman 15 PPM (MARPOL Annex I)",
    "Peran Oil Content Monitor (OCM)",
    "Fungsi Katup 1, 2, dan 3",
    "Bahaya membuka Katup Bypass",
];
