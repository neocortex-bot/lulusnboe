import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import SessionManager from "@/components/admin/SessionManager";

const mock = vi.hoisted(() => ({ calls: [] as any[], inserts: 0 }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/admin/DeployedStationsTable", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: (_name: string, args: any) => { mock.calls.push(args); return Promise.resolve(mock.calls.length === 1 ? { data: null, error: new Error("jaringan putus") } : { data: args._stations, error: null }); },
  from: (table: string) => { const q: any = { select: () => q, eq: () => q, ilike: () => q, in: () => q, order: () => q, insert: () => { mock.inserts++; return q; }, maybeSingle: () => Promise.resolve({ data: null, error: null }), then: (r: any) => Promise.resolve({ data: table === "clinical_cases" ? Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, title: `Soal ${i + 1}`, exam_mode: "oral_board", category: null })) : [], error: null }).then(r) }; return q; },
} }));
afterEach(() => { cleanup(); mock.calls = []; mock.inserts = 0; });

it("deploys six questions atomically and retries with the same request", async () => {
  render(<QueryClientProvider client={new QueryClient()}><SessionManager examMode="oral_board" /></QueryClientProvider>);
  for (let i = 1; i <= 6; i++) fireEvent.click(await screen.findByRole("button", { name: `Soal ${i}` }));
  const deploy = await screen.findByRole("button", { name: /Deploy 6 Station/ });
  fireEvent.click(deploy);
  await waitFor(() => expect(mock.calls).toHaveLength(1));
  await waitFor(() => expect(deploy).toBeEnabled());
  fireEvent.click(deploy);
  await waitFor(() => expect(mock.calls).toHaveLength(2));
  expect(mock.calls[0]._stations).toHaveLength(6);
  expect(mock.calls[1]).toEqual(mock.calls[0]);
  expect(mock.inserts).toBe(0);
});
