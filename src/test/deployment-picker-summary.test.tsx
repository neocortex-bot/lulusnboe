import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import SessionManager from "@/components/admin/SessionManager";

const mock = vi.hoisted(() => ({ reads: [] as { table: string; columns?: string; filters: [string, unknown][] }[] }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/admin/DeployedStationsTable", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const read = { table, columns: "", filters: [] as [string, unknown][] };
    mock.reads.push(read);
    const result = () => ({ data: table === "clinical_cases" ? [{ id: "echo", title: "Echo HOCM", exam_mode: "oral_board", category: "echo" }] : [], error: null });
    const q: any = {
      select: (columns: string) => { read.columns = columns; return q; },
      eq: (key: string, value: unknown) => { read.filters.push([key, value]); return q; },
      ilike: () => q, in: () => q, order: () => q,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve(result()).then(resolve),
    };
    return q;
  },
} }));

afterEach(() => { cleanup(); mock.reads = []; });
describe("deployment summary picker", () => {
  it("isolates cache, loads only published mode summaries and keeps selections usable", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["clinical_cases"], [{ id: "old", title: "Unrelated full admin case" }]);
    render(<QueryClientProvider client={client}><SessionManager examMode="oral_board" /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Echo HOCM" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Deploy 1 Station Oral Board" })).toBeEnabled());
    expect(mock.reads.filter(r => r.table === "clinical_cases")).toEqual([
      { table: "clinical_cases", columns: "id, title, exam_mode, category, is_nboe", filters: [["status", "published"], ["exam_mode", "oral_board"]] },
    ]);
    expect(mock.reads.some(r => r.table === "case_answer_keys")).toBe(false);
    expect(client.getQueryData(["clinical_cases", "deployment_picker", "oral_board"])).toEqual([{ id: "echo", title: "Echo HOCM", exam_mode: "oral_board", category: "echo" }]);
    expect(client.getQueryData(["clinical_cases"])).toEqual([{ id: "old", title: "Unrelated full admin case" }]);
    client.clear();
  });
});