import { QuizConfig } from "../Quiz/QuizScene";

/**
 * The cumulative final-evaluation quiz launched from the Evaluasi menu — one
 * question set spanning the three modules: Simulator OWS (MARPOL Annex I),
 * Pemilahan Sampah (MARPOL Annex V) and Administrasi SOPEP, so it reads as a
 * recap of the whole course. All 10 must be correct to claim the badge and see
 * the completion popup (see QuizScene.renderResult()'s perfectScoreMessage
 * handling). Options are shuffled at runtime, so the correct answer is
 * always listed first here.
 */
export const FINAL_EVALUATION_QUIZ: QuizConfig = {
    title: "KUIS EVALUASI AKHIR",
    passScore: 10,
    badgeId: "master-of-maritime-safety",
    badgeName: "Master of Maritime Safety",
    perfectScoreMessage: "Selamat, Anda berhasil menyelesaikan materi dan kuis!",
    questions: [
        // ── Simulator OWS (MARPOL Annex I) ──
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
            question: "Setiap kegiatan pembuangan atau pemindahan minyak/air got di kamar mesin wajib dicatat pada dokumen apa?",
            options: [
                "Oil Record Book (ORB) Bagian I",
                "Cargo Manifest",
                "Log Book Anjungan saja",
                "Sertifikat Keselamatan Kapal",
            ],
            correctIndex: 0,
        },
        // ── Pemilahan Sampah (MARPOL Annex V) ──
        {
            question: "Apa yang diatur oleh MARPOL Annex V?",
            options: [
                "Pencegahan pencemaran laut oleh sampah dari kapal",
                "Pencegahan pencemaran laut oleh minyak dari kapal",
                "Pencegahan pencemaran udara oleh gas buang kapal",
                "Pengendalian air ballast dan sedimen kapal",
            ],
            correctIndex: 0,
        },
        {
            question: "Mengapa sampah di kapal harus dipilah berdasarkan kategori dan ditempatkan pada wadah yang sesuai?",
            options: [
                "Agar pengelolaan, penyimpanan, dan penyerahan sampah dapat dilakukan dengan aman dan sesuai prosedur",
                "Agar seluruh sampah dapat dibuang langsung ke laut",
                "Agar volume sampah bertambah sebelum diolah",
                "Karena pemilahan hanya diwajibkan saat kapal berlabuh",
            ],
            correctIndex: 0,
        },
        {
            question: "Manakah yang TIDAK boleh dimasukkan ke dalam incinerator kapal?",
            options: [
                "Plastik, bahan berbahaya, atau limbah terlarang",
                "Limbah yang diizinkan sesuai manual kapal",
                "Sampah kertas yang sudah dipilah",
                "Limbah yang diizinkan dalam batas kapasitas alat",
            ],
            correctIndex: 0,
        },
        // ── Administrasi SOPEP ──
        {
            question: "Apa yang dimaksud dengan SOPEP (Shipboard Oil Pollution Emergency Plan)?",
            options: [
                "Rencana darurat di atas kapal untuk mencegah, meminimalkan, dan menanggulangi pencemaran minyak di laut",
                "Dokumen izin berlayar yang diterbitkan oleh pelabuhan",
                "Catatan harian kegiatan pemuatan barang di kapal",
                "Prosedur pemeliharaan mesin utama kapal",
            ],
            correctIndex: 0,
        },
        {
            question: "Mengapa saluran pembuangan (scupper) di deck harus ditutup saat terjadi tumpahan minyak?",
            options: [
                "Agar minyak tidak mengalir ke laut melalui saluran pembuangan",
                "Agar minyak lebih cepat mengering di deck",
                "Agar air hujan dapat masuk ke area tumpahan",
                "Karena scupper hanya berfungsi saat kapal berlayar",
            ],
            correctIndex: 0,
        },
        {
            question: "Sebelum memasang oil boom dan menyerap tumpahan di deck, tindakan apa yang harus dilakukan lebih dulu?",
            options: [
                "Mengendalikan sumber kebocoran dan mengamankan area kejadian",
                "Membuang seluruh sisa minyak langsung ke laut",
                "Menunggu tumpahan menyebar hingga mengering",
                "Menyimpan laporan dan menonaktifkan alarm kapal",
            ],
            correctIndex: 0,
        },
        {
            question: "Dokumentasi akhir penanganan tumpahan minyak dalam SOPEP sebaiknya memuat apa?",
            options: [
                "Formulir laporan, log kegiatan penanganan, daftar peralatan yang digunakan, dan foto dokumentasi",
                "Hanya foto kondisi kapal setelah berlabuh",
                "Hanya nama petugas yang bertugas di anjungan",
                "Tidak perlu dokumentasi jika tumpahan sudah dibersihkan",
            ],
            correctIndex: 0,
        },
    ],
};
