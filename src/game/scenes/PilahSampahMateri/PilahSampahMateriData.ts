/** Text content for the 7-step "Materi Pemilahan Sampah" whiteboard.
 * Every field that maps to an icon/illustration in the reference design is
 * intentionally NOT represented here — PilahSampahMateri.ts renders those
 * slots as empty bordered placeholder containers so real PNG/SVG assets can
 * be dropped in later without touching layout code. */

export interface PilahSidebarStep {
    id: number;
    title: string;
}

export const PILAH_SIDEBAR_STEPS: PilahSidebarStep[] = [
    { id: 1, title: "Pengantar MARPOL Annex V" },
    { id: 2, title: "Pemilahan Sampah di Kapal" },
    { id: 3, title: "Incinerator" },
    { id: 4, title: "Comminutor" },
    { id: 5, title: "Bak / Gudang Sampah" },
    { id: 6, title: "Alur Pengelolaan Sampah" },
    { id: 7, title: "Kesimpulan" },
];

/** Step 1 — the four intro columns. `icon` is the preloaded texture key for
 * the circle asset (assets/pilah_sampah/materi/circle-*.png). */
export interface PilahIntroItem {
    icon: string;
    label: string;
    desc: string;
}

export const PILAH_INTRO_ITEMS: PilahIntroItem[] = [
    { icon: "pilah_sampah.materi.circleShip", label: "Kapal", desc: "Sumber sampah dari kegiatan operasional" },
    { icon: "pilah_sampah.materi.circleSea", label: "Laut", desc: "Harus dilindungi dari pencemaran" },
    { icon: "pilah_sampah.materi.circleLeaf", label: "Lingkungan", desc: "Tetap bersih untuk generasi mendatang" },
    { icon: "pilah_sampah.materi.circleTrash", label: "Tempat Sampah", desc: "Dikelola sesuai jenisnya" },
];

export const PILAH_LEARNING_GOALS: string[] = [
    "Mengenali jenis sampah di kapal",
    "Melakukan pemilahan sampah",
    "Memahami fungsi peralatan pengelolaan sampah",
    "Menentukan penanganan sampah yang tepat",
];

/** Step 2 — waste categories. `icon` is the preloaded texture key for the
 * category's bin illustration (assets/pilah_sampah/materi/trash-*.png);
 * categories without one yet fall back to an empty placeholder box. */
export interface PilahWasteCategory {
    name: string;
    desc: string;
    icon?: string;
}

export const PILAH_WASTE_CATEGORIES: PilahWasteCategory[] = [
    { name: "Sisa Makanan", desc: "Nasi, sayur, buah, dan sisa bahan makanan.", icon: "pilah_sampah.materi.trashFoodwaste" },
    { name: "Plastik", desc: "Botol plastik, kantong plastik, kemasan, dan tali sintetis.", icon: "pilah_sampah.materi.trashPlastic" },
    { name: "Kertas / Karton", desc: "Kertas, kardus, dan kemasan berbahan kertas.", icon: "pilah_sampah.materi.trashPaper" },
    { name: "Logam", desc: "Kaleng, besi, aluminium, dan peralatan logam.", icon: "pilah_sampah.materi.trashLogam" },
    { name: "Kaca", desc: "Botol kaca, pecahan kaca, dan wadah kaca.", icon: "pilah_sampah.materi.trashGlass" },
    { name: "Minyak Goreng", desc: "Minyak bekas dari kegiatan dapur.", icon: "pilah_sampah.materi.trashOil" },
    { name: "Sampah Berbahaya / Lainnya", desc: "Baterai, lampu, elektronik, tali, jaring, dan residu lainnya.", icon: "pilah_sampah.materi.trashDanger" },
];

export const PILAH_SORTING_PRINCIPLES: string[] = [
    "Pisahkan sampah sejak dari sumber.",
    "Jangan mencampurkan sampah berbeda jenis.",
    "Gunakan wadah sesuai kategori.",
    "Beri identitas pada tempat penyimpanan.",
];

/** Generic "info card" shape reused by steps 3, 4 and 5. */
export interface PilahInfoCard {
    title: string;
    body: string;
}

export const PILAH_INCINERATOR_CARDS: PilahInfoCard[] = [
    { title: "FUNGSI UTAMA", body: "Membakar limbah yang diizinkan secara terkendali untuk mengurangi volume sampah dan mencegah penumpukan di kapal." },
    { title: "PENGGUNAAN", body: "Masukkan hanya limbah yang diizinkan, sesuai kapasitas alat, lalu operasikan mengikuti prosedur dan manual kapal." },
    { title: "PERHATIAN", body: "Jangan membakar plastik, bahan berbahaya, atau limbah terlarang. Pastikan suhu dan ventilasi aman selama proses." },
];

export const PILAH_COMMINUTOR_CARDS: PilahInfoCard[] = [
    { title: "FUNGSI UTAMA", body: "Menghancurkan sampah makanan menjadi bagian yang lebih kecil." },
    { title: "HASIL PROSES", body: "Ukuran sampah menjadi lebih kecil sehingga memudahkan proses pengelolaan berikutnya." },
    { title: "CATATAN", body: "Penggunaan Comminutor tetap harus mengikuti prosedur dan ketentuan yang berlaku." },
];

export const PILAH_STORAGE_CARDS: PilahInfoCard[] = [
    { title: "FUNGSI UTAMA", body: "Menyimpan sampah sementara sebelum pengolahan atau penyerahan." },
    { title: "PENATAAN", body: "Sampah dipisahkan berdasarkan kategori dan ditempatkan pada wadah yang sesuai." },
    { title: "KEAMANAN", body: "Area penyimpanan harus tertata, bersih, aman, dan tidak menyebabkan pencemaran." },
    { title: "PENCATATAN", body: "Pengelolaan dan penyerahan sampah dilakukan sesuai prosedur kapal." },
];

/** Step 6 — the 5-node horizontal flow (icon placeholder + number + label + description). */
export interface PilahFlowStep {
    number: string;
    label: string;
    desc: string;
}

export const PILAH_MANAGEMENT_FLOW: PilahFlowStep[] = [
    { number: "01", label: "PEMILAHAN", desc: "Pisahkan berdasarkan jenis" },
    { number: "02", label: "PENGOLAHAN", desc: "Gunakan peralatan sesuai kebutuhan" },
    { number: "03", label: "PENYIMPANAN", desc: "Simpan pada area yang sesuai" },
    { number: "04", label: "PENCATATAN", desc: "Catat proses pengelolaan" },
    { number: "05", label: "PENYERAHAN", desc: "Serahkan ke fasilitas penerimaan" },
];

/** Step 7 — closing checklist. */
export const PILAH_SUMMARY_POINTS: string[] = [
    "Kenali jenis sampah.",
    "Pisahkan sampah sejak dari sumber.",
    "Gunakan Incinerator dan Comminutor sesuai fungsi.",
    "Simpan sampah pada Bak/Gudang Sampah.",
    "Lakukan pencatatan dan penyerahan sesuai prosedur.",
    "Patuhi ketentuan MARPOL Annex V.",
];
