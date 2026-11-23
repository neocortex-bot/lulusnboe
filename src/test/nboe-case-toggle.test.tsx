import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NboeCaseToggle from "@/components/admin/NboeCaseToggle";

const mock = vi.hoisted(() => ({ value: false, period: null as string | null, writes: [] as unknown[], fail: false }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    let payload: { is_nboe: boolean; nboe_period: string | null } | undefined;
    const q = {
      select: () => q, eq: () => q,
      update: (next: { is_nboe: boolean; nboe_period: string | null }) => { payload = next; mock.writes.push(next); return q; },
      single: async () => {
        if (payload && mock.fail) return { data: null, error: new Error("save failed") };
        if (payload) { mock.value = payload.is_nboe; mock.period = payload.nboe_period; }
        return { data: { is_nboe: mock.value, nboe_period: mock.period }, error: null };
      },
    };
    return q;
  },
} }));
beforeEach(() => { mock.value = false; mock.period = null; mock.fail = false; mock.writes = []; });
afterEach(cleanup);
const setup = (canEdit = true) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["clinical_case_preview", "case-1"], { title: "Unsaved editing data", checklist_rubric: { items: [{ points: 2 }] } });
  const view = render(<QueryClientProvider client={client}><NboeCaseToggle caseId="case-1" canEdit={canEdit} /></QueryClientProvider>);
  return { client, view };
};
describe("NBOE case marker", () => {
  it("saves and removes only the NBOE flag and reads the persisted marker after reopening", async () => {
    const { client, view } = setup();
    const checkbox = screen.getByRole("checkbox");
    await waitFor(() => expect(checkbox).toBeEnabled());
    fireEvent.click(checkbox);
    expect(mock.writes).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "September 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan periode" }));
    await waitFor(() => expect(checkbox).toBeChecked());
    expect(mock.writes).toEqual([{ is_nboe: true, nboe_period: "2026-09" }]);
    expect(client.getQueryData(["clinical_case_preview", "case-1"])).toEqual({ title: "Unsaved editing data", checklist_rubric: { items: [{ points: 2 }] } });
    view.unmount(); client.clear();
    const next = setup();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    expect(mock.writes).toEqual([{ is_nboe: true, nboe_period: "2026-09" }, { is_nboe: false, nboe_period: null }]);
    next.client.clear();
  });
  it("canceling does not mark a case or write a period", async () => {
    const { client } = setup();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Juni 2023" }));
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(mock.writes).toEqual([]);
    expect(mock.value).toBe(false);
    client.clear();
  });
  it("changes the saved period without rewriting the rubric", async () => {
    mock.value = true; mock.period = "2023-06";
    const { client } = setup();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
    fireEvent.click(screen.getByRole("button", { name: "Ubah periode NBOE" }));
    fireEvent.click(screen.getByRole("button", { name: "September 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan periode" }));
    await waitFor(() => expect(mock.period).toBe("2026-09"));
    expect(mock.writes).toEqual([{ is_nboe: true, nboe_period: "2026-09" }]);
    client.clear();
  });
  it("does not allow read-only visitors to change the marker", async () => {
    const { client } = setup(false);
    await waitFor(() => expect(client.getQueryData(["case_nboe", "case-1"])).toEqual({ is_nboe: false, nboe_period: null }));
    expect(screen.getByRole("checkbox")).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(mock.writes).toEqual([]);
    client.clear();
  });
  it("keeps the saved value unchanged when saving fails", async () => {
    const { client } = setup();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    mock.fail = true;
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Juni 2023" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan periode" }));
    await waitFor(() => expect(mock.writes).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Batal" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    expect(mock.value).toBe(false);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    client.clear();
  });
});