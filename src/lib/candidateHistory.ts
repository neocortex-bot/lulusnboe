import { supabase } from "@/integrations/supabase/client";
import { resultPageRange } from "@/lib/examPerformance";

export const HISTORY_TIMEOUT_MS = 15_000;
export const candidateHistoryColumns: string = "id, created_at, score:ai_score_report->score, passStatus:ai_score_report->>passStatus, totalScore:ai_score_report->totalScore, totalPossible:ai_score_report->totalPossible, hasCriticalFail:ai_score_report->hasCriticalFail, exam_sessions:session_id(status, show_results_to_candidate_override, clinical_cases:case_id(show_results_to_candidate))";

/** Bounds auth-token waits too: abortSignal alone only bounds the eventual fetch. */
export async function boundedHistoryRequest<T>(request: (signal: AbortSignal) => PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => request(controller.signal)),
      new Promise<never>((_, reject) => {
        const fail = (error: Error) => { reject(error); controller.abort(); };
        timer = setTimeout(() => fail(new Error("Pemuatan riwayat terlalu lama. Silakan coba lagi.")), HISTORY_TIMEOUT_MS);
        onAbort = () => fail(new Error("Pemuatan dibatalkan."));
        if (signal?.aborted) onAbort();
        else signal?.addEventListener("abort", onAbort, { once: true });
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

export async function loadCandidateHistory(userId: string, page: number, signal?: AbortSignal) {
  const [from, to] = resultPageRange(page);
  const { data, error, count } = await boundedHistoryRequest(s => supabase.from("exam_results")
    .select(candidateHistoryColumns, { count: "exact" }).eq("candidate_id", userId)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to).abortSignal(s), signal);
  if (error) throw error;
  return { rows: (data ?? []).map((row: any) => ({ ...row, ai_score_report: {
    items: [], score: row.score, passStatus: row.passStatus, totalScore: row.totalScore,
    totalPossible: row.totalPossible, hasCriticalFail: row.hasCriticalFail,
  } })), count: count ?? 0 };
}

export async function loadCandidateHistoryDetail(userId: string, resultId: string, signal?: AbortSignal) {
  const { data, error } = await boundedHistoryRequest(s => supabase.from("exam_results")
    .select("id, transcript, ai_score_report").eq("id", resultId).eq("candidate_id", userId).abortSignal(s).single(), signal);
  if (error) throw error;
  return data;
}