import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CaseForm from "@/components/admin/CaseForm";

const mock = vi.hoisted(() => ({ writes: [] as any[], failKey: false, marker: false }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "admin" } } }) },
  from: (table: string) => {
    let payload: any;
    const q: any = {
      select: () => q, eq: () => q,
      update: (value: any) => { payload = value; mock.writes.push({ table, payload }); return q; },
      insert: (value: any) => { payload = value; mock.writes.push({ table, payload }); return q; },
      upsert: (value: any) => { payload = value; mock.writes.push({ table, payload }); return q; },
      single: async () => {
        if (payload && "is_nboe" in payload) mock.marker = payload.is_nboe;
        return { data: { id: "case-1", is_nboe: mock.marker }, error: null };
      },
      then: (resolve: any) => Promise.resolve({ data: null, error: table === "case_answer_keys" && mock.failKey ? new Error("key save failed") : null }).then(resolve),
    };
    return q;
  },
} }));
const clients: QueryClient[] = [];
const existing = {
  id: "case-1", title: "Echo", exam_mode: "oral_board", initial_prompt: "Skenario", time_limit_seconds: 360,
  checklist_rubric: { enabled: true, items: [{ id: "stable-1", text: "Diagnosis", answer: "Jawaban privat", points: 2, isCritical: true }],
    properties: ["Stetoskop"], provided_to_candidate: [{ label: "Nadi", value: "80" }],
    digital_properties: [{ label: "EKG", value: "Hasil", needs_media: true, show_caption: true }] },
};
function mount(value: typeof existing | null = existing, close = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><CaseForm existingCase={value} onClose={close} /></QueryClientProvider>);
  return close;
}
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  mock.writes = []; mock.failKey = false; mock.marker = false;
});
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); vi.unstubAllGlobals(); });

describe("case form private digital properties", () => {
  it("saves edited and new properties privately while preserving rubric IDs, answers and other metadata", async () => {
    mount();
    fireEvent.change(screen.getByDisplayValue("Hasil"), { target: { value: "  Hasil baru  " } });
    fireEvent.click(within(screen.getByRole("region", { name: "Properti Digital" })).getByRole("button", { name: /^Tambah$/ }));
    fireEvent.change(screen.getAllByPlaceholderText("Nama pemeriksaan, mis. Tekanan darah / EKG")[1], { target: { value: "Echo" } });
    fireEvent.change(screen.getAllByPlaceholderText("Nilai/hasil, mis. 150/95 mmHg (boleh kosong bila hanya media)")[1], { target: { value: "Normal" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Perubahan" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    const privateRubric = mock.writes[1].payload.checklist_rubric;
    expect(privateRubric.items).toEqual(existing.checklist_rubric.items);
    expect(privateRubric.properties).toEqual(["Stetoskop"]);
    expect(privateRubric.provided_to_candidate).toEqual([{ label: "Nadi", value: "80" }]);
    expect(privateRubric.digital_properties).toHaveLength(2);
    expect(privateRubric.digital_properties[0]).toMatchObject({ label: "EKG", value: "Hasil baru", needs_media: true });
    expect(privateRubric.digital_properties[1]).toMatchObject({ label: "Echo", value: "Normal" });
    expect(mock.writes[0].payload.checklist_rubric.items).toEqual([{ id: "stable-1", text: "Diagnosis", points: 2, isCritical: true }]);
    expect(mock.writes[0].payload.checklist_rubric).not.toHaveProperty("digital_properties");
  });
  it("toggles the existing NBOE marker without saving the other draft fields", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Judul Soal"), { target: { value: "Belum disimpan" } });
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Soal NBOE" })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: "Soal NBOE" }));
    await waitFor(() => expect(mock.writes).toEqual([{ table: "clinical_cases", payload: { is_nboe: true } }]));
    expect(screen.getByLabelText("Judul Soal")).toHaveValue("Belum disimpan");
  });
  it.each([false, true])("creates a new case with NBOE=%s and digital properties", async checked => {
    mount(null);
    fireEvent.change(screen.getByLabelText("Judul Soal"), { target: { value: "Soal baru" } });
    if (checked) fireEvent.click(screen.getByRole("checkbox", { name: "Soal NBOE" }));
    fireEvent.click(within(screen.getByRole("region", { name: "Properti Digital" })).getByRole("button", { name: /^Tambah$/ }));
    fireEvent.change(screen.getByPlaceholderText("Nama pemeriksaan, mis. Tekanan darah / EKG"), { target: { value: "EKG" } });
    fireEvent.click(screen.getByRole("button", { name: "Buat Soal" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    expect(mock.writes[0].payload.is_nboe).toBe(checked);
    expect(mock.writes[1].payload.checklist_rubric.digital_properties[0].label).toBe("EKG");
  });
  it("does not close as successful if private property saving fails", async () => {
    mock.failKey = true;
    const close = mount();
    fireEvent.click(screen.getByRole("button", { name: "Simpan Perubahan" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Simpan Perubahan" })).toBeEnabled());
    expect(close).not.toHaveBeenCalled();
  });
});