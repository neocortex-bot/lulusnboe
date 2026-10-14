import { supabase } from "@/integrations/supabase/client";
import type { SoalDraft } from "@/data/soal/types";

interface ImportDeps {
  userId: string | null | undefined;
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void;
  navigate: (path: string) => void;
}

/**
 * Memasukkan draft soal ke /prereview:
 * - Cek duplikat berdasarkan judul (status "prereview"); bila sudah ada, langsung buka Pre-review.
 * - Insert ke clinical_cases (status "prereview", source "admin").
 * - Upsert case_answer_keys (termasuk properti soal — hanya admin yang bisa melihat).
 */
export async function importSoalToPrereview(soal: SoalDraft, { userId, toast, navigate }: ImportDeps): Promise<void> {
  const { data: existing } = await supabase
    .from("clinical_cases")
    .select("id")
    .eq("status", "prereview")
    .eq("title", soal.draftTitle)
    .limit(1);
  if (existing && existing.length > 0) {
    toast({ title: "Draft sudah ada di Pre-review" });
    navigate("/prereview");
    return;
  }

  const rubric = {
    enabled: true,
    items: soal.tilik.map((t) => ({ answer: t.wbw, text: t.dt, points: t.poin, isCritical: !!t.kritis })),
  };
  const initialPrompt = soal.examData.length
    ? `${soal.scenario}\n\n${soal.examDataTitle}:\n${soal.examData.map((d) => `- ${d}`).join("\n")}`
    : soal.scenario;

  const { data, error } = await supabase
    .from("clinical_cases")
    .insert({
      title: soal.draftTitle,
      exam_mode: "oral_board",
      reading_time_seconds: soal.readingTimeSeconds,
      time_limit_seconds: soal.timeLimitSeconds,
      initial_prompt: initialPrompt,
      questions_text: soal.instructions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
      answer_key_text: soal.fullAnswer.map((a) => a.text).join("\n"),
      checklist_rubric: rubric,
      rubric_mode: "checklist",
      status: "prereview",
      source: "admin",
      created_by: userId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: akErr } = await supabase
    .from("case_answer_keys")
    .upsert(
      {
        case_id: data.id,
        answer_key_text: soal.fullAnswer.map((a) => a.text).join("\n"),
        checklist_rubric: { ...rubric, properties: soal.properties } as any,
      },
      { onConflict: "case_id" },
    );
  if (akErr) throw akErr;

  toast({ title: "Masuk ke Pre-review", description: `Draft "${soal.draftTitle}" siap diedit di halaman Pre-review.` });
  navigate("/prereview");
}
