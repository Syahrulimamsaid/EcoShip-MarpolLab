import { QuizConfig } from "../Quiz/QuizScene";

/**
 * The cumulative final-evaluation quiz launched from Hasil & Umpan Balik —
 * one question set spanning both Simulator OWS (MARPOL Annex I, oil content
 * limits) and Simulator Stabilitas (moment/heel, distribusi muatan) so it
 * reads as a recap of the whole module, not just one part of it. All 10 must
 * be correct to claim the badge and see the completion popup (see
 * QuizScene.renderResult()'s perfectScoreMessage handling).
 */
export const FINAL_EVALUATION_QUIZ: QuizConfig = {
    title: "KUIS EVALUASI AKHIR",
    passScore: 10,
    badgeId: "master-of-maritime-safety",
    badgeName: "Master of Maritime Safety",
    perfectScoreMessage: "Selamat, Anda berhasil menyelesaikan materi dan kuis!",
    questions: [
        {
            question: "Berdasarkan MARPOL Annex I, berapa batas maksimum kandungan minyak yang boleh dibuang ke laut dari air got (bilge water) kapal?",
            options: [
                "15 PPM (part per million)",
                "50 PPM (part per million)",
                "100 PPM (part per million)",
                "Tidak ada batasan selama menggunakan OWS",
            ],
            correctIndex: 0,
        },
        {
            question: "Apa fungsi utama Oil Content Monitor (OCM) pada sistem Oily Water Separator (OWS)?",
            options: [
                "Memantau kadar minyak pada air buangan dan menghentikan pembuangan otomatis jika melebihi batas aman",
                "Mengukur kecepatan aliran air laut di sekitar kapal",
                "Mencatat jumlah bahan bakar yang tersisa di tangki",
                "Mengatur tekanan udara di ruang mesin",
            ],
            correctIndex: 0,
        },
        {
            question: "Mengapa katup/pipa bypass pada sistem OWS dilarang digunakan untuk membuang air got langsung ke laut?",
            options: [
                "Karena membuang air got yang belum tersaring melanggar MARPOL Annex I dan mencemari laut",
                "Karena katup bypass hanya boleh dibuka saat kapal berlabuh",
                "Karena katup bypass akan merusak mesin OWS jika dibuka",
                "Karena katup bypass hanya berfungsi untuk mengisi air tawar",
            ],
            correctIndex: 0,
        },
        {
            question: "Setiap kegiatan pembuangan atau pemindahan minyak/air got di kamar mesin wajib dicatat pada dokumen apa?",
            options: [
                "Oil Record Book (ORB) Bagian I",
                "Cargo Manifest",
                "Log Book Anjungan saja",
                "Sertifikat Keselamatan Kapal",
            ],
            correctIndex: 0,
        },
        {
            question: "Apa yang dimaksud dengan \"momen\" dalam simulasi distribusi muatan kapal?",
            options: [
                "Hasil kali berat muatan dengan jarak (lengan) muatan tersebut dari garis tengah kapal",
                "Total berat seluruh muatan di kapal",
                "Kecepatan kapal saat berlayar",
                "Waktu yang dibutuhkan untuk memuat barang",
            ],
            correctIndex: 0,
        },
        {
            question: "Apa akibat jika muatan yang berat ditempatkan hanya pada satu sisi kapal (kiri atau kanan)?",
            options: [
                "Kapal akan miring (heel) ke sisi yang lebih berat",
                "Kapal akan melaju lebih cepat",
                "Kapal menjadi lebih hemat bahan bakar",
                "Tidak ada efek terhadap kestabilan kapal",
            ],
            correctIndex: 0,
        },
        {
            question: "Bagaimana cara menyeimbangkan kembali kapal yang miring pada Simulator Stabilitas?",
            options: [
                "Memindahkan/menambah muatan ke sisi yang lebih ringan hingga momen kiri dan kanan seimbang",
                "Membuang seluruh muatan ke laut",
                "Menambah kecepatan mesin kapal",
                "Mengurangi jumlah awak kapal",
            ],
            correctIndex: 0,
        },
        {
            question: "Mengapa menumpuk muatan berat terlalu tinggi tetap berbahaya walau momen kiri-kanan sudah seimbang?",
            options: [
                "Karena menaikkan titik berat (G) kapal, mendekati titik metasentrik (M), sehingga mengurangi stabilitas",
                "Karena membuat kapal menjadi lebih ringan",
                "Karena mempercepat proses bongkar muat",
                "Tidak berpengaruh apapun terhadap kapal",
            ],
            correctIndex: 0,
        },
        {
            question: "Dari ketiga katup pada sistem OWS (Inlet, Outlet, Bypass), katup mana yang harus selalu tertutup selama proses filtrasi normal berlangsung?",
            options: [
                "Katup Bypass — membukanya membuang air got yang belum tersaring langsung ke laut",
                "Katup Inlet — agar air got tidak masuk ke separator",
                "Katup Outlet — agar air hasil filtrasi tidak pernah dibuang",
                "Ketiganya boleh dibuka bersamaan kapan saja",
            ],
            correctIndex: 0,
        },
        {
            question: "Apa yang harus dilakukan jika Oil Content Monitor (OCM) masih menunjukkan kadar minyak ≥ 15 PPM saat proses filtrasi berlangsung?",
            options: [
                "Menjaga katup buang (overboard) tetap tertutup dan melanjutkan filtrasi hingga kadar minyak turun di bawah 15 PPM",
                "Membuka katup buang sekarang juga agar prosesnya lebih cepat",
                "Membuka katup bypass agar air langsung terbuang",
                "Mematikan seluruh sistem dan mengabaikan pembacaan OCM",
            ],
            correctIndex: 0,
        },
    ],
};
