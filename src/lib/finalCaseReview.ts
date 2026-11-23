import { supabase } from "@/integrations/supabase/client";
import type { FinalReviewResult } from "../../supabase/functions/_shared/final-case-review";
export type { FinalReviewResult };
export interface FinalReviewSummary { passed: boolean; stale: boolean; result?: { source?: string } }
export interface SavedFinalReview extends FinalReviewSummary { result: FinalReviewResult & { source?: string }; updated_at: string }
export function finalReviewState(review?: FinalReviewSummary | null): "unchecked" | "stale" | "blocked" | "passed" {
  if (!review) return "unchecked";
  if (review.stale) return "stale";
  return review.passed === true ? "passed" : "blocked";
}
export function finalReviewLabel(review?: FinalReviewSummary | null) {
  if (finalReviewState(review) === "passed" && review?.result?.source === "manual") return "Sudah sesuai — disetujui admin tanpa analisis AI";
  return { unchecked: "Belum diperiksa akhir — deployment terkunci", stale: "Isi soal berubah — wajib periksa ulang sebelum deployment",
    blocked: "Belum lolos: kebocoran atau ketidaksesuaian — deployment terkunci", passed: "Lolos pemeriksaan akhir kebocoran dan kesesuaian soal" }[finalReviewState(review)];
}
export async function approveFinalReview(caseId: string): Promise<SavedFinalReview> {
  const { error } = await supabase.rpc("approve_final_case_review", { _case_id: caseId });
  if (error) throw new Error(error.message);
  const saved = await loadFinalReview(caseId);
  if (!saved) throw new Error("Persetujuan gagal dimuat kembali.");
  return saved;
}
export async function loadFinalReview(caseId: string): Promise<SavedFinalReview | null> {
  const { data, error } = await supabase.from("case_final_reviews").select("passed, stale, result, updated_at").eq("case_id", caseId).maybeSingle();
  if (error) throw error;
  return data as unknown as SavedFinalReview | null;
}
export async function runFinalReview(caseId: string): Promise<SavedFinalReview> {
  const { data, error } = await supabase.functions.invoke("final-case-review", { body: { case_id: caseId } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.result || typeof data.passed !== "boolean") throw new Error("Hasil pemeriksaan tidak valid.");
  return data as SavedFinalReview;
}