# Roadmap

## Filter dan warna label NBOE (21 Nov 2026)
- [x] Filter checkbox pada pemilih deploy menampilkan hanya soal NBOE tanpa mengubah pilihan atau urutan ujian; 4 tes dan browser 394/1110 px dengan data uji lolos.
- [x] Label Soal NBOE lime green dengan teks hitam di tabel dan pemilih deploy; 4 tes lolos dan browser 394/1110 px memverifikasi tampilan dengan data uji, build OK.

## Formulir properti digital (21 Nov 2026)
- [x] Ganti media lama di formulir dengan editor properti digital bersama dan centang cepat NBOE; pertahankan jawaban privat serta metadata rubrik.
- [x] 24 tes lolos; browser 394/1110 px memverifikasi tambah/edit/simpan/buka ulang dan penanda NBOE dengan data uji, tanpa overflow atau error runtime. Simpan akun asli belum terverifikasi karena sesi Supabase eksternal tidak tersedia.

## Penanda Soal NBOE (21 Nov 2026)
- [x] Centang tersimpan di detail soal di samping Edit; label di tabel soal dan pilihan/urutan deploy, tanpa mengubah rubrik atau aturan ujian. Soal lama default false, tidak otomatis ditandai.
- [x] 228 tes lolos, build OK; browser 394/1110 px dengan data contoh memverifikasi simpan → buka ulang → tabel → urutan deploy. Penyimpanan akun asli belum terverifikasi pada Supabase eksternal; kolom default terverifikasi di 208 soal, tidak ada data asli diubah. 29 temuan keamanan lama tidak diubah; tidak ada temuan baru.

## Sesi membaca penguji tertinggal (21 Nov 2026)
- [x] Tampilkan hanya sesi yang sudah dimulai peserta dan menugaskan akun yang masuk sebagai penguji, termasuk admin utama; gunakan pesan kosong yang diminta. Tidak mengubah struktur/status/nilai sesi; migrasi waktu klaim dibatalkan sebelum berjalan.
- [x] Kedua sesi L77X55/RF45LQ tidak memiliki penguji dan tidak lagi masuk daftar; pertahankan sesi membaca baru yang telah diklaim serta sesi tunggal/pilihan ruangan.
- [x] Supabase menunjukkan nol sesi active yang memiliki penguji dan peserta. 225 tes lolos, build OK; browser 394/1110 px dengan data contoh memverifikasi kosong → mulai → pilih/kembali. Ujian nyata melalui akun eksternal belum dapat diverifikasi.

## Pemilihan sesi penguji (21 Nov 2026)
- [x] Abaikan sesi menunggu/selesai dan sesi menjawab yang waktunya habis tanpa mengubah data ujian; pertahankan sesi membaca. Segarkan daftar saat kembali ke halaman penguji.
- [x] Satu sesi otomatis dibuka; beberapa sesi dapat dipilih dan tombol kembali tidak mengunci pemilihan saat tinggal satu sesi.
- [x] 221 tes lolos, build OK; browser 394/1280 px dengan data contoh memverifikasi buka otomatis, pilih/kembali, dan tinggal satu sesi tanpa error runtime. Akun asli Supabase eksternal tidak tersedia untuk verifikasi ujian nyata.

## Pemeriksaan responsif semua halaman (21 Nov 2026)
- [x] Audit halaman publik, admin, penguji, peserta, station, tabel dan modal pada ponsel/tablet/desktop; perbaikan hanya presentasi.
- [x] Verifikasi 145 layar dengan data contoh pada 320, 390, 768, 1109 dan 1440 px; tidak ada overflow halaman atau error runtime. Pemeriksaan akun/ujian asli tidak tersedia pada Supabase eksternal, dan iPhone fisik belum diuji. Satu tes paginasi sempat gagal saat suite penuh, lalu 4 tes paginasi lolos saat dijalankan ulang.

## Pilih prompt 53/53 (21 Nov 2026)
- [x] Prompt kompetensi v4 dan format masukan dikembalikan sesuai pilihan pengguna (hasil kalibrasi 53/53); nilai lama/manual tidak diganti, nilai terakhir tetap 43 dan transkrip 3467 karakter.
- [x] 48 tes regresi dan 1 kontrol AI langsung transkrip terinterupsi/berbahaya lolos. Source server terverifikasi memakai clinical-competency-v4-2026-11-21, bukan v6. Hasil evaluasi berikutnya tidak dijamin selalu 53; versi sebelumnya tersimpan di riwayat kode.

## Kalibrasi prompt penilaian (21 Nov 2026)
- [x] Pahami transkrip mentah dalam satu analisis AI tanpa memoles bukti/mengarang jawaban; kontrol AI langsung transkrip terinterupsi, fonetik, konteks bilateral, dosis berbahaya dan topik kosong menghasilkan [2,2,0,0,2]. Tes langsung tersimpan dan lolos.
- [x] Enam iterasi pada transkrip terakhir: baseline 35; v4 53/53; v6 dengan transkrip mentah 45/53. Variasi AI masih ada, belum optimal universal. Kontrol kosong/berbahaya tidak lulus; tidak memilih skor tertinggi untuk mengganti nilai resmi. Catatan pengukuran di docs/grading-calibration-2026-11-21.md.
- [x] Prompt kompetensi + transkrip mentah v6 terpasang; source server memuat kebijakan/versi, akses tanpa login 401. 215 tes aplikasi dan 1 kontrol AI langsung lolos; build OK. Skala 0/1/2, critical, nilai manual dan independensi Word by Word dipertahankan; nilai terakhir tetap 43 dan transkrip 3467 karakter. Evaluasi ulang tersimpan lewat UI dan pembandingan audio asli belum diuji; bukan jaminan kelulusan.

## Kedaluwarsa sesi menunggu (20 Nov 2026)
- [x] Kedaluwarsa dihitung server setelah 15 menit, tanpa cron/polling tambahan; klaim kedaluwarsa ditolak termasuk update langsung. Sesi membaca/aktif terlindungi; soal berikut mendapat waktu dari hasil terakhir dan terlindungi selama rangkaian aktif. Data sesi tetap disimpan, bukan dihapus.
- [x] 210 tes aplikasi lolos; SQL transaksional menguji sebelum/tepat 15 menit, membaca, rangkaian aktif, hasil terakhir, dan penolakan klaim langsung; semua fixture di-rollback. Browser station asli menampilkan Sesi Kedaluwarsa tanpa QR; build OK. Tidak ada peringatan keamanan baru; 29 temuan lama tidak diubah.
- [ ] Klaim peserta bersamaan melalui akun nyata dan pengukuran RAM server — sesi login eksternal dan pengukuran RAM tidak tersedia; bukan jaminan kapasitas enam ujian penuh.

## Vignette dan pertanyaan pada hasil (20 Nov 2026)
- [x] Tambahkan bagian bersama yang tertutup awalnya di atas hasil admin dan hasil peserta yang diizinkan; muat vignette/pertanyaan hanya saat panah dibuka.
- [x] 14 tes lolos: buka/tutup, muat sesuai ID hasil, retry, daftar admin tetap ringkas, peserta tanpa izin tidak memuat soal; build OK. Tampilan browser dan alur akun asli belum terverifikasi: harness browser gagal merender, sesi akun Supabase eksternal tidak tersedia.

## Pengujian deploy enam soal (19 Nov 2026)
- [x] Reproduksi di Supabase asli: enam sesi dibuat dalam 0,779 detik; kegagalan penautan meninggalkan enam sesi tanpa urutan. Seluruh data uji dibersihkan.
- [x] Deploy transaksi atomik, SECURITY INVOKER dan izin admin; enam permintaan serentak × enam soal menghasilkan 36 sesi dalam 1,57–1,78 detik per permintaan. Enam retry bersamaan memakai ID sesi yang sama; benturan soal keenam membatalkan seluruh sesi baru; akses anonim ditolak.
- [x] Browser dengan akun admin sementara pada Supabase asli: pilih enam soal, deploy, baca enam station dalam modal sukses. Data uji serta akun sementara dibersihkan; 202 tes lolos dan build OK.
- [ ] Ukur RAM server dan enam ujian penuh sampai penilaian — pengukuran RAM server tidak tersedia; tes ini hanya deploy, bukan jaminan kapasitas ujian penuh.

## Tahap kedua optimasi aman (19 Nov 2026)
- [x] Filter mode dan batas 10 sesi per halaman di server, urutan created_at/id stabil; uji halaman berikut, pergantian mode, kegagalan muat, dan halaman menyusut lolos.
- [x] 201 tes lolos, build OK; permintaan join/filter/range PostgREST diterima (HTTP 200). Akun publik menghasilkan 0 baris sesuai izin; pembacaan sesi berisi data melalui admin asli belum terverifikasi karena akses sesi eksternal tidak tersedia. Tidak mengubah sesi/hasil asli.
- [ ] Tahan pengubahan daftar admin ke ringkasan: editor lama bergantung pada rubrik/kunci lengkap dan memiliki jalur simpan yang perlu audit privasi serta metadata sebelum dipisahkan.
- [ ] Tahan detail penguji dan antrean AI sampai alur akun/ujian nyata dapat diverifikasi; akses sesi Supabase eksternal tidak tersedia.

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
