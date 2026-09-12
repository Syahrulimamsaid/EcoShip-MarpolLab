export interface StabilitasQuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    pembahasan: string;
}

export const STABILITAS_QUIZ_QUESTIONS: StabilitasQuizQuestion[] = [
    {
        question:
            "Sebuah kapal memiliki nilai KM sebesar 7,80 meter dan KG sebesar 6,50 meter. Berapakah nilai Tinggi Metasentris (GM) kapal tersebut, dan bagaimana kondisi stabilitasnya?",
        options: [
            "GM = -1,30 meter (Stabilitas Negatif)",
            "GM = 1,30 meter (Stabilitas Positif)",
            "GM = 14,30 meter (Stabilitas Kaku)",
            "GM = 0,00 meter (Stabilitas Netral)",
        ],
        correctIndex: 1,
        pembahasan: "GM = KM − KG\nGM = 7,80 − 6,50\nGM = 1,30 meter\n\nKarena GM > 0, kapal memiliki Stabilitas Positif.",
    },
    {
        question:
            "Apabila muatan berat ditaruh terlalu banyak di palka paling bawah (dekat lunas), maka posisi titik G akan turun. Dampak utama kondisi ini terhadap karakteristik oleng kapal adalah...",
        options: [
            "Kapal menjadi langsar (tender) dan olengannya sangat lambat",
            "Kapal memiliki GM negatif dan mudah terbalik",
            "Kapal menjadi kaku (stiff) dan olengannya sangat cepat/menyentak",
            "Kapal memiliki GM = 0 dan berada dalam keseimbangan netral",
        ],
        correctIndex: 2,
        pembahasan:
            "Memindahkan muatan berat ke bawah menurunkan titik G sehingga nilai GM menjadi lebih besar.\n\nKapal dengan GM besar memiliki karakter kaku (stiff vessel) dan cenderung memiliki periode oleng lebih pendek / gerakan oleng yang cepat dan keras.",
    },
    {
        question: "Titik pada kapal yang merupakan pusat gaya apung air ke atas dan berada pada pusat volume bagian kapal yang terbenam adalah...",
        options: ["Titik K (Keel)", "Titik G (Center of Gravity)", "Titik M (Metacenter)", "Titik B (Center of Buoyancy)"],
        correctIndex: 3,
        pembahasan: "Titik B (Center of Buoyancy) merupakan pusat volume bagian kapal yang terbenam dan menjadi titik kerja resultan gaya apung ke atas.",
    },
    {
        question: "Suatu kapal berada dalam kondisi Stabilitas Negatif / Labil apabila...",
        options: [
            "Titik M berada di atas titik G (GM > 0)",
            "Titik M berada di bawah titik G (GM < 0)",
            "Titik M berimpit dengan titik G (GM = 0)",
            "Titik B berimpit dengan titik K",
        ],
        correctIndex: 1,
        pembahasan:
            "Stabilitas negatif terjadi ketika titik M berada di bawah G sehingga:\nGM < 0\n\nDalam kondisi ini kapal tidak menghasilkan kecenderungan penegak yang normal ketika mengalami kemiringan kecil dan berisiko menambah kemiringannya.",
    },
    {
        question:
            "Fenomena Free Surface Effect yang terjadi akibat adanya tangki cairan yang terisi sebagian (slack tank) akan mengakibatkan...",
        options: [
            "Penurunan titik G secara maya sehingga memperbesar nilai GM",
            "Kenaikan titik G secara maya sehingga mengurangi nilai GM",
            "Penurunan titik K sehingga kapal bertambah sarat",
            "Kenaikan titik M secara permanen",
        ],
        correctIndex: 1,
        pembahasan:
            "Pergerakan cairan bebas pada slack tank menghasilkan efek yang dapat direpresentasikan sebagai kenaikan semu titik G menjadi G₁.\n\nAkibatnya terjadi virtual loss of GM:\nGM ↓\n\nsehingga stabilitas kapal berkurang.",
    },
];
