# Fitur Persiapan Skill Station (/persiapan)

## Yang akan dibuat
1. **Halaman baru `/persiapan`**, bisa dibuka semua peserta yang sudah login.
   - Tabel station persiapan: nomor, judul, divisi (Echo, Intervensi, Vaskular, IACC, Pediatri, Aritmia, Rehab & Prevensi, Karklin), label "Invasif / Risiko tinggi" bila ada.
   - Pencarian dan filter divisi.
   - Tiap baris punya tombol **"Mulai Ujian Persiapan"** yang langsung membuka /exam untuk station itu, tanpa scan QR.
   - Admin juga melihat tombol "Lihat Rubrik" dan "Edit" (membuka detail soal yang sudah ada). Peserta tidak pernah melihat rubrik atau jawaban.
2. **Isi awal: 48 kartu skill dari PDF PIKiR PADi** diimpor sebagai station persiapan.
   - Pertanyaan: "Lafalkan persiapan untuk melakukan {tindakan}." Tanpa vignette.
   - Rubrik mulai dari menyapa sampai berhenti sebelum prosedur: perkenalan dan identitas, P (prosedur), I (indikasi), Ki (kontraindikasi), R (risiko), minta izin, P (posisi pasien), A (alat), Di (cuci tangan dan APD; untuk kartu invasif ditambah asepsis dan sarung tangan steril).
   - Tiap butir bernilai 1 atau 2 poin (dinilai 0-1-2). Butir "minta izin/verifikasi identitas" ditandai kritis, dan untuk kartu invasif juga butir "asepsis".
   - Word by word per butir diambil dari teks kartu.
3. **Waktu**: baca 10 detik, jawab 60 detik.
4. **Evaluasi sama persis dengan ujian penuh**: rekaman, transkripsi, penilaian AI, lalu hasilnya muncul di halaman session/hasil admin. Untuk peserta, hasilnya mengikuti pengaturan tampilkan-hasil yang sudah ada.
5. Di /admin, station persiapan punya tab sendiri ("Persiapan") supaya tidak tercampur dengan soal Oral Board atau Panel.

## Yang tidak berubah
- Alur ujian Oral Board/Panel, scan QR, rotasi sesi, dan penilaian lama tetap sama.
- Latihan persiapan tidak memerlukan izin ujian khusus. Ini hanya berlaku untuk station persiapan.

## Detail teknis
- `clinical_cases.exam_mode = 'preparation'` (tidak perlu tabel baru); `category` = divisi; `reading_time_seconds=10`, `time_limit_seconds=60`, `initial_prompt` kosong, `questions_text` = perintah lafalkan.
- RPC baru `start_preparation_practice(_case_id uuid)` (security definer, hanya `authenticated`, revoke dari anon/public): memeriksa `auth.uid()` dan kasus berstatus published dengan mode preparation, lalu membuat `exam_sessions` baru (token acak, `current_candidate_id = auth.uid()`, status siap) dan mengembalikan id sesi. Ada batas wajar agar tidak spam, misalnya satu sesi aktif per peserta per station.
- Klien: tombol Mulai memanggil RPC, lalu `navigate('/exam/<id>')`; ExamMobile, rekaman, dan `evaluate-exam` dipakai ulang tanpa perubahan logika.
- Impor 48 kartu: satu skrip insert ke `clinical_cases` dan `case_answer_keys` (rubrik privat dengan stable id dan jawaban word by word). Rubrik publik tanpa jawaban, sesuai aturan yang ada.
- Rute `/persiapan` di `App.tsx` dengan ProtectedRoute (login saja); halaman `src/pages/Persiapan.tsx` membaca ringkasan kasus (id, judul, kategori), bukan rubrik.
- `CaseManager`/`SessionManager`: tambah grup mode `preparation`; label mode di tabel dan arsip.
- Tes: RPC menolak anon dan kasus non-preparation; impor menghasilkan 48 kasus dengan semua butir ≤2 poin; tombol Mulai menuju /exam/:id.
