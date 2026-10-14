# Sistem Soal Hemat Kredit — Satu Template untuk Semua Soal Baru

## Masalah
Setiap soal baru saat ini dibuat sebagai halaman frontend baru (HocmPreview, ConstrictivePreview, DiastolicPreview) — masing-masing ratusan baris kode, mahal kredit dan lambat.

## Solusi: soal baru = 1 file data kecil, bukan halaman baru

### 1. Satu template generik `SoalPreviewPage`
- Komponen tunggal yang merender: skenario, instruksi, data pemeriksaan, properti soal, kunci jawaban word-by-word, dan tabel daftar tilik ↔ word-by-word.
- Persis standar soal yang sudah benar hari ini (panel admin, estimasi durasi bicara, tilik 2 poin, tanda kritis).

### 2. Satu helper bersama `importToPrereview(draft)`
- Logika "Masukkan ke Pre-review" (cek duplikat judul → insert `clinical_cases` status `prereview` + upsert `case_answer_keys`) diekstrak ke satu fungsi bersama, dipakai semua soal.
- Halaman lama (HOCM, Constrictive, Diastolik) direfaktor memakai helper ini — tidak ada duplikasi lagi.

### 3. Format data soal standar (1 file per soal, ~60–100 baris)
```text
src/data/soal/diastolik.ts   → export const soal = { judul, skenario, instruksi[], dataPemeriksaan[], properti[], jawabanLengkap, tilik: [{ tilik, wordByWord, poin, kritis }] }
```
- Route dinamis `/preview-soal/:slug` membaca file data sesuai slug — tidak perlu route/halaman baru per soal.

### 4. Alur kerja baru setiap Anda minta soal
1. Saya tulis 1 file data kecil (murah, cepat).
2. Preview otomatis tampil di `/preview-soal/<slug>`.
3. Sekali klik masuk `/prereview` untuk Anda edit, lalu Submit & Ingest.

## Yang berubah
- `src/pages/admin/SoalPreviewPage.tsx` (baru, template generik)
- `src/lib/prereviewImport.ts` (baru, helper bersama)
- `src/data/soal/*.ts` (data HOCM, Constrictive, Diastolik dipindah ke sini)
- `src/App.tsx` (route dinamis `/preview-soal/:slug`, hapus 3 route statis)
- Hapus `HocmPreview.tsx`, `ConstrictivePreview.tsx`, `DiastolicPreview.tsx` setelah datanya pindah

## Hasil
Soal-soal berikutnya cukup 1 file data — jauh lebih sedikit kredit per soal, standar daftar tilik/word-by-word/properti tetap sama.
