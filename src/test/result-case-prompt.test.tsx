import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResultCasePrompt from "@/components/exam/ResultCasePrompt";
import CandidateResultsList from "@/components/exam/CandidateResultsList";
import ResultsViewer from "@/components/admin/ResultsViewer";

const mock = vi.hoisted(() => ({
  reads: [] as { table: string; columns: string; filters: [string, unknown][] }[],
  allowed: false,
  failPrompt: false,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "participant" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/exam/ModelAnswerPanel", () => ({ default: () => null }));
vi.mock("@/components/exam/DetailedFeedbackDisplay", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const read = { table, columns: "", filters: [] as [string, unknown][] };
    mock.reads.push(read);
    const result = () => {
      if (read.columns.includes("initial_prompt")) return {
        data: { exam_sessions: { clinical_cases: { initial_prompt: "Pasien sesak sejak dua hari.", questions_text: "1. Apa diagnosisnya?\n2. Apa tatalaksananya?" } } },
        error: mock.failPrompt ? new Error("offline") : null,
      };
      if (read.columns === "id, transcript, ai_score_report, audio_file_url") return {
        data: { id: "result-1", transcript: "Jawaban peserta", ai_score_report: null, audio_file_url: null }, error: null,
      };
      return { data: [{ id: "result-1", created_at: "2026-11-20T03:00:00Z", ai_score_report: null, transcript: "Jawaban peserta", audio_file_url: null,
        profiles: { full_name: "Peserta Uji" }, exam_sessions: { status: "completed", show_results_to_candidate_override: mock.allowed,
          clinical_cases: { title: "Soal", exam_mode: "oral_board", show_results_to_candidate: false } } }], error: null, count: 1 };
    };
    const q: any = {
      select: (columns: string) => { read.columns = columns; return q; },
      eq: (key: string, value: unknown) => { read.filters.push([key, value]); return q; },
      order: () => q, range: () => q,
      abortSignal: () => q,
      single: () => Promise.resolve(result()),
      then: (resolve: any) => Promise.resolve(result()).then(resolve),
    };
    return q;
  },
  channel: () => { const ch: any = { on: () => ch, subscribe: () => ch }; return ch; },
  removeChannel: vi.fn(),
} }));

const clients: QueryClient[] = [];
function mount(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
const promptReads = () => mock.reads.filter(r => r.columns.includes("initial_prompt"));
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); mock.reads = []; mock.allowed = false; mock.failPrompt = false; });

describe("result case context loading", () => {
  it("loads only selected result vignette/questions on demand, not answer keys", async () => {
    mount(<ResultCasePrompt resultId="selected-result" />);
    expect(promptReads()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Vignette dan pertanyaan" }));
    await screen.findByText("Pasien sesak sejak dua hari.");
    expect(promptReads()).toEqual([{ table: "exam_results", columns: "exam_sessions:session_id(clinical_cases:case_id(initial_prompt, questions_text))", filters: [["id", "selected-result"]] }]);
    expect(mock.reads.some(r => r.table === "case_answer_keys")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Vignette dan pertanyaan" }));
    expect(screen.queryByText("Pasien sesak sejak dua hari.")).not.toBeInTheDocument();
  });

  it("allows retry without touching the result after a failed prompt request", async () => {
    mock.failPrompt = true;
    mount(<ResultCasePrompt resultId="selected-result" />);
    fireEvent.click(screen.getByRole("button", { name: "Vignette dan pertanyaan" }));
    await screen.findByText("Soal gagal dimuat.");
    mock.failPrompt = false;
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    await screen.findByText("Pasien sesak sejak dua hari.");
    expect(promptReads()).toHaveLength(2);
  });

  it("never mounts or fetches case context when candidate results are not allowed", async () => {
    mount(<CandidateResultsList />);
    const result = await screen.findByRole("button", { name: /Ujian/ });
    expect(result).toBeDisabled();
    fireEvent.click(result);
    expect(screen.queryByRole("button", { name: "Vignette dan pertanyaan" })).not.toBeInTheDocument();
    expect(promptReads()).toHaveLength(0);
  });

  it("loads context for allowed candidate results only after opening the prompt", async () => {
    mock.allowed = true;
    mount(<CandidateResultsList />);
    fireEvent.click(await screen.findByRole("button", { name: /Ujian/ }));
    expect(promptReads()).toHaveLength(0);
    fireEvent.click(await screen.findByRole("button", { name: "Vignette dan pertanyaan" }));
    await screen.findByText("Pasien sesak sejak dua hari.");
    expect(promptReads()[0].filters).toEqual([["id", "result-1"]]);
  });

  it("leaves admin summaries light and loads context for the expanded result", async () => {
    mount(<ResultsViewer examMode="oral_board" />);
    fireEvent.click(await screen.findByText("Peserta Uji"));
    await screen.findByText("Jawaban peserta");
    expect(promptReads()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Vignette dan pertanyaan" }));
    await screen.findByText("Pasien sesak sejak dua hari.");
    await waitFor(() => expect(promptReads()[0].filters).toEqual([["id", "result-1"]]));
  });
});