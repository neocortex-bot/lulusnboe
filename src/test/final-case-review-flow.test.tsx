import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import FinalCaseReview from "@/components/admin/FinalCaseReview";
import { finalReviewState } from "@/lib/finalCaseReview";

const mock = vi.hoisted(() => ({ saved: null as any, runs: 0, applied: 0, approved: 0, manualError: null as string | null, writes: [] as any[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: mock.saved, error: null }), update: (payload: any) => { mock.writes.push({ table, payload }); return q; } }; return q; },
  rpc: async (name: string, args: any) => {
    if (name === "get_final_case_review_hash") { expect(args).toEqual({ _case_id: "avb" }); return { data: "saved-content-hash", error: null }; }
    if (name === "approve_final_case_manually") {
      expect(args).toEqual({ _case_id: "avb", _expected_hash: "saved-content-hash", _confirmed: true });
      if (mock.manualError) return { data: null, error: { message: mock.manualError } };
      mock.approved++;
      mock.saved = { passed: true, stale: false, checked_by: "admin-id", updated_at: "2026-11-23T09:00:00Z", result: { passed: true, approval_method: "manual", summary: "Persetujuan manusia tercatat.", issues: [], initial_prompt: null, questions_text: null } };
      return { data: mock.saved, error: null };
    }
    expect(name).toBe("apply_final_case_review"); expect(args).toEqual({ _case_id: "avb" }); mock.applied++; mock.saved.stale = true; return { error: null };
  },
  functions: { invoke: async (name: string, options: any) => {
    expect(name).toBe("final-case-review"); expect(options.body).toEqual({ case_id: "avb" });
    mock.runs++;
    const passed = mock.applied > 0;
    mock.saved = { passed, stale: false, updated_at: "2026-11-23T09:00:00Z", result: { passed, summary: passed ? "Soal aman" : "Hasil EKG bocor", issues: passed ? [] : [{ field: "initial_prompt", kind: "leak", quote: "EKG AV block total", reason: "Peserta harus meminta EKG" }], initial_prompt: passed ? null : "Pasien sesak.", questions_text: null } };
    return { data: mock.saved, error: null };
  } },
} }));
beforeEach(() => { mock.saved = null; mock.runs = 0; mock.applied = 0; mock.approved = 0; mock.manualError = null; mock.writes = []; });
afterEach(cleanup);

it("checks saved content, applies only trusted prompt corrections and rechecks before passing", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FinalCaseReview caseId="avb" /></QueryClientProvider>);
  const trigger = await screen.findByRole("button", { name: /Periksa akhir/ });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  expect(mock.runs).toBe(0);
  fireEvent.click(await screen.findByRole("button", { name: "Ya, analisis dengan AI" }));
  const apply = await screen.findByRole("button", { name: /Terima perbaikan/ });
  expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("blocked");
  fireEvent.click(apply);
  await waitFor(() => expect(mock.runs).toBe(2));
  await waitFor(() => expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("passed"));
  expect(mock.writes).toHaveLength(0);
  expect(mock.applied).toBe(1);
  client.clear();
});

it("reopens stored recommendations without calling AI again", async () => {
  mock.saved = { passed: true, stale: false, updated_at: "2026-11-23T09:00:00Z", result: { passed: true, summary: "Soal aman", issues: [], initial_prompt: null, questions_text: null } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FinalCaseReview caseId="avb" /></QueryClientProvider>);
  const trigger = await screen.findByRole("button", { name: /Periksa akhir/ });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole("button", { name: "Lihat hasil tersimpan" }));
  await screen.findByText("Soal aman");
  expect(mock.runs).toBe(0);
  expect(mock.applied).toBe(0);
  client.clear();
});

const openReview = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FinalCaseReview caseId="avb" /></QueryClientProvider>);
  const trigger = await screen.findByRole("button", { name: /Periksa akhir/ });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  return client;
};

it("opens confirmation and cancels without starting AI or approving anything", async () => {
  const client = await openReview();
  await screen.findByRole("button", { name: "Bypassed / setujui tanpa analisis AI" });
  expect(mock.runs).toBe(0);
  expect(mock.approved).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Batal" }));
  expect(mock.runs).toBe(0);
  expect(mock.approved).toBe(0);
  client.clear();
});

it("requires explicit human confirmation and saves manual approval without any AI call", async () => {
  const client = await openReview();
  fireEvent.click(await screen.findByRole("button", { name: "Bypassed / setujui tanpa analisis AI" }));
  const approve = await screen.findByRole("button", { name: "Ya, setujui tanpa AI" });
  await waitFor(() => expect(approve).toBeEnabled());
  expect(mock.approved).toBe(0);
  fireEvent.click(approve);
  await screen.findByText("Persetujuan manusia tercatat.");
  expect(mock.approved).toBe(1);
  expect(mock.runs).toBe(0);
  expect(mock.applied).toBe(0);
  expect(mock.writes).toHaveLength(0);
  expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("passed");
  client.clear();
});

it("does not unlock deployment if the server rejects a changed confirmation snapshot", async () => {
  mock.manualError = "Isi soal berubah selama konfirmasi.";
  const client = await openReview();
  fireEvent.click(await screen.findByRole("button", { name: "Bypassed / setujui tanpa analisis AI" }));
  const approve = await screen.findByRole("button", { name: "Ya, setujui tanpa AI" });
  await waitFor(() => expect(approve).toBeEnabled());
  fireEvent.click(approve);
  await screen.findByRole("alert");
  expect(mock.approved).toBe(0);
  expect(mock.runs).toBe(0);
  expect(finalReviewState(client.getQueryData(["final_case_review", "avb"]) as any)).toBe("unchecked");
  expect(approve).toBeDisabled();
  client.clear();
});