# Sinkronkan Properti Digital dengan Kunci Jawaban & Rubrik (via AI, berbasis caption)

## Masalah
Pembuat soal mengunggah media properti digital (mis. EKG, lab, echo) beserta caption-nya, tetapi nilai di caption berbeda dengan kunci jawaban, Word by Word, dan butir rubrik "sebutkan dan interpretasikan pemeriksaan penunjang". Peserta jadi dinilai terhadap angka yang tidak sama dengan yang ia lihat.

## Yang akan dibangun
1. Tombol **"Sinkronkan properti dengan jawaban (AI)"** di bagian Properti Digital pada halaman detail soal (dan pre-review).
2. AI membaca **caption/nilai properti** (tanpa vision) sebagai sumber kebenaran, lalu membandingkannya dengan:
   - Kunci jawaban (redaksi jawaban lengkap)
   - Word by Word tiap butir rubrik
   - Teks butir rubrik yang menyebut/menginterpretasi pemeriksaan penunjang
3. Hasil tampil dalam **modal saran**: per temuan ditampilkan "sebelum → sesudah" + alasan singkat, masing-masing bisa **Terima / Abaikan**, plus tombol "Terima semua".
4. Saran yang diterima langsung masuk ke form (belum tersimpan) — admin tetap klik Simpan seperti biasa.
5. Bila caption properti sendiri yang tampak janggal secara klinis (mis. interpretasi tidak cocok dengan nilainya), AI hanya **memberi peringatan**, tidak mengubah caption otomatis.

## Batasan (agar tidak merusak penilaian)
- Poin, critical, ID butir, dan jumlah butir tidak pernah diubah AI.
- Fungsi AI hanya membaca dan memberi saran; tidak menulis ke database.
- Penilaian ujian (evaluate-exam) tidak berubah; hasil ujian lama tidak disentuh kecuali admin menyimpan rubrik (aturan sinkronisasi rubrik yang sudah ada tetap berlaku).
- Properti tanpa caption (hanya media) dilewati dan dilaporkan "butuh caption untuk dicek".

## Detail teknis
- Edge function baru `property-sync` (pola sama dengan `rubric-alignment`: auth admin/agent key, OpenAI JSON, read-only). Input: `case_id` + daftar properti digital dari form saat ini (agar perubahan belum tersimpan ikut dicek). Output:
  `{ answer_key?: {before, after, reason}, items: [{item_id, field: "answer"|"text", before, after, reason}], property_warnings: [{label, reason}] }`.
- Prompt: caption = sumber kebenaran; fokus butir yang menyangkut pemeriksaan penunjang; ubah hanya angka/temuan yang konflik, pertahankan gaya kalimat; jangan mengarang nilai yang tidak ada di caption.
- `src/lib/propertySync.ts`: tipe + `applyPropertySyncChanges` yang memakai ulang `mergeAlignmentChanges` (jaga id/poin/critical) dan mengganti kunci jawaban.
- Komponen `PropertySyncDialog.tsx`, dipasang di samping `DigitalPropertiesEditor` pada `CasePreview.tsx` dan `PreReview.tsx` (jawaban tetap disimpan ke `case_answer_keys`).
- Deploy `property-sync` ke Supabase `nboe`.
- Tes: merge tidak mengubah poin/critical/id; saran untuk item_id tak dikenal diabaikan; kunci jawaban hanya berubah bila diterima.
