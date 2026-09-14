/** Text/content data for the 7-step "Materi OWS" page. Kept separate from
 * OwsMateri.ts (which owns all layout/drawing) since several steps share
 * the same list/card/table shapes and are easiest to iterate over when the
 * copy lives in plain data. */

export interface OwsSidebarStep {
    id: number;
    title: string;
}

export const OWS_SIDEBAR_STEPS: OwsSidebarStep[] = [
    { id: 1, title: "Pengertian OWS" },
    { id: 2, title: "Prinsip Kerja" },
    { id: 3, title: "Komponen Utama" },
    { id: 4, title: "Prosedur Operasi" },
    { id: 5, title: "Batas Buangan 15 PPM" },
    { id: 6, title: "Kewajiban Pencatatan" },
    { id: 7, title: "Ketentuan MARPOL Annex I" },
];

/** Step 2 — the OWS work-flow, drawn as a horizontal numbered chain. */
export interface OwsFlowStep {
    number: number;
    label: string;
    description: string;
}

export const OWS_WORK_FLOW: OwsFlowStep[] = [
    { number: 1, label: "Bilge Tank", description: "Bilge water dialirkan dari bilge tank." },
    { number: 2, label: "Pompa Bilge", description: "Pompa mengalirkan bilge water menuju OWS." },
    { number: 3, label: "OWS", description: "OWS memisahkan minyak dan air." },
    { number: 4, label: "Oil Content Monitor", description: "Oil Content Monitor membaca kadar minyak." },
    { number: 5, label: "< 15 PPM ?", description: "Air hanya diarahkan ke overboard apabila memenuhi batas yang diizinkan." },
];

/** Step 3 — component callout markers positioned over the real background
 * artwork (fractions of the 1920x1080 design canvas), not drawn machinery. */
export interface OwsComponentMarker {
    number: string;
    title: string;
    role: string;
    xFrac: number;
    yFrac: number;
}

export const OWS_COMPONENT_MARKERS: OwsComponentMarker[] = [
    {
        number: "01",
        title: "Bilge Water Pump",
        role: "Mengalirkan bilge water menuju separator.",
        xFrac: 0.305,
        yFrac: 0.685,
    },
    {
        number: "02",
        title: "Oil Water Separator",
        role: "Memisahkan minyak dari air.",
        xFrac: 0.495,
        yFrac: 0.46,
    },
    {
        number: "03",
        title: "Oil Content Monitor (OCM)",
        role: "Mengukur kadar minyak pada air keluaran.",
        xFrac: 0.665,
        yFrac: 0.53,
    },
    {
        number: "04",
        title: "Inlet Valve",
        role: "Mengatur aliran masuk.",
        xFrac: 0.325,
        yFrac: 0.51,
    },
    {
        number: "05",
        title: "Outlet / Overboard Valve",
        role: "Mengatur aliran air hasil pemisahan.",
        xFrac: 0.785,
        yFrac: 0.535,
    },
    {
        number: "06",
        title: "Bypass / Recirculation Line",
        role: "Mengembalikan aliran apabila kondisi pembuangan belum memenuhi persyaratan.",
        xFrac: 0.495,
        yFrac: 0.205,
    },
];

/** Step 4 — operating procedure checklist. */
export const OWS_PROCEDURE_STEPS: string[] = [
    "Periksa kondisi sistem",
    "Pastikan jalur dan valve sesuai",
    "Jalankan bilge water pump",
    "Operasikan OWS",
    "Pantau Oil Content Monitor",
    "Pastikan nilai memenuhi batas pembuangan",
    "Arahkan aliran sesuai kondisi sistem",
    "Catat operasi sesuai prosedur kapal",
];

/** Step 5 — PPM reading comparison cards. */
export interface OwsPpmSample {
    ppm: number;
    verdict: "MEMENUHI" | "BATAS" | "TIDAK MEMENUHI";
}

export const OWS_PPM_SAMPLES: OwsPpmSample[] = [
    { ppm: 12, verdict: "MEMENUHI" },
    { ppm: 15, verdict: "BATAS" },
    { ppm: 25, verdict: "TIDAK MEMENUHI" },
    { ppm: 45, verdict: "TIDAK MEMENUHI" },
];

/** Step 6 — Oil Record Book example fields/rows (placeholder content only,
 * never real ship data per the brief). */
export const OWS_RECORD_BOOK_FIELDS: string[] = [
    "Tanggal / waktu",
    "Jenis operasi",
    "Lokasi / posisi kapal (jika diperlukan)",
    "Jumlah atau kondisi terkait operasi",
    "Keterangan operasi",
    "Petugas yang bertanggung jawab",
];

export interface OwsRecordBookExampleRow {
    tanggal: string;
    operasi: string;
    jumlah: string;
    petugas: string;
}

export const OWS_RECORD_BOOK_EXAMPLE: OwsRecordBookExampleRow[] = [
    { tanggal: "08-11-2025 / 06.40", operasi: "Pengoperasian OWS — pemompaan bilge water", jumlah: "± 0,8 m³, OCM 11 PPM", petugas: "Masinis Jaga (contoh)" },
    { tanggal: "08-11-2025 / 07.15", operasi: "Pembuangan air hasil filtrasi ke laut", jumlah: "OCM 9 PPM (memenuhi batas)", petugas: "KKM (contoh)" },
];

/** Step 7 — closing MARPOL Annex I summary cards. */
export interface OwsSummaryCard {
    title: string;
    body: string;
}

export const OWS_SUMMARY_CARDS: OwsSummaryCard[] = [
    { title: "PENCEGAHAN", body: "Mencegah pencemaran laut oleh minyak." },
    { title: "PENGENDALIAN", body: "Operasi pembuangan harus mengikuti persyaratan yang berlaku." },
    { title: "PENCATATAN", body: "Aktivitas terkait minyak dicatat sesuai prosedur dan regulasi." },
];
