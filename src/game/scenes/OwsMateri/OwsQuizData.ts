export interface OwsQuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    pembahasan: string;
}

export const OWS_QUIZ_QUESTIONS: OwsQuizQuestion[] = [
    {
        question:
            "Berdasarkan MARPOL Annex I, berapa kadar maksimum kandungan minyak (Oil Content) yang diizinkan pada air buangan got (bilge water) yang dibuang ke laut?",
        options: [
            "15 PPM (part per million)",
            "50 PPM (part per million)",
            "100 PPM (part per million)",
            "Tidak ada batasan selama menggunakan OWS",
        ],
        correctIndex: 0,
        pembahasan:
            "MARPOL Annex I mensyaratkan air got yang dibuang ke laut memiliki kandungan minyak di bawah 15 PPM — inilah alasan Oil Content Monitor (OCM) pada OWS harus menunjukkan angka di bawah 15 PPM sebelum katup buang boleh dibuka.",
    },
    {
        question: "Apa fungsi utama Oil Content Monitor (OCM) pada sistem Oily Water Separator (OWS)?",
        options: [
            "Memantau kadar minyak pada air buangan secara terus-menerus dan menghentikan pembuangan otomatis jika melebihi batas aman",
            "Mengukur kecepatan aliran air laut di sekitar kapal",
            "Mencatat jumlah bahan bakar yang tersisa di tangki",
            "Mengatur tekanan udara di ruang mesin",
        ],
        correctIndex: 0,
        pembahasan:
            "OCM adalah sensor pemantau yang membaca kadar minyak dalam air secara real-time. Jika kadar minyak melebihi ambang batas (15 PPM), OCM akan memberi sinyal untuk menutup katup buang overboard secara otomatis, mencegah pencemaran.",
    },
    {
        question:
            "Mengapa pipa/katup bypass pada sistem OWS sangat dilarang digunakan untuk membuang air got langsung ke laut tanpa melalui separator?",
        options: [
            "Karena membuang air got yang belum tersaring melanggar MARPOL Annex I dan mencemari laut dengan kadar minyak tinggi",
            "Karena katup bypass hanya bisa digunakan saat kapal berlabuh",
            "Karena katup bypass akan merusak mesin OWS jika dibuka",
            "Karena katup bypass hanya berfungsi untuk mengisi air tawar",
        ],
        correctIndex: 0,
        pembahasan:
            "Pipa bypass yang melewati OWS/OCM (sering disebut \"magic pipe\" dalam kasus pelanggaran nyata) adalah salah satu bentuk pelanggaran MARPOL paling serius, karena air got yang belum disaring bisa mengandung kadar minyak jauh di atas batas aman dan langsung mencemari laut.",
    },
    {
        question: "Setiap kegiatan pembuangan atau pemindahan minyak/air got di kapal wajib dicatat pada dokumen apa?",
        options: [
            "Oil Record Book (ORB) Bagian I",
            "Cargo Manifest",
            "Log Book Anjungan saja",
            "Sertifikat Keselamatan Kapal",
        ],
        correctIndex: 0,
        pembahasan:
            "Oil Record Book (ORB) Bagian I mencatat seluruh kegiatan terkait ruang mesin, termasuk pengoperasian OWS dan pembuangan air got, sebagai bukti kepatuhan terhadap MARPOL Annex I yang dapat diperiksa oleh otoritas pelabuhan (Port State Control).",
    },
    {
        question:
            "Apa yang seharusnya dilakukan operator jika OCM menunjukkan kadar minyak masih di atas 15 PPM saat proses filtrasi berlangsung?",
        options: [
            "Menjaga katup buang (overboard) tetap tertutup dan melanjutkan filtrasi hingga kadar minyak turun di bawah 15 PPM",
            "Membuka katup buang sekarang juga agar proses lebih cepat selesai",
            "Membuka katup bypass agar air langsung terbuang",
            "Mematikan seluruh sistem dan mengabaikan pembacaan OCM",
        ],
        correctIndex: 0,
        pembahasan:
            "Selama OCM masih membaca kadar minyak di atas ambang batas aman, katup buang ke laut harus tetap tertutup. Membuka katup sebelum kadar minyak turun di bawah 15 PPM sama saja dengan membuang air tercemar ke laut — pelanggaran MARPOL Annex I.",
    },
];
