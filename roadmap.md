# Roadmap

## Now
- [ ] Deploy edge functions (ingest-case, case-admin, dll) ke backend Lovable Cloud baru
- [ ] Bangun ulang tabel database di backend Cloud baru (dari supabase/migrations)
- [ ] Salin data soal lama (108 clinical_cases, 220 exam_sequence_items) dari backend lama
- [ ] Pasang kembali secret: OPENAI_API_KEY, CASE_INGEST_API_KEY di backend Cloud

## Berikutnya
- [ ] Uji ingest-case menerima daftar tilik fleksibel (11 butir & 53 butir) tanpa ditolak 400
- [ ] Pulihkan soal yang terhapus (salinan Athlete's Heart tersedia)
- [ ] Perbarui memori alur pembuatan soal dengan aturan rubrik fleksibel

## Perlu verifikasi ulang
- [ ] exam_access + filter master admin (izzan.rijal@gmail.com)
- [ ] Panel jawaban ideal di riwayat ujian
- [ ] Perekaman audio di iPhone
- [ ] Highlight jawaban partisipan pada rubrik yang lulus

## Sinkronisasi backend (14 Okt 2026)
- [ ] Salin 108 clinical_cases + 220 exam_sequence_items dari backend lama (nowebjmwrtkspvdwgevj) ke Cloud baru (dqhnbxnopuwaarlyncbs) — fix 409 saat insert
- [ ] Jelaskan ke user: aplikasi kini memakai Cloud baru; ingest-case/case-admin harus ke URL Cloud, bukan URL lama
