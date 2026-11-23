import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import SessionManager from "@/components/admin/SessionManager";

const mock = vi.hoisted(() => ({ calls: [] as any[], fail: false }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/admin/DeployedStationsTable", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: (_: string, args: any) => { mock.calls.push(args); return Promise.resolve({ data: args._stations, error: null }); },
  from: (table: string) => {
    let role = "";
    const result = () => ({ data: table === "user_roles" ? (role === "admin" ? [{ user_id: "admin-self" }, { user_id: "admin-other" }] : [])
      : table === "profiles" ? [{ id: "admin-self", full_name: "Admin A" }, { id: "admin-other", full_name: "Admin B" }]
      : table === "clinical_cases" ? [{ id: "c1", title: "Soal 1", exam_mode: "oral_board", case_final_reviews: { passed: true, stale: false } }] : [],
      error: mock.fail && table === "user_roles" && role === "admin" ? new Error("permission denied") : null });
    const q: any = { select: () => q, eq: (key: string, value: string) => { if (key === "role") role = value; return q; },
      in: () => q, ilike: () => q, order: () => q, maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve(result()).then(resolve) };
    return q;
  },
} }));
afterEach(() => { cleanup(); mock.calls = []; mock.fail = false; });
const setup = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SessionManager examMode="oral_board" /></QueryClientProvider>);

it("lets an admin choose another admin and persists their ID in every deployed station", async () => {
  setup();
  fireEvent.click(await screen.findByRole("button", { name: "Soal 1" }));
  await screen.findByRole("option", { name: "Admin B" });
  fireEvent.change(screen.getByLabelText("Penguji (opsional)"), { target: { value: "admin-other" } });
  fireEvent.click(screen.getByRole("button", { name: "Deploy 1 Station Oral Board" }));
  await waitFor(() => expect(mock.calls).toHaveLength(1));
  expect(mock.calls[0]._stations).toHaveLength(1);
  expect(mock.calls[0]._stations[0].examiner_id).toBe("admin-other");
});

it("does not silently present a permission failure as an empty examiner directory", async () => {
  mock.fail = true; setup();
  fireEvent.click(await screen.findByRole("button", { name: "Soal 1" }));
  await screen.findByText("Daftar penguji gagal dimuat. Muat ulang halaman untuk mencoba lagi.");
  expect(screen.getByLabelText("Penguji (opsional)")).toBeDisabled();
  expect(mock.calls).toHaveLength(0);
});