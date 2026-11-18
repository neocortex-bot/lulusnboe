import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResultsViewer from "@/components/admin/ResultsViewer";

const mock = vi.hoisted(() => ({ requests: [] as any[], clients: [] as any[] }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    const request: any = { filters: [] };
    mock.requests.push(request);
    const query: any = {
      select: (columns: string) => { request.columns = columns; return query; },
      eq: (key: string, value: string) => { request.filters.push([key, value]); return query; },
      order: () => query,
      range: (from: number, to: number) => {
        request.range = [from, to];
        return Promise.resolve({ count: 45, error: null, data: Array.from({ length: 20 }, (_, i) => ({
          id: String(from + i), score: 76, passStatus: "LULUS", totalScore: 26, totalPossible: 34,
          audio_file_url: null, profiles: { full_name: `Peserta ${from + i}` },
          exam_sessions: { status: "completed", clinical_cases: { title: "Echo", exam_mode: "oral_board" } },
        })) });
      },
      single: () => Promise.resolve({ error: null, data: {
        id: request.filters[0][1], transcript: "Jawaban peserta lengkap", audio_file_url: null,
        ai_score_report: { items: [{ item: "Diagnosis", points: 2, maxPoints: 2, passed: true }], score: 76 },
      } }),
    };
    return query;
  },
  channel: () => {
    const channel: any = { on: () => channel, subscribe: () => channel };
    return channel;
  },
  removeChannel: vi.fn(),
} }));

beforeEach(() => { mock.requests = []; });
afterEach(() => { cleanup(); mock.clients.forEach(client => client.clear()); mock.clients = []; });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock.clients.push(client);
  render(<QueryClientProvider client={client}><ResultsViewer examMode="oral_board" /></QueryClientProvider>);
  return client;
}
describe("result list memory", () => {
  it("fetches 20 summaries filtered by exam mode and loads full data only on expansion", async () => {
    const client = mount();
    await screen.findByText("Peserta 0");
    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0].range).toEqual([0, 19]);
    expect(mock.requests[0].filters).toContainEqual(["exam_sessions.clinical_cases.exam_mode", "oral_board"]);
    expect(mock.requests[0].columns.split(", ")).not.toContain("transcript");
    expect(mock.requests[0].columns.split(", ")).not.toContain("ai_score_report");
    fireEvent.click(screen.getByText("Peserta 0"));
    await screen.findByText("Jawaban peserta lengkap");
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[1].columns).toBe("id, transcript, ai_score_report, audio_file_url");
    fireEvent.click(screen.getByText("Peserta 0"));
    await waitFor(() => expect(client.getQueryData(["exam_result_detail", "0"])).toBeUndefined());
    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    await screen.findByText("Peserta 20");
    expect(mock.requests.at(-1).range).toEqual([20, 39]);
    expect(screen.queryByText("Peserta 0")).not.toBeInTheDocument();
  });
});