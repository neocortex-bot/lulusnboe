-- Kolom admin-only pada clinical_cases yang sebelumnya hanya ada di produksi
-- (ditambahkan manual, tanpa migration). Idempotent agar aman dijalankan ulang.
--
--   category   : pengelompokan/filter soal di UI admin
--                (src/components/admin/CaseManager.tsx, CategoryFilter, CategoryPicker).
--                Ditulis UI via src/lib/caseCategory.ts#toCategoryKey (lowercase, spasi -> "_")
--                dan kini juga lewat edge function ingest-case / case-admin.
--   properties : daftar alat/gambar/data penguji (admin-only, tidak tampil ke peserta).
--                Disimpan juga di case_answer_keys.checklist_rubric.properties untuk grading.

ALTER TABLE public.clinical_cases
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.clinical_cases
  ADD COLUMN IF NOT EXISTS properties text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.clinical_cases.category IS
  'Kategori soal untuk pengelompokan/filter UI admin. Bebas teks, normalisasi via toCategoryKey (lowercase, spasi -> "_").';
COMMENT ON COLUMN public.clinical_cases.properties IS
  'Properti soal admin-only (alat/gambar/data penguji). Tiap string maks 300 char, maks 50 butir.';

-- Index bantu untuk filter kategori di CaseManager.
CREATE INDEX IF NOT EXISTS clinical_cases_category_idx
  ON public.clinical_cases (category)
  WHERE category IS NOT NULL;
