# Roadmap

## Akses edit semua admin (6 Nov 2026)
- [x] Semua admin dapat mengedit soal, kunci jawaban, rubrik, dan properti/media; izin hapus soal tetap terpisah.
- [ ] Verifikasi simpan dengan admin bukan pemilik — akses login pengujian Supabase eksternal tidak tersedia.

## Sinkronisasi rubrik (4 Nov 2026)
- [x] Perbaikan: butir yang teksnya diedit tetap memakai nilai lama; klik nilai berurutan tidak saling menimpa.
- [ ] 26 hasil ujian terdahulu kehilangan nilai butir saat sinkronisasi pertama — tidak ada cadangan database; menunggu keputusan pengguna untuk evaluasi ulang AI.
- [x] Trigger terpasang untuk menghitung ulang hasil saat poin, critical, atau daftar butir berubah.
- [x] Sinkronkan seluruh 161 laporan terdahulu, termasuk tes terakhir; pemeriksaan menunjukkan 0 laporan tidak sinkron.
- [x] 16 tes regresi dan 6 pemeriksaan fungsi Supabase lolos; halaman berhasil dikompilasi.
- [ ] Verifikasi penyimpanan rubrik sampai hasil tampil di halaman sesi dengan login admin — akses pengujian login Supabase eksternal tidak tersedia.

## Modal informasi peserta (25 Okt 2026)
- [x] Modal bersama untuk ujian dan latihan mandiri, hitung mundur 10 detik, klik luar menutup, klik dalam tetap terbuka; interaksi browser terverifikasi dengan data uji.
- [x] Sinkronkan penutupan dengan status penguji dan uji regresi: 24 tes lolos; ujian sungguhan tetap belum terverifikasi karena akses Supabase eksternal.

## Latihan mandiri (24 Okt 2026)
- [x] Checkbox deploy "Tampilkan Panel Properti di Layar" + kolom show_examiner_panel + layout 2/3 soal, 1/3 panel properti digital yang dibuka peserta sendiri.
- [ ] Verifikasi tampilan panel di PC station dengan sesi sungguhan.

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
