// Properti fisik disimpan di dua lokasi: kolom clinical_cases.properties dan
// case_answer_keys.checklist_rubric.properties (dibaca halaman admin). Gabungkan saat baca.
export function mergeProperties(ccProps: unknown, akProps: unknown): string[] {
  const out: string[] = [];
  for (const src of [ccProps, akProps]) {
    if (!Array.isArray(src)) continue;
    for (const p of src) {
      const s = String(p);
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}
