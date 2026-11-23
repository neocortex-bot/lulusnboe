import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinalReviewResult } from "../../supabase/functions/_shared/final-case-review";
export type { FinalReviewResult };
export interface FinalReviewSummary { passed: boolean; stale: boolean }
export interface SavedFinalReview extends FinalReviewSummary { result: FinalReviewResult & { approval_method?: "manual" }; updated_at: string; checked_by?: string }
export function finalReviewState(review?: FinalReviewSummary | null): "unchecked" | "stale" | "blocked" | "passed" {
  if (!review) return "unchecked";
  if (review.stale) return "stale";
  return review.passed === true ? "passed" : "blocked";
}
export function finalReviewLabel(review?: FinalReviewSummary | null) {
  return { unchecked: "Belum diperiksa akhir — deployment terkunci", stale: "Isi soal berubah — wajib periksa ulang sebelum deployment",
    blocked: "Belum lolos: kebocoran atau ketidaksesuaian — deployment terkunci", passed: "Lolos pemeriksaan akhir kebocoran dan kesesuaian soal" }[finalReviewState(review)];
}
export async function loadFinalReview(caseId: string): Promise<SavedFinalReview | null> {
  const { data, error } = await supabase.from("case_final_reviews").select("passed, stale, result, updated_at, checked_by").eq("case_id", caseId).maybeSingle();
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

// Isolate RPC typing while the corresponding migration's generated types are pending.
const manualReviewClient: SupabaseClient = supabase;
export async function loadManualReviewHash(caseId: string): Promise<string> {
  const { data, error } = await manualReviewClient.rpc("get_final_case_review_hash", { _case_id: caseId });
  if (error) throw new Error("Persetujuan manual belum tersedia. " + error.message);
  if (typeof data !== "string" || !data) throw new Error("Isi soal tidak dapat dikonfirmasi. Muat ulang dan coba lagi.");
  return data;
}
export async function approveFinalReviewManually(caseId: string, hash: string): Promise<SavedFinalReview> {
  const { data, error } = await manualReviewClient.rpc("approve_final_case_manually", { _case_id: caseId, _expected_hash: hash, _confirmed: true });
  if (error) throw new Error(error.message);
  if (!data?.passed || data?.stale || data?.result?.approval_method !== "manual") throw new Error("Persetujuan manual gagal disimpan.");
  return data as SavedFinalReview;
}