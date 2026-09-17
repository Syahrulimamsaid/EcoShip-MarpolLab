export interface PilahSidebarStep {
    id: number;
    title: string;
}

export const PILAH_SIDEBAR_STEPS: PilahSidebarStep[] = [
    { id: 1, title: "Pengantar MARPOL Annex V" },
    { id: 2, title: "Pemilahan Sampah di Kapal" },
    { id: 3, title: "Incinerator" },
    { id: 4, title: "Comminutor" },
    { id: 5, title: "Bak/Gudang Sampah" },
    { id: 6, title: "Alur Pengelolaan Sampah" },
    { id: 7, title: "Kesimpulan" },
];

/** Step-1 "learning goals" panel. */
export const PILAH_LEARNING_GOALS: string[] = [
    "Mengenali jenis sampah di kapal",
    "Melakukan pemilahan sampah",
    "Memahami fungsi peralatan pengelolaan sampah",
    "Menentukan penanganan sampah yang tepat",
];

/** Step-1 icon strip (ship / sea / environment / bin). */
export const PILAH_INTRO_ICONS: { icon: string; label: string }[] = [
    { icon: "🚢", label: "Kapal" },
    { icon: "🌊", label: "Laut" },
    { icon: "🌿", label: "Lingkungan" },
    { icon: "🗑️", label: "Tempat Sampah" },
];

export interface WasteCategory {
    title: string;
    subtitle?: string;
    example: string;
    color: number;
    icon: string;
}

/** Step-2 waste categories, shown as a row of flat garbage-bin cards. */
export const WASTE_CATEGORIES: WasteCategory[] = [
    { title: "SISA MAKANAN", subtitle: "(Food Waste)", example: "Sisa nasi, sayur, buah, dan bahan makanan lainnya.", color: 0x2e9e5b, icon: "🐟" },
    { title: "PLASTIK", example: "Botol plastik, kantong plastik, kemasan plastik, tali sintetis.", color: 0xe0b400, icon: "♻️" },
    { title: "KERTAS / KARTON", example: "Kertas, kardus, kemasan karton.", color: 0x2f68d8, icon: "📦" },
    { title: "LOGAM", example: "Kaleng, besi, aluminium, dan peralatan logam.", color: 0x6b7280, icon: "⚙️" },
    { title: "KACA", example: "Botol kaca, pecahan kaca, dan wadah kaca.", color: 0x1d9bd7, icon: "🍾" },
    { title: "MINYAK GORENG BEKAS", subtitle: "(Cooking Oil)", example: "Minyak bekas kegiatan dapur.", color: 0x8a5a2b, icon: "🛢️" },
    { title: "SAMPAH LAINNYA", example: "Tali, kain, lampu, residu, dan sampah lain yang memerlukan penanganan sesuai jenisnya.", color: 0xc0392b, icon: "⚠️" },
];

export const PILAH_SORTING_GOALS: string[] = [
    "Mencegah pencemaran laut",
    "Memudahkan pengelolaan dan daur ulang",
    "Mendukung kepatuhan terhadap MARPOL Annex V",
    "Menjaga lingkungan kapal tetap bersih dan aman",
];

export const PILAH_REMINDERS: string[] = [
    "Jangan mencampur kembali sampah yang telah dipilah",
    "Plastik tidak boleh dibuang ke laut",
    "Ikuti prosedur pengelolaan sampah kapal",
    "Sampah yang perlu diserahkan ke darat ditangani melalui fasilitas penerimaan pelabuhan",
];

export interface FlowNode {
    label: string;
}

/** Step-3 incinerator flow. */
export const INCINERATOR_FLOW: FlowNode[] = [
    { label: "SAMPAH\nYANG SESUAI" },
    { label: "INCINERATOR" },
    { label: "PROSES\nPEMBAKARAN" },
    { label: "ABU" },
    { label: "PENANGANAN\nSESUAI PROSEDUR" },
];

/** Step-4 comminutor flow. */
export const COMMINUTOR_FLOW: FlowNode[] = [
    { label: "FOOD WASTE" },
    { label: "COMMINUTOR" },
    { label: "PENGHANCURAN" },
    { label: "PARTIKEL\nLEBIH KECIL" },
    { label: "PENANGANAN\nSESUAI KETENTUAN" },
];

export interface StorageBin {
    label: string;
    color: number;
}

/** Step-5 storage bin row. */
export const STORAGE_BINS: StorageBin[] = [
    { label: "PLASTIK", color: 0xe0b400 },
    { label: "FOOD WASTE", color: 0x2e9e5b },
    { label: "KERTAS/KARTON", color: 0x2f68d8 },
    { label: "LOGAM", color: 0x6b7280 },
    { label: "KACA", color: 0x1d9bd7 },
    { label: "LAINNYA", color: 0xc0392b },
];

export const PILAH_STORAGE_CHECKLIST: string[] = [
    "Sampah dipisahkan berdasarkan kategori",
    "Wadah diberi identifikasi yang jelas",
    "Area penyimpanan dijaga bersih dan aman",
    "Sampah tidak dicampur kembali",
    "Sampah disimpan sampai masuk proses pengelolaan berikutnya",
];

/** Step-6 main chain, before it branches into the four handling routes. */
export const PILAH_MAIN_FLOW: FlowNode[] = [
    { label: "SAMPAH\nDIHASILKAN" },
    { label: "IDENTIFIKASI\nJENIS" },
    { label: "PEMILAHAN" },
    { label: "PILIH\nPENANGANAN" },
];

export const PILAH_HANDLING_BRANCHES: string[] = [
    "INCINERATOR",
    "COMMINUTOR",
    "GUDANG SAMPAH",
    "FASILITAS PENERIMAAN\nPELABUHAN",
];

/** Step-7 closing summary. */
export const PILAH_SUMMARY: string[] = [
    "Kenali jenis sampah",
    "Pilah ke kategori yang tepat",
    "Tentukan metode pengelolaan",
    "Gunakan peralatan hanya untuk sampah yang sesuai",
    "Simpan atau serahkan sampah sesuai prosedur",
];
