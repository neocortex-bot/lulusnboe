import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import FinalCaseReview from "@/components/admin/FinalCaseReview";
import { finalReviewState } from "@/lib/finalCaseReview";

const mock = vi.hoisted(() => ({ saved: null as any, runs: 0, applied: 0, approved: 0, writes: [] as any[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: mock.saved, error: null }), update: (payload: any) => { mock.writes.push({ table, payload }); return q; } }; return q; },
  rpc: async (name: string, args: any) => {
    expect(args).toEqual({ _case_id: "avb" });
    if (name === "approve_final_case_review") {
      mock.approved++;
      mock.saved = { passed: true, stale: false, updated_at: "2026-11-23T12:18:00Z", result: { source: "manual", passed: true, summary: "Disetujui admin", issues: [], initial_prompt: null, questions_text: null } };
    } else { expect(name).toBe("apply_final_case_review"); mock.applied++; mock.saved.stale = true; }
    return { error: null };
  },
  functions: { invoke: async (name: string, options: any) => {
    expect(name).toBe("final-case-review"); expect(options.body).toEqual({ case_id: "avb" });
    mock.runs++;
    const passed = mock.applied > 0;
    mock.saved = { passed, stale: false, updated_at: "2026-11-23T09:00:00Z", result: { passed, summary: passed ? "Soal aman" : "Hasil EKG bocor", issues: passed ? [] : [{ field: "initial_prompt", kind: "leak", quote: "EKG AV block total", reason: "Peserta harus meminta EKG" }], initial_prompt: passed ? null : "Pasien sesak.", questions_text: null } };
    return { data: mock.saved, error: null };
  } },
} }));
beforeEach(() => { mock.saved = null; mock.runs = 0; mock.applied = 0; mock.approved = 0; mock.writes = []; });
afterEach(cleanup);

it("checks saved content, applies only trusted prompt corrections and rechecks before passing", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FinalCaseReview caseId="avb" /></QueryClientProvider>);
  const trigger = await screen.findByRole("button", { name: /Periksa akhir/ });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  const analyze = await screen.findByRole("button", { name: "Lanjut analisis AI" });
  await waitFor(() => expect(analyze).toBeEnabled());
  expect(mock.runs).toBe(0);
  fireEvent.click(analyze);
  const apply = await screen.findByRole("button", { name: /Terima perbaikan/ });
  expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("blocked");
  fireEvent.click(apply);
  await waitFor(() => expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("stale"));
  expect(mock.runs).toBe(1);
  const reanalyze = screen.getByRole("button", { name: "Analisis ulang dengan AI" });
  await waitFor(() => expect(reanalyze).toBeEnabled());
  fireEvent.click(reanalyze);
  await waitFor(() => expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("passed"));
  expect(mock.writes).toHaveLength(0);
  expect(mock.applied).toBe(1);
  client.clear();
});

it("manual approval unlocks the saved case without any AI call and persists on reopening", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FinalCaseReview caseId="avb" /></QueryClientProvider>);
  const trigger = await screen.findByRole("button", { name: /Periksa akhir/ });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  const approve = await screen.findByRole("button", { name: "Tandai sudah sesuai" });
  await waitFor(() => expect(approve).toBeEnabled());
  expect(mock.runs).toBe(0);
  fireEvent.click(approve);
  await waitFor(() => expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("passed"));
  expect(mock.approved).toBe(1);
  expect(mock.runs).toBe(0);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  fireEvent.click(trigger);
  await screen.findByText("Disetujui admin");
  expect(mock.runs).toBe(0);
  expect(mock.writes).toHaveLength(0);
  client.clear();
});

it("reopens stored recommendations without calling AI again", async () => {
  mock.saved = { passed: true, stale: false, updated_at: "2026-11-23T09:00:00Z", result: { passed: true, summary: "Soal aman", issues: [], initial_prompt: null, questions_text: null } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FinalCaseReview caseId="avb" /></QueryClientProvider>);
  const trigger = await screen.findByRole("button", { name: /Periksa akhir/ });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  await screen.findByText("Soal aman");
  expect(mock.runs).toBe(0);
  expect(mock.applied).toBe(0);
  client.clear();
});