# Kalibrasi penilaian klinis dan transkrip mentah

## Ruang lingkup

Kalibrasi memakai transkrip ujian terbaru dengan 20 butir rubrik, tanpa menulis
ulang soal, transkrip, atau nilai ujian tersimpan. Semua panggilan memakai model
penilaian yang sama, `gpt-5.6-luna`, melalui penyedia OpenAI yang sudah digunakan.
Angka berikut dihitung dari coverage (full=2, partial=1, none=0), bukan menerima
total yang dikarang model. Skor tersimpan tetap 43/100.

## Pengukuran eksploratif

| Prompt | Skor dalam percobaan |
| --- | --- |
| Baseline lama | 35 |
| Kompetensi v1 | 40 |
| Kompetensi v2 | 43, 40 |
| Kompetensi v3, tanpa anotasi SKOR lama | 43, 43 |
| Kompetensi v4, ringkas | 53, 53 |
| Kompetensi + transkrip mentah v5 | 45, 43 |
| Kompetensi + transkrip mentah v6, terpasang | 45, 53 |

Ini pengujian satu transkrip, bukan bukti optimal untuk semua soal. Pengulangan
masih bervariasi meski seed sama. Jangan mengambil skor tertinggi lalu
menggantikannya sebagai nilai resmi, dan jangan mengklaim peserta pasti lulus.
Ada topik yang memang belum dijawab: CDT, antitrombotik jangka panjang,
pencegahan sekunder, dan edukasi hasil/urgensi. Kekurangan tersebut tidak boleh
diisi dari kunci jawaban. Beberapa alasan pengurangan yang hanya bersifat
detail pendukung masih muncul; prompt belum menghilangkan seluruh masalah.

## Kebijakan akhir

- Nilai kompetensi utama yang benar dan memadai, bukan menghafal semua detail.
- Gabungkan konteks pembukaan dan jawaban berikutnya; tidak perlu mengulang
  bilateral di setiap kalimat.
- Pahami istilah fonetik, filler dan interupsi tanpa memoles transkrip asli.
- Jangan mengubah angka, dosis, negasi, sisi, atau mengisi jawaban terpotong
  berdasarkan kunci. Jelaskan ambiguitas yang tidak dapat dipastikan.
- Bedakan pengayaan belajar dari kekurangan inti yang mengurangi nilai.
- Kriteria keselamatan tetap penting; jawaban kosong/berbahaya tidak diluluskan.
- Nilai manual tetap mengikuti perlindungan yang sudah ada; Word by Word
  tidak masuk penilaian. Catat versi prompt pada laporan evaluasi baru.

## Kontrol

Kontrol sintetis lintas-topik menghasilkan `[2,2,0,0,2]`: komunikasi memadai
tanpa daftar alat lengkap; palpasi dengan konteks kedua sisi; dosis heparin
berbahaya; statin yang tidak disebut; pemeriksaan sensorik dengan interupsi dan
ejaan fonetik. Kontrol jawaban tanpa isi klinis bernilai 0. Kontrol tindakan
berbahaya tidak lulus (percobaan akhir v4: 3/100).

Kontrol AI langsung dapat diulang dengan
`deno test --allow-env --allow-net=api.openai.com supabase/functions/evaluate-exam/calibration_test.ts`.
Tes tersebut memakai ucapan sintetis, tidak mengakses database dan tidak
mengubah laporan. Tes biasa menguji skala poin dan preservasi data mentah.

## Verifikasi dan batasan

215 tes aplikasi lolos; pemeriksaan aplikasi terakhir berhasil. Source fungsi
terpasang memuat versi `clinical-competency-raw-v6-2026-11-21` dan kebijakan
transkrip mentah. Panggilan tanpa login ditolak 401. Database dibaca kembali:
nilai asli tetap 43, transkrip tetap 3467 karakter, status evaluasi tetap done.

Belum melakukan evaluasi ulang tersimpan lewat akun peserta/admin, belum
membandingkan ucapan asli dari audio dengan transkrip, dan belum membuktikan
kesetaraan penilaian di kumpulan soal/transkrip independen. Tidak ada jaminan
bahwa kata atau jawaban yang tidak terekam bisa dipulihkan oleh prompt.