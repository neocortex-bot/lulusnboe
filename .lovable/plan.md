# Word by Word + Cek Kesesuaian Rubrik di Detail Soal

## Yang akan dilihat admin
- Di halaman detail soal, bagian baru **"Word by Word per Butir Rubrik"**: tiap butir daftar tilik disandingkan dengan kalimat word by word-nya. Butir yang belum punya word by word ditandai "Belum ada".
- Tombol **[Cek kesesuaian rubrik dan word by word]** membuka modal:
  - AI memeriksa tiap butir: Sesuai / Sebagian / Tidak sesuai / Word by word kosong, plus alasan singkat.
  - Saran perbaikan per butir (teks word by word baru, atau penyesuaian teks butir rubrik), masing-masing dengan tombol **Terima** / **Abaikan**, serta **Terima semua**.
  - Saran hanya disimpan setelah admin menekan Terima; poin tetap maksimal 2 per butir, status critical dan ID butir tidak diubah AI.
- Tombol "Buat word by word dengan AI" untuk soal yang sama sekali belum punya word by word (hasil tetap lewat modal yang sama, harus diterima dulu).

## Soal yang belum punya word by word
- Penilaian ujian **tidak diubah**: AI tetap menilai jawaban peserta terhadap soal, kunci jawaban, dan teks rubrik seperti sekarang. Word by word tidak dibaca oleh penilaian, jadi soal dengan atau tanpa word by word dinilai persis seperti saat ini.
- Menerima saran yang mengubah teks butir rubrik memakai jalur simpan yang sudah ada, sehingga sinkronisasi nilai ujian lama (ID stabil, nilai manual terlindungi) tetap berlaku. Perubahan yang hanya mengisi word by word tidak menyentuh nilai sama sekali.

## Pengaman agar tidak error
- Fungsi AI baru terpisah (`rubric-alignment`), hanya untuk admin, tidak dipanggil oleh alur ujian/penilaian.
- Tidak ada perubahan skema database; word by word disimpan di field `answer` per butir yang sudah ada di `case_answer_keys.checklist_rubric`.
- Bila AI gagal/kredit habis, modal menampilkan pesan, data tidak berubah.

## Detail teknis
- Edge function baru `supabase/functions/rubric-alignment/index.ts`: auth via `_shared/exam-ai-access.ts` (admin), panggil `_shared/openai.ts` JSON, input `{case_id}`; baca rubrik + kunci jawaban + soal; output `[{item_id, status, reason, suggested_answer?, suggested_text?}]`. Read-only; tidak menulis DB.
- Frontend: komponen `RubricWordByWordSection.tsx` + `RubricAlignmentDialog.tsx` dipasang di `src/pages/admin/CasePreview.tsx`. Terima saran = merge ke rubrik lokal by `id`, lalu simpan lewat mutasi simpan rubrik yang sudah ada (re-fetch terbaru dari DB sebelum menulis), sehingga trigger `sync_results_after_rubric_change` tetap menangani nilai.
- Guard: merge menolak perubahan `points`, `critical`, `id`; teks kosong ditolak.
- Tes: merge saran mempertahankan id/poin/critical; menerima hanya word by word tidak mengubah teks/poin; `evaluate-exam` tidak mereferensikan field `answer` (tetap independen). Jalankan seluruh suite.
- Deploy edge function baru ke Supabase `nboe`; evaluate-exam tidak di-deploy ulang.
