# Perbaikan lokasi Properti Fisik di jalur AI agent (case-admin)

## Temuan dari database (sudah dicek)
- 36 soal punya total 852 butir properti fisik di kolom `clinical_cases.properties`.
- 32 soal juga punya properti di `case_answer_keys.checklist_rubric.properties` (dokumen menyebut 0 — ternyata tidak, jadi kedua lokasi berisi data).
- Halaman admin (detail soal, PreReview, Examiner) membaca dari `checklist_rubric.properties`, bukan dari kolom `clinical_cases.properties`.
- Karena itu solusi aman: gabungkan kedua lokasi saat dibaca, dan tulis ke keduanya saat diubah. Tidak ada data yang dihapus.

## Yang dikerjakan
1. **Baca (GET):** `properties` = gabungan kolom `clinical_cases.properties` lalu `case_answer_keys` (tanpa duplikat, urutan kolom dulu). Soal `c6bf1fa5…` akan menampilkan 31 butir.
2. **Tulis (PATCH):** bila `properties` dikirim, simpan ke kolom `clinical_cases.properties` DAN `case_answer_keys.checklist_rubric.properties`, supaya halaman admin dan API selalu sama. Bila tidak dikirim (mis. hanya `digital_properties`), properti lama tidak disentuh.
3. **Backfill sekali (salin saja, tanpa hapus, aman diulang):** untuk soal yang propertinya hanya ada di kolom, salin ke `case_answer_keys` (buat baris bila belum ada). Untuk soal yang ada di dua tempat dengan isi berbeda, gabungkan tanpa duplikat.
4. **Dokumentasi SCHEMA_DOC:** catat lokasi penyimpanan `properties` dan `digital_properties`.
5. **Tes regresi** (Vitest, pada fungsi penggabungan/penyusunan patch yang dipisah ke file helper): GET dari kolom saja → `['A','B']`; PATCH properties → kolom ikut berubah; PATCH hanya digital → properties tetap.
6. **Deploy** `case-admin` ke Supabase `nowebjmwrtkspvdwgevj`, lalu bukti: GET soal `c6bf1fa5` = 31 butir; total butir ≥ 852; tidak ada soal yang propertinya hanya di satu lokasi; jumlah untuk 6 soal contoh (31, 27, 27, 32, 34, 28) tetap.

## Tidak diubah
Rubrik, jawaban, skenario, status, kategori, waktu, `ingest-case`, halaman frontend.

## Catatan teknis
- Query kriteria #2 dari dokumen (`clinical_cases.checklist_rubric->'properties'`) memeriksa kolom yang salah; verifikasi memakai `case_answer_keys` sebagai gantinya.
- Unique index pada `case_answer_keys.case_id` sudah ada, jadi `ON CONFLICT (case_id)` valid.
- Deploy edge function eksternal mungkin butuh izin akses; bila tertahan akan saya sampaikan.
