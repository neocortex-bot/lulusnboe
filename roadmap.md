# Roadmap

## Pemeriksaan penguji (22 Okt 2026)
- [ ] Perbaiki sesi membaca, pilihan satu/beberapa sesi, dan fase timer penguji.
- [ ] Verifikasi pengiriman properti, caption, dan tampilan media di layar peserta.
- [ ] Jalankan tes regresi; pemeriksaan login langsung terhalang Supabase external_unmanaged.

## Selesai (14 Okt 2026)
- [x] Deploy edge functions (ingest-case, case-admin, dll) ke backend Lovable Cloud baru
- [x] Bangun ulang tabel database di backend Cloud baru (11 tabel dari supabase/migrations)
- [x] Salin data soal lama (108 clinical_cases, 220 exam_sequence_items) dari backend lama — rujukan created_by/reviewed_by/session_id dikosongkan karena pengguna lama tidak ada di backend baru
- [x] Secret tersedia di Cloud: OPENAI_API_KEY, CASE_INGEST_API_KEY

## Tertahan menunggu keputusan user
- [ ] Keputusan: pakai backend Cloud (dqhnbxnopuwaarlyncbs) sebagai satu-satunya — aplikasi + ingest-case + case-admin; backend lama (nowebjmwrtkspvdwgevj) tidak terhubung ke Lovable dan tidak bisa diupdate dari sini
- [ ] Restore soal terhapus — tunggu jawaban soal mana
- [ ] Rubrik 53 butir athletes heart ke soal aktif — butuh CASE_ADMIN_API_KEY dikenali case-admin
- [ ] Aset gambar athletes heart (5 gambar) belum terpasang ke soal
- [ ] Deploy edge function baru ke backend lama via Supabase CLI jika user masih ingin rubrik fleksibel di sana
