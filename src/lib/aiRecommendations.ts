import { supabase } from "@/integrations/supabase/client";

export type RecommendationKind = "rubric_alignment" | "property_sync";
export interface SavedRecommendation<T> { result: T; decisions: Record<string, string>; updated_at: string }

// Tabel baru belum ada di types.ts hasil generate; akses lewat cast.
const table = () => (supabase as unknown as { from: (t: string) => any }).from("case_ai_recommendations");

export async function loadRecommendation<T>(caseId: string, kind: RecommendationKind): Promise<SavedRecommendation<T> | null> {
  const { data, error } = await table().select("result, decisions, updated_at").eq("case_id", caseId).eq("kind", kind).maybeSingle();
  if (error || !data) return null;
  return data as SavedRecommendation<T>;
}

export async function saveRecommendation(caseId: string, kind: RecommendationKind, result: unknown, decisions: Record<string, string> = {}) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await table().upsert(
    { case_id: caseId, kind, result, decisions, created_by: u.user?.id ?? null },
    { onConflict: "case_id,kind" },
  );
  if (error) console.warn("Rekomendasi AI gagal disimpan", error.message);
}

export async function saveDecisions(caseId: string, kind: RecommendationKind, decisions: Record<string, string>) {
  const { error } = await table().update({ decisions }).eq("case_id", caseId).eq("kind", kind);
  if (error) console.warn("Keputusan rekomendasi gagal disimpan", error.message);
}
