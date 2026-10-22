# Roadmap

## Pemeriksaan penguji (22 Okt 2026)
- [x] Perbaiki sesi membaca, pilihan satu/beberapa sesi, dan fase timer penguji.
- [x] Uji konfirmasi pengiriman, pengiriman ulang, caption, dan tampilan properti: 21 tes lolos.
- [ ] Verifikasi penguji dan PC dengan ujian sungguhan — akses login pengujian tidak tersedia pada Supabase eksternal.

## Selesai (14 Okt 2026)
- [x] Deploy edge functions (ingest-case, case-admin, dll) ke backend Lovable Cloud baru
- [x] Bangun ulang tabel database di backend Cloud baru (11 tabel dari supabase/migrations)
- [x] Salin data soal lama (108 clinical_cases, 220 exam_sequence_items) dari backend lama — rujukan created_by/reviewed_by/session_id dikosongkan karena pengguna lama tidak ada di backend baru
- [x] Secret tersedia di Cloud: OPENAI_API_KEY, CASE_INGEST_API_KEY

## Tertahan dari pekerjaan sebelumnya
- [x] Keputusan backend sudah selesai: tetap Supabase asli nowebjmwrtkspvdwgevj, bukan Cloud.
- [ ] Restore soal terhapus — tunggu jawaban soal mana
- [ ] Rubrik 53 butir athletes heart ke soal aktif — butuh CASE_ADMIN_API_KEY dikenali case-admin
- [ ] Aset gambar athletes heart (5 gambar) belum terpasang ke soal
- [x] Deploy ingest-case dan case-admin ke Supabase asli sudah diselesaikan pada pekerjaan sebelumnya.
