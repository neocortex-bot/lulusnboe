import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PreReview from "@/pages/admin/PreReview";

const mock = vi.hoisted(() => ({ cases: [] as any[], keys: [] as any[], writes: [] as any[], keyError: null as unknown }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-test" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    let write: any;
    const query: any = {
      select: () => query,
      eq: () => query,
      in: () => query,
      order: () => query,
      update: (payload: any) => { write = { table, payload }; mock.writes.push(write); return query; },
      upsert: (payload: any) => { write = { table, payload }; mock.writes.push(write); return query; },
      then: (resolve: any) => Promise.resolve(write
        ? { data: null, error: null }
        : { data: table === "clinical_cases" ? mock.cases : mock.keys, error: table === "case_answer_keys" ? mock.keyError : null }).then(resolve),
    };
    return query;
  },
} }));

const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<MemoryRouter><QueryClientProvider client={client}><PreReview /></QueryClientProvider></MemoryRouter>);
}
function fixture(count: number) {
  const items = Array.from({ length: count }, (_, i) => ({ text: `Kriteria ${i + 1}`, points: i === 0 ? 1 : 2, isCritical: i === 1 }));
  const c = { id: `soal-${count}`, title: `Soal dengan ${count} butir`, exam_mode: "oral_board", initial_prompt: "Skenario lengkap", questions_text: "1. Diagnosis?", answer_key_text: "Jawaban lengkap station.", checklist_rubric: { enabled: true, items } };
  const k = { case_id: c.id, checklist_rubric: { enabled: true, properties: ["Properti fisik"], digital_properties: [], items: items.map((it, i) => ({ ...it, answer: `Kalimat jawaban ${i + 1}` })) } };
  return { c, k };
}
beforeEach(() => {
  mock.cases = []; mock.keys = []; mock.writes = []; mock.keyError = null;
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); vi.restoreAllMocks(); });

describe("pre-review private Word by Word", () => {
  it.each([false, true])("preserves private digital cards and rubric IDs when publish=%s", async publish => {
    const { c, k } = fixture(3);
    const digital_properties = [
      { label: "EKG 1 — 12 sadapan", value: "Hasil EKG", media_url: null, media_type: null, needs_media: true, show_caption: true },
      { label: "EKG 2 — strip saat kejadian", value: "Strip EKG", media_url: null, media_type: null, needs_media: true, show_caption: true },
    ];
    const items = k.checklist_rubric.items.map((item, i) => ({ ...item, id: `rubric-${i}` }));
    mock.cases = [c]; mock.keys = [{ ...k, checklist_rubric: { ...k.checklist_rubric, items, digital_properties } }];
    mount(); await screen.findByText(c.title); fireEvent.click(screen.getByText(c.title));
    fireEvent.click(screen.getByRole("button", { name: publish ? "Submit & Ingest" : "Simpan draft" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    expect(mock.writes[1].payload.checklist_rubric).toEqual({ ...k.checklist_rubric, items, digital_properties });
    expect(mock.writes[0].payload.checklist_rubric.items).toEqual(items.map(({ answer, ...rest }) => rest));
    expect(mock.writes[0].payload.checklist_rubric).not.toHaveProperty("digital_properties");
  });

  it("cleans digital cards and never loads candidate-readable digital properties", async () => {
    const { c, k } = fixture(3);
    mock.cases = [{ ...c, checklist_rubric: { ...c.checklist_rubric, digital_properties: [{ label: "Do not load" }] } }];
    mock.keys = [{ ...k, checklist_rubric: { ...k.checklist_rubric, digital_properties: [
      { label: "  Bubble test  ", value: "  Hasil pemeriksaan  ", needs_media: true },
      { label: "  ", value: "  " },
      { label: "Media", value: "", media_url: "https://example.test/echo.mp4", media_type: "video", show_caption: false },
    ] } }];
    mount(); await screen.findByText(c.title); fireEvent.click(screen.getByText(c.title));
    fireEvent.click(screen.getByRole("button", { name: "Simpan draft" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    const cards = mock.writes[1].payload.checklist_rubric.digital_properties;
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ label: "Bubble test", value: "Hasil pemeriksaan", needs_media: true });
    expect(cards[1]).toMatchObject({ media_url: "https://example.test/echo.mp4", media_type: "video", show_caption: false });
    expect(mock.writes[1].payload.checklist_rubric.items).toEqual(k.checklist_rubric.items);
    expect(mock.writes[1].payload.checklist_rubric.properties).toEqual(["Properti fisik"]);
  });

  it.each([17, 14, 10])("loads all %i answers from private rubric and preserves them on publish", async count => {
    const { c, k } = fixture(count);
    mock.cases = [c]; mock.keys = [k]; mount();
    await screen.findByText(c.title);
    fireEvent.click(screen.getByText(c.title));
    fireEvent.mouseDown(screen.getByRole("tab", { name: `3. Daftar Tilik (${count})` }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(screen.getByDisplayValue(`Kalimat jawaban ${count}`)).toBeInTheDocument());
    const answers = screen.getAllByRole("textbox").filter(el => (el as HTMLTextAreaElement).value.startsWith("Kalimat jawaban"));
    expect(answers).toHaveLength(count);
    fireEvent.click(screen.getByRole("button", { name: "Submit & Ingest" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    expect(mock.writes[0].payload.status).toBe("published");
    expect(mock.writes[0].payload.checklist_rubric.items).toEqual(c.checklist_rubric.items);
    expect(mock.writes[0].payload.checklist_rubric.items.every((it: any) => !("answer" in it))).toBe(true);
    expect(mock.writes[1].payload.checklist_rubric).toEqual(k.checklist_rubric);
  });

  it("saves draft answers privately and uses clinical rubric fallback per missing field", async () => {
    const { c, k } = fixture(3);
    const legacyItems = c.checklist_rubric.items.map((it, i) => ({ ...it, answer: `Jawaban lama ${i + 1}` }));
    mock.cases = [{ ...c, checklist_rubric: { items: legacyItems } }];
    mock.keys = [{ ...k, checklist_rubric: { properties: ["Properti fisik"], items: [{ answer: "Jawaban privat" }, {}, { answer: "" }] } }];
    mount(); await screen.findByText(c.title); fireEvent.click(screen.getByText(c.title));
    fireEvent.click(screen.getByRole("button", { name: "Simpan draft" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    expect(mock.writes[0].payload.status).toBe("prereview");
    expect(mock.writes[0].payload.checklist_rubric.items).toEqual(c.checklist_rubric.items);
    expect(mock.writes[1].payload.checklist_rubric.items.map((it: any) => it.answer)).toEqual(["Jawaban privat", "Jawaban lama 2", ""]);
  });

  it.each(["object", "array", "empty-private"])("supports old %s rubric without private items", async format => {
    const { c } = fixture(3);
    const items = c.checklist_rubric.items.map((it, i) => ({ ...it, answer: `Jawaban lama ${i + 1}` }));
    mock.cases = [{ ...c, checklist_rubric: format === "array" ? items : { items } }];
    if (format === "empty-private") mock.keys = [{ case_id: c.id, checklist_rubric: { items: [] } }];
    mount(); await screen.findByText(c.title); fireEvent.click(screen.getByText(c.title));
    fireEvent.click(screen.getByRole("button", { name: "Submit & Ingest" }));
    await waitFor(() => expect(mock.writes).toHaveLength(2));
    expect(mock.writes[1].payload.checklist_rubric.items).toEqual(items);
    expect(mock.writes[0].payload.checklist_rubric.items).toEqual(c.checklist_rubric.items);
  });
});