import { supabase } from "@/integrations/supabase/client";
import seed from "@/data/persiapanSeed.json";

export const PREPARATION_MODE = "preparation";
export const PREPARATION_READING_SECONDS = 10;
export const PREPARATION_ANSWER_SECONDS = 60;

export type PreparationSeedItem = { id: string; text: string; points: number; isCritical: boolean; answer: string };
export type PreparationSeedCard = {
  no: number; title: string; category: string; invasive: boolean; questions_text: string; items: PreparationSeedItem[];
};

export const preparationSeed = seed as PreparationSeedCard[];

/** Candidate-visible rubric never carries the word-by-word answer. */
export function publicRubric(items: PreparationSeedItem[]) {
  return { enabled: true, items: items.map(({ answer: _answer, ...rest }) => rest) };
}

export function buildPreparationRows(card: PreparationSeedCard) {
  return {
    caseRow: {
      title: card.title,
      exam_mode: PREPARATION_MODE,
      initial_prompt: "",
      questions_text: card.questions_text,
      checklist_rubric: publicRubric(card.items),
      reading_time_seconds: PREPARATION_READING_SECONDS,
      time_limit_seconds: PREPARATION_ANSWER_SECONDS,
      show_results_to_candidate: true,
      status: "published",
      source: "admin",
      rubric_mode: "checklist",
      category: card.category,
    },
    answerKey: {
      answer_key_text: card.items.map((item) => item.answer).join("\n"),
      checklist_rubric: { enabled: true, items: card.items },
    },
  };
}

/** Admin-only import; RLS enforces admin role. Skips titles already present. */
export async function importPreparationSeed(userId: string) {
  const { data: existing, error } = await supabase
    .from("clinical_cases").select("title").eq("exam_mode", PREPARATION_MODE);
  if (error) throw error;
  const have = new Set((existing ?? []).map((row) => row.title));
  let created = 0;
  for (const card of preparationSeed) {
    if (have.has(card.title)) continue;
    const { caseRow, answerKey } = buildPreparationRows(card);
    const { data, error: insertError } = await supabase
      .from("clinical_cases").insert({ ...caseRow, created_by: userId }).select("id").single();
    if (insertError) throw insertError;
    const { error: keyError } = await supabase
      .from("case_answer_keys").insert({ case_id: data.id, ...answerKey });
    if (keyError) throw keyError;
    created += 1;
  }
  return created;
}

export async function startPreparationPractice(caseId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_preparation_practice" as never, { _case_id: caseId } as never);
  if (error) throw error;
  return data as unknown as string;
}
