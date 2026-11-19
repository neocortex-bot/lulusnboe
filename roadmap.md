# Roadmap

## Tahap pertama optimasi dan properti digital pre-review (19 Nov 2026)
- [x] Perbaiki baca/editor/simpan properti digital privat dengan editor bersama; pertahankan Word by Word, ID, poin, dan critical; query kunci hanya untuk draft yang dimuat.
- [x] 197 tes lolos dan build OK; simpan/ingest data uji mempertahankan kartu digital, jawaban, ID, poin/critical dan properti fisik. SQL asli: 2/2/1 kartu serta 10/17/14 jawaban tetap utuh; ketiga soal sudah published, tidak muncul di prereview. Tidak mengubah data asli.
- [x] Pemilih deploy hanya memuat id/judul/mode/kategori published untuk mode terpilih, cache terpisah; tes pemilihan dan cache lolos. Ukuran JSON SQL ekuivalen seluruh 199 soal: 2.095.579 → 34.396 byte (~98,4% lebih kecil), bukan pengukuran RAM/jaringan browser.
- [ ] Verifikasi simpan dengan akun admin pada data asli — Supabase eksternal tidak menyediakan sesi pengujian; simpan/ingest lewat editor diverifikasi hanya dengan data uji.
- Tahap berikut setelah tahap pertama terverifikasi: ringkasan/paginasi daftar admin dan station, detail penguji, ketahanan antrean AI, lalu pengukuran beban nyata/iPhone; bukan perubahan penilaian.

## Perbaikan Word by Word pre-review (19 Nov 2026)
- [x] Baca jawaban dari case_answer_keys terlebih dahulu, dengan fallback soal lama; simpan jawaban hanya di tabel khusus admin.
- [x] 193 tes lolos termasuk editor serta simpan/ingest memakai data uji; build OK. SQL memverifikasi 17/17, 14/14, 10/10 jawaban privat dan nol key answer di clinical_cases; ketiga soal tetap prereview tanpa perubahan data.
- [ ] Verifikasi simpan/ingest lewat akun admin asli — akses login pengujian Supabase eksternal tidak tersedia; data soal tidak boleh diubah untuk pengujian.

## Word by Word API (19 Nov 2026)
- [x] Selaraskan ingest, fetch, dan edit answer dengan ID stabil; cek AI untuk agent tetap read-only.
- [x] 186 tes lolos; case-admin, ingest-case, rubric-alignment terdeploy; schema ingest dan penolakan kunci salah terverifikasi.
- [ ] Fetch/edit/cek AI dengan kunci case-admin yang valid — kunci yang tersedia hanya diterima ingest-case, case-admin mengembalikan 401; tidak mengubah soal aktif.

## Verifikasi rekaman dan ujian bersamaan (18 Nov 2026)
- [x] Enam perekam hook aplikasi bersamaan di Chromium dengan mikrofon sintetis, dua putaran masing-masing 12 detik: 12 audio berhasil didekode, mikrofon tetap hidup antarsoal dan semuanya berhenti pada akhir; tanpa error browser. Heap JS harness 3,41 → 3,80–3,84 MiB per konteks, bukan pengukuran RAM ujian penuh.
- [x] Tes jalur Safari/iPhone: MP4 tanpa timeslice dan fallback opsi bitrate; 10 tes terarah lolos. Ini simulasi API, bukan verifikasi Safari/iPhone fisik.
- [ ] Verifikasi ujian nyata sampai unggah dan penilaian — akses akun Supabase eksternal tidak tersedia.
- [ ] Verifikasi rekaman iPhone asli — perangkat fisik tidak tersedia.

## Optimasi memori ujian (18 Nov 2026)
- [x] Audio 32 kbps, preferensi mono 16 kHz dengan fallback Safari; buffer dilepas sesudah stop, mikrofon pada akhir rangkaian, indikator suara 10 Hz dan speech preview berbatas sesi.
- [x] Hasil 20 per halaman, filter mode di server dan ringkasan JSON saja; transkrip/rubrik dimuat saat dibuka dan cache rincian dilepas saat ditutup.
- [x] Realtime dengan polling cadangan 30 detik tanpa permintaan tumpang tindih di station/penguji/hasil/peserta; reconnect menyegarkan station.
- [x] Penguncian antrean serial terverifikasi langsung di Supabase; tidak mengubah nilai, soal, maupun penyedia transkripsi. Rekaman Chromium 32 kbps menghasilkan audio nonkosong dan semua track berhenti.
- [ ] Verifikasi beban beberapa ujian nyata dan kompatibilitas iPhone — akses login pengujian Supabase eksternal dan perangkat iPhone tidak tersedia.

## Tampilan properti (17 Nov 2026)
- [x] Ubah countdown modal bersama menjadi 20 detik.
- [x] Tambahkan override caption media di penguji tanpa mengubah soal; properti teks tetap terlihat.
- [x] 19 tes durasi, override, pengiriman dan reconnect lolos; build OK.
- [ ] Verifikasi dengan ujian sungguhan — akses login Supabase eksternal tidak tersedia.

## Peninjauan pre-review (10 Nov 2026)
- [x] Tinjau kedua soal, perbaiki ketidaksesuaian klinis, lengkapi jawaban dan properti tanpa menghilangkan butir.
- [x] Terbitkan kedua soal sebagai oral board berbasis laporan teks; 16/15 butir, 32/30 poin, masing-masing 3 kritis; jawaban, ID dan properti tersimpan lengkap, pre-review tersisa 0.
- [ ] Lima media asli belum tersedia — laporan teks sudah tersedia; menunggu unggahan foto/rekaman klinis asli.
- [ ] Verifikasi pilihan deploy melalui akun admin — login pengujian Supabase eksternal tidak tersedia; status published dan filter deploy diperiksa.

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
