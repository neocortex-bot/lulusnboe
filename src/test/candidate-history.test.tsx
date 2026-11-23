import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { boundedHistoryRequest, candidateHistoryColumns, HISTORY_TIMEOUT_MS, loadCandidateHistory } from "@/lib/candidateHistory";
import CandidateResultsList from "@/components/exam/CandidateResultsList";

const state = vi.hoisted(() => ({ calls: [] as [string, unknown][], fail: false, detailReads: 0 }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "candidate-1" } }) }));
vi.mock("@/components/exam/ModelAnswerPanel", () => ({ default: () => null }));
vi.mock("@/components/exam/ResultCasePrompt", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  let detail = false;
  const q: any = {
    select: (value: string) => { state.calls.push(["select", value]); return q; },
    eq: (key: string, value: string) => { state.calls.push([key, value]); return q; },
    order: (key: string) => { state.calls.push(["order", key]); return q; },
    range: (from: number, to: number) => { state.calls.push(["range", [from, to]]); return q; },
    single: () => { detail = true; state.detailReads++; return q; },
    abortSignal: () => q,
    then: (resolve: any) => Promise.resolve(state.fail ? { data: null, error: new Error("offline") } : {
      data: detail ? { id: "result-1", transcript: "Saya menjelaskan persiapan", ai_score_report: { items: [] } } : [{ id: "result-1", created_at: "2026-11-23", score: 80, exam_sessions: { show_results_to_candidate_override: true } }],
      error: null, count: 21,
    }).then(resolve),
  };
  return q;
} } }));
beforeEach(() => { state.calls = []; state.fail = false; state.detailReads = 0; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("candidate history", () => {
  it("loads bounded summary pages for the signed-in candidate without transcripts/full reports", async () => {
    await loadCandidateHistory("candidate-1", 1);
    expect(state.calls).toContainEqual(["candidate_id", "candidate-1"]);
    expect(state.calls).toContainEqual(["range", [20, 39]]);
    expect(candidateHistoryColumns.split(", ")).not.toContain("ai_score_report");
    expect(candidateHistoryColumns).not.toContain("transcript");
  });
  it("a stalled request exits loading after the deadline and cancels its network request", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = boundedHistoryRequest(s => { signal = s; return new Promise(() => {}); });
    const assertion = expect(pending).rejects.toThrow("Pemuatan riwayat terlalu lama");
    await vi.advanceTimersByTimeAsync(HISTORY_TIMEOUT_MS);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });
  it("shows failure and successfully retries without claiming the history is empty", async () => {
    state.fail = true;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CandidateResultsList /></QueryClientProvider>);
    await screen.findByRole("alert");
    state.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    await screen.findByRole("button", { name: /80\/100/ });
    expect(state.detailReads).toBe(0);
    client.clear();
  });
  it("reads one detail only when expanded, and advances history without keeping it open", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CandidateResultsList /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: /80\/100/ }));
    await screen.findByText("Saya menjelaskan persiapan");
    expect(state.detailReads).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    await waitFor(() => expect(state.calls).toContainEqual(["range", [20, 39]]));
    expect(screen.queryByText("Saya menjelaskan persiapan")).not.toBeInTheDocument();
    client.clear();
  });
});