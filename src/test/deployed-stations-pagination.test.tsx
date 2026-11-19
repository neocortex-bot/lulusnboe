import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeployedStationsTable from "@/components/admin/DeployedStationsTable";

const mock = vi.hoisted(() => ({ reads: [] as any[], total: 12, fail: false }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const read: any = { table, eq: [], order: [] };
  mock.reads.push(read);
  const q: any = {
    select: (columns: string, options: unknown) => { read.columns = columns; read.options = options; return q; },
    eq: (k: string, v: unknown) => { read.eq.push([k, v]); return q; },
    order: (k: string) => { read.order.push(k); return q; },
    range: (from: number, to: number) => {
      read.range = [from, to];
      if (mock.fail) return Promise.resolve({ data: null, count: null, error: new Error("down") });
      const data = Array.from({ length: Math.max(0, Math.min(to + 1, mock.total) - from) }, (_, i) => ({
        id: `s${from + i}`, station_token: `T${from + i}`, status: "waiting", clinical_cases: { title: `Case ${from + i}`, exam_mode: "oral_board" }, profiles: null,
      }));
      return Promise.resolve({ data, count: mock.total, error: null });
    },
  };
  return q;
} } }));

afterEach(() => { cleanup(); mock.reads = []; mock.total = 12; mock.fail = false; });
const mount = (mode = "oral_board") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><DeployedStationsTable examMode={mode} /></QueryClientProvider>);
  return { ...view, client };
};

describe("deployed stations server pagination", () => {
  it("filters mode and fetches only ten rows per page", async () => {
    mount(); await screen.findByText("T0");
    expect(mock.reads[0]).toMatchObject({ table: "exam_sessions", eq: [["clinical_cases.exam_mode", "oral_board"]], range: [0, 9], options: { count: "exact" } });
    expect(mock.reads[0].columns).toContain("clinical_cases!inner");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    await screen.findByText("T10");
    expect(mock.reads.at(-1).range).toEqual([10, 19]);
    expect(screen.queryByText("T0")).not.toBeInTheDocument();
  });

  it("returns to first page when mode changes", async () => {
    const { rerender, client } = mount(); await screen.findByText("T0");
    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" })); await screen.findByText("T10");
    rerender(<QueryClientProvider client={client}><DeployedStationsTable examMode="panel_exam" /></QueryClientProvider>);
    await waitFor(() => expect(mock.reads.at(-1)).toMatchObject({ eq: [["clinical_cases.exam_mode", "panel_exam"]], range: [0, 9] }));
  });

  it("shows a failure message instead of an empty deployment list", async () => {
    mock.fail = true; mount();
    expect(await screen.findByText("Daftar station gagal dimuat. Coba muat ulang.")).toBeInTheDocument();
  });

  it("clamps an empty last page after the total shrinks", async () => {
    const { client } = mount(); await screen.findByText("T0");
    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" })); await screen.findByText("T10");
    mock.total = 9;
    await client.invalidateQueries({ queryKey: ["deployed_stations"] });
    await screen.findByText("T0");
    expect(mock.reads.at(-1).range).toEqual([0, 9]);
    expect(screen.queryByText("T10")).not.toBeInTheDocument();
  });
});