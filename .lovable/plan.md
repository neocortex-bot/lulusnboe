# Penguji (examiner) per soal + halaman /examiner realtime

## Tujuan
Penguji memegang "daftar pegangan" di HP: properti soal (hasil pemeriksaan yang tidak tertulis di soal) yang boleh diberikan saat peserta memintanya.

## Yang dibangun

1. **Pilih penguji saat deploy (opsional)**
   - Di form deploy sesi, tambah pilihan "Penguji" berisi daftar admin (nama/email). Boleh dikosongkan.
   - Satu penguji untuk satu kali deploy (berlaku untuk semua soal & PC di deploy itu). Penguji yang sama boleh di-assign ke beberapa deploy sekaligus.

2. **Halaman baru `/examiner` (HP penguji, wajib login admin)**
   - Daftar **sesi aktif** yang di-assign ke penguji tersebut: hanya sesi yang peserta sudah scan QR dan mulai (status baca/ujian). Tiap kartu: nama peserta, PC ke-, soal ke-X dari Y, fase (Membaca / Menjawab) + sisa waktu.
   - Bila hanya 1 sesi aktif → langsung terbuka. Bila >1 → penguji pilih salah satu; bisa pindah kapan saja. Ada titik/angka penanda bila sesi baru masuk.
   - Tampilan sesi terpilih: judul soal (hanya untuk penguji), skenario singkat, **Properti Soal** besar dan mudah dibaca (nama + nilai), tiap baris bisa ditandai "sudah diberikan" (hanya di HP penguji, tidak dinilai).
   - Semua realtime: sesi baru muncul sendiri, pindah otomatis ke soal berikutnya peserta yang sama, sesi selesai hilang dari daftar.
   - Peserta tidak pernah melihat properti; halaman ini tidak memengaruhi layar station maupun HP peserta.

3. **Keamanan**
   - Properti tetap di tabel kunci jawaban khusus admin. Hanya admin yang bisa membuka /examiner; penguji hanya melihat sesi yang di-assign kepadanya (master admin bisa lihat semua).

## Detail teknis
- Migrasi (dijalankan ke project nowebjmwrtkspvdwgevj via Management API, seperti fitur kategori): kolom `examiner_id uuid null` pada `exam_sessions` + indeks; ikut publikasi realtime (sudah ada untuk exam_sessions).
- `SessionManager.tsx`: select penguji (dari `user_roles` role admin + `profiles`), isi `examiner_id` pada insert `exam_sessions`.
- `src/pages/Examiner.tsx` + route `/examiner` dengan `ProtectedRoute requireAdmin`; query sesi `examiner_id = auth.uid()` dan status aktif, join `profiles` peserta, `exam_sequence_items` untuk nomor soal, `case_answer_keys.checklist_rubric.properties` untuk properti.
- Realtime: channel `postgres_changes` pada `exam_sessions` filter `examiner_id=eq.<uid>`; helper murni `pickActiveExaminerSessions()` di `src/lib/` + test (filter status aktif, auto-pilih bila 1, urutan).
- Tanda "sudah diberikan" disimpan lokal di state halaman (tanpa DB).

## Belum termasuk
- Penguji berbeda per soal dalam satu deploy, dan pencatatan properti yang diberikan ke laporan nilai — bisa ditambah kemudian.
