export interface SopepInfoCard {
    heading: string;
    headingIcon: string;
    /** Either a single paragraph (`body`) or a numbered/bulleted list (`items`) — never both. */
    body?: string;
    items?: string[];
    numbered?: boolean;
    accent: number;
    accentHex: string;
    bg: number;
}

export type SopepIllustrationKey = "administrasi" | "dokumen" | "pelaporan" | "pencatatan";

export interface SopepLesson {
    id: number;
    title: string;
    description: string;
    infoCards: SopepInfoCard[];
    illustration: SopepIllustrationKey;
}

const BLUE = 0x2f68d8;
const BLUE_HEX = "#2f68d8";
const SKY_BG = 0xeaf3ff;
const GREEN = 0x1f8d52;
const GREEN_HEX = "#1f8d52";
const GREEN_BG = 0xe4f7ec;
const AMBER = 0xb5651d;
const AMBER_HEX = "#b5651d";
const AMBER_BG = 0xfdf3e7;

export const SOPEP_LESSONS: SopepLesson[] = [
    {
        id: 1,
        title: "Administrasi SOPEP",
        description:
            "Administrasi SOPEP mencakup seluruh dokumen, catatan, dan sistem pelaporan yang wajib tersedia dan terpelihara di kapal untuk memastikan kesiapan dalam menghadapi pencemaran minyak di laut.",
        infoCards: [
            {
                heading: "Apa itu SOPEP?",
                headingIcon: "ℹ️",
                body: "SOPEP (Shipboard Oil Pollution Emergency Plan) adalah rencana darurat di atas kapal untuk mencegah, meminimalkan, dan menanggulangi pencemaran minyak di laut yang disebabkan oleh operasi kapal atau insiden.",
                accent: BLUE,
                accentHex: BLUE_HEX,
                bg: SKY_BG,
            },
        ],
        illustration: "administrasi",
    },
    {
        id: 2,
        title: "Dokumen SOPEP",
        description:
            "Setiap kapal wajib memiliki dokumen SOPEP yang disusun sesuai dengan ketentuan yang berlaku. Dokumen ini berisi prosedur, tanggung jawab, dan tindakan penanggulangan ketika terjadi pencemaran minyak di laut.",
        infoCards: [
            {
                heading: "Dokumen SOPEP umumnya memuat:",
                headingIcon: "📄",
                items: [
                    "Rencana tanggap darurat (Emergency Procedures)",
                    "Daftar kontak darurat",
                    "Peralatan penanggulangan yang tersedia di kapal",
                    "Prosedur pelaporan",
                    "Latihan dan drill",
                ],
                numbered: true,
                accent: BLUE,
                accentHex: BLUE_HEX,
                bg: SKY_BG,
            },
        ],
        illustration: "dokumen",
    },
    {
        id: 3,
        title: "Sistem Pelaporan",
        description:
            "Administrasi SOPEP mencakup sistem pelaporan yang jelas, cepat, dan sesuai dengan prosedur yang berlaku. Pelaporan dilakukan kepada pihak atau otoritas yang berwenang apabila terjadi atau berpotensi terjadi pencemaran minyak di laut.",
        infoCards: [
            {
                heading: "Hal-hal yang harus dilaporkan:",
                headingIcon: "📢",
                items: [
                    "Waktu, posisi, dan jenis kejadian",
                    "Jenis dan perkiraan jumlah minyak yang tumpah",
                    "Tindakan yang telah dilakukan",
                    "Bantuan yang dibutuhkan jika ada",
                    "Informasi lanjutan sesuai permintaan otoritas",
                ],
                numbered: true,
                accent: BLUE,
                accentHex: BLUE_HEX,
                bg: SKY_BG,
            },
        ],
        illustration: "pelaporan",
    },
    {
        id: 4,
        title: "Pencatatan dan Review",
        description:
            "Seluruh kegiatan terkait pencegahan dan penanggulangan pencemaran minyak harus dicatat dengan baik. Administrasi SOPEP juga mencakup evaluasi dan review secara berkala untuk memastikan sistem tetap efektif dan sesuai dengan ketentuan yang berlaku.",
        infoCards: [
            {
                heading: "Hal yang harus dicatat:",
                headingIcon: "✅",
                items: [
                    "Latihan dan drill yang dilakukan",
                    "Inspeksi dan pemeliharaan peralatan",
                    "Setiap kejadian pencemaran",
                    "Tindakan perbaikan dan rekomendasi",
                ],
                numbered: true,
                accent: GREEN,
                accentHex: GREEN_HEX,
                bg: GREEN_BG,
            },
            {
                heading: "Review Berkala:",
                headingIcon: "🔄",
                items: [
                    "Dilakukan secara rutin oleh perusahaan",
                    "Memastikan kesesuaian dengan ketentuan",
                    "Memperbarui kontak, prosedur, dan peralatan",
                    "Melibatkan awak kapal",
                ],
                numbered: true,
                accent: AMBER,
                accentHex: AMBER_HEX,
                bg: AMBER_BG,
            },
        ],
        illustration: "pencatatan",
    },
];

export const SOPEP_TRANSITION_CHECKLIST = ["Dokumen SOPEP", "Sistem Pelaporan", "Pencatatan", "Review Berkala"];
