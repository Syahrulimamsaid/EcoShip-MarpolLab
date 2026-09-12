# EcoShip-MarpolLab

**EcoShip-MarpolLab** adalah media pembelajaran interaktif berbasis simulasi yang dirancang untuk membantu taruna memahami struktur kapal dan prinsip stabilitas secara visual, praktis, dan menyenangkan — dibangun dengan [Phaser](https://phaser.io) (WebGL/Canvas game engine) di dalam aplikasi React + TypeScript.

> "Belajar Nautika, Lebih Dekat dengan Dunia Nyata"

| | |
|---|---|
| **Nama Aplikasi** | EcoShip-MarpolLab |
| **Target Pengguna** | Taruna SMK Nautika Kapal Niaga |
| **Jenis** | Media Pembelajaran Interaktif |
| **Pengembang** | Sayembara Digital SMK |

## Modul & Fitur

- **Anatomi Struktur** — eksplorasi interaktif bagian-bagian struktur dasar berganda kapal (gading-gading, wrang, tank top, dsb.) lengkap dengan spesifikasi material dan fungsinya, ditutup dengan kuis SOP darurat kebocoran (5 soal, harus benar semua untuk membuka modul berikutnya).
- **Simulator Stabilitas** — simulasi drag-and-drop penataan muatan kapal untuk menyeimbangkan momen kiri/kanan dan menjaga stabilitas (termasuk indikator titik berat vs. metasentrik), tiga studi kasus berurutan.
- **Hasil & Umpan Balik** — kuis evaluasi akhir (10 soal, urutan soal & pilihan jawaban diacak setiap dibuka) yang merangkum seluruh materi dari kedua modul di atas, dengan lencana pencapaian setelah menyelesaikannya dengan sempurna.
- **Tentang** — halaman informasi aplikasi: tujuan pembelajaran, ringkasan fitur, dan sumber aset.

Progres modul disimpan di cookie browser (lihat `src/game/ModuleProgress.ts`) sehingga modul berikutnya tetap terbuka meski halaman di-refresh.

## Teknologi

- [Phaser 4](https://github.com/phaserjs/phaser) — game engine
- [React 19](https://github.com/facebook/react) + [TypeScript 5](https://github.com/microsoft/TypeScript)
- [Vite 6](https://github.com/vitejs/vite) — dev server & bundler

## Menjalankan Proyek

Membutuhkan [Node.js](https://nodejs.org).

```bash
npm install       # pasang dependensi
npm run dev       # jalankan dev server (default http://localhost:8080)
npm run build     # build produksi ke folder dist/
```

| Command | Keterangan |
|---------|-------------|
| `npm install` | Memasang dependensi proyek |
| `npm run dev` | Menjalankan dev server dengan hot-reload |
| `npm run build` | Membuat build produksi di folder `dist` |
| `npm run dev-nolog` / `npm run build-nolog` | Sama seperti di atas, tanpa mengirim data anonim ke Phaser Studio (lihat `log.js`) |

## Struktur Proyek

| Path | Keterangan |
|------|-------------|
| `src/main.tsx`, `src/App.tsx`, `src/PhaserGame.tsx` | Bootstrap React & jembatan React ⇄ Phaser |
| `src/game/main.ts` | Konfigurasi game Phaser & daftar scene |
| `src/game/EventBus.ts` | Event bus untuk komunikasi React ⇄ Phaser |
| `src/game/ModuleProgress.ts` | Status buka/kunci modul (disimpan di cookie) |
| `src/game/BadgeState.ts` | Status lencana pencapaian (in-memory, per sesi) |
| `src/game/BgmManager.ts` / `src/game/SfxManager.ts` | Musik latar & efek suara global |
| `src/game/scenes/MainMenu` | Menu utama & navigasi antar modul |
| `src/game/scenes/AnatomiStruktur` | Modul Anatomi Struktur + kuis SOP darurat kebocoran |
| `src/game/scenes/SimulatorStabilitas` | Modul Simulator Stabilitas (drag-and-drop muatan) |
| `src/game/scenes/HasilUmpanBalik` | Kuis evaluasi akhir |
| `src/game/scenes/Tentang` | Halaman informasi aplikasi |
| `src/component/` | Komponen UI Phaser yang dipakai bersama lintas scene (header, panel, tombol, dll.) |
| `public/assets/` | Aset statis (gambar, audio) yang dimuat lewat `Boot.ts` |

## Sumber Aset

| Kategori | Sumber |
|---|---|
| Ilustrasi & Background | Custom Illustration — Sayembara Digital SMK |
| Karakter | Custom Illustration — Sayembara Digital SMK |
| Ikon & UI Element | Custom Design — Sayembara Digital SMK |
| Font | Plus Jakarta Sans (Google Fonts) |
| Audio | Mixkit (Free License) |
| Referensi Materi | IMO, BKI, dan sumber pembelajaran maritim terbuka |

---

Dibangun di atas [template React + TypeScript resmi Phaser](https://github.com/phaserjs/template-react-ts).
