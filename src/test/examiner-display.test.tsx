import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Examiner from "@/pages/Examiner";
import PropertyDisplay from "@/components/station/PropertyDisplay";
import { PROPERTY_ACK_EVENT, PROPERTY_SHOW_EVENT, PROPERTY_SYNC_EVENT } from "@/lib/digitalProperties";

const mock = vi.hoisted(() => ({ rows: [] as any[], channels: [] as any[], send: vi.fn(), invalid: vi.fn(), master: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin" }, isMasterAdmin: mock.master }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mock.rows, isLoading: false, isError: false, refetch: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: mock.invalid }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  channel: (name: string) => {
    const handlers: Record<string, (event: any) => void> = {};
    const ch = { name, handlers, on: (_: string, filter: any, fn: (event: any) => void) => { handlers[filter.event] = fn; return ch; },
      subscribe: (fn?: (status: string) => void) => { fn?.("SUBSCRIBED"); return ch; }, send: mock.send };
    mock.channels.push(ch); return ch;
  }, removeChannel: vi.fn(),
} }));
const session = (id: string) => ({ id, status: "active", examiner_id: "admin", current_candidate_id: id, session_start_time: null, created_at: "2026-10-22T03:00:00Z", candidate: id, station_token: id, properties: [], digital: [{ label: "EKG", value: "Normal" }], case: { title: "Soal", time_limit_seconds: 360 } });

beforeEach(() => { mock.master = false; mock.rows = [session("Peserta A")]; mock.channels = []; mock.send.mockReset(); mock.send.mockResolvedValue("ok"); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("examiner delivery and session transitions", () => {
  it("does not open unassigned or other examiners' sessions for the master admin", () => {
    mock.master = true;
    mock.rows = [
      { ...session("L77X55"), examiner_id: null, created_at: "2026-11-20T02:49:15Z" },
      { ...session("RF45LQ"), examiner_id: null, created_at: "2026-11-04T03:24:29Z" },
      { ...session("Penguji lain"), examiner_id: "other-admin" },
    ];
    render(<Examiner />);
    expect(mock.channels.some(ch => ch.name.startsWith("session:"))).toBe(false);
    expect(screen.queryByRole("button", { name: /L77X55|RF45LQ|Penguji lain/ })).not.toBeInTheDocument();
  });
  it("does not open an assigned station until the participant starts the exam", () => {
    mock.rows = [{ ...session("Belum mulai"), status: "waiting", current_candidate_id: null }];
    const view = render(<Examiner />);
    expect(mock.channels.some(ch => ch.name.startsWith("session:"))).toBe(false);
    mock.rows = [session("Peserta A")];
    view.rerender(<Examiner />);
    expect(screen.getByRole("heading", { name: "Peserta A" })).toBeInTheDocument();
  });
  it("overrides captions on displayed media, reconnects with the override, and restores the author's setting", async () => {
    const row = session("Peserta A");
    row.digital = [{ label: "EKG", value: "Normal", media_url: "/ekg.png", show_caption: true } as any];
    mock.rows = [row];
    render(<Examiner />);
    fireEvent.click(screen.getByRole("button", { name: /EKG/ }));
    const channel = mock.channels.find(ch => ch.name === "session:Peserta A");
    const request = mock.send.mock.calls.at(-1)?.[0].payload;
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: request.request_id } }));
    fireEvent.click(screen.getByRole("button", { name: "Hilangkan semua caption" }));
    const hidden = mock.send.mock.calls.at(-1)?.[0].payload;
    expect(hidden.property.show_caption).toBe(false);
    expect(row.digital[0]).toHaveProperty("show_caption", true);
    act(() => channel.handlers[PROPERTY_SYNC_EVENT]({ payload: {} }));
    expect(mock.send.mock.calls.at(-1)?.[0].payload.property.show_caption).toBe(false);
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: hidden.request_id } }));
    fireEvent.click(screen.getByRole("button", { name: /Caption media disembunyikan/ }));
    expect(mock.send.mock.calls.at(-1)?.[0].payload.property.show_caption).toBe(true);
  });
  it("auto-opens a reading session and keeps it when a second session appears", async () => {
    const view = render(<Examiner />);
    expect(screen.getByRole("heading", { name: "Peserta A" })).toBeInTheDocument();
    mock.rows = [session("Peserta A"), session("Peserta B")];
    view.rerender(<Examiner />);
    expect(screen.getByRole("heading", { name: "Peserta A" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sesi lain/ }));
    fireEvent.click(screen.getByRole("button", { name: /Peserta B/ }));
    expect(screen.getByRole("heading", { name: "Peserta B" })).toBeInTheDocument();
    await waitFor(() => expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({ event: PROPERTY_SHOW_EVENT, payload: expect.objectContaining({ property: null }) })));
  });
  it("requires a choice on initial entry with multiple simultaneous sessions", () => {
    mock.rows = [session("Peserta A"), session("Peserta B")];
    render(<Examiner />);
    expect(screen.queryByRole("heading", { name: "Peserta A" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Peserta A/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Peserta B/ })).toBeInTheDocument();
  });
  it("auto-opens the running exam among old waiting, completed and elapsed sessions", () => {
    mock.rows = [
      { ...session("Lama"), session_start_time: new Date(Date.now() - 360000).toISOString() },
      { ...session("Menunggu"), status: "waiting" },
      { ...session("Selesai"), status: "completed" },
      session("Peserta A"),
    ];
    render(<Examiner />);
    expect(screen.getByRole("heading", { name: "Peserta A" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lama|Menunggu|Selesai/ })).not.toBeInTheDocument();
  });
  it("leaves the room picker automatically when only one exam remains, then allows back again", () => {
    mock.rows = [session("Peserta A"), session("Peserta B")];
    const view = render(<Examiner />);
    fireEvent.click(screen.getByRole("button", { name: /Peserta A/ }));
    fireEvent.click(screen.getByRole("button", { name: /Sesi lain/ }));
    mock.rows = [session("Peserta B")];
    view.rerender(<Examiner />);
    expect(screen.getByRole("heading", { name: "Peserta B" })).toBeInTheDocument();
    mock.rows = [session("Peserta B"), session("Peserta C")];
    view.rerender(<Examiner />);
    expect(screen.getByRole("heading", { name: "Peserta B" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sesi lain/ }));
    fireEvent.click(screen.getByRole("button", { name: /Peserta C/ }));
    expect(screen.getByRole("heading", { name: "Peserta C" })).toBeInTheDocument();
  });
  it("switches to the remaining reading session when the selected answering timer expires", async () => {
    vi.useFakeTimers();
    mock.rows = [
      { ...session("Peserta A"), session_start_time: new Date(Date.now() - 359000).toISOString() },
      session("Peserta B"),
    ];
    render(<Examiner />);
    fireEvent.click(screen.getByRole("button", { name: /Peserta A/ }));
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("heading", { name: "Peserta B" })).toBeInTheDocument();
    expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({
      event: PROPERTY_SHOW_EVENT, payload: expect.objectContaining({ property: null }),
    }));
  });
  it("marks a property shown only after station acknowledgement and confirms hiding", async () => {
    render(<Examiner />);
    const button = screen.getByRole("button", { name: /EKG/ });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    const req = mock.send.mock.calls.at(-1)?.[0].payload;
    const channel = mock.channels.find(ch => ch.name === "session:Peserta A");
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: req.request_id } }));
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    const close = mock.send.mock.calls.at(-1)?.[0].payload;
    expect(close.property).toBeNull();
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: close.request_id } }));
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
  it("does not claim display when a broadcast fails", async () => {
    mock.send.mockResolvedValue("error");
    render(<Examiner />);
    const button = screen.getByRole("button", { name: /EKG/ });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).not.toBeDisabled();
  });
  it("clears examiner intent when the participant dismisses the matching modal", async () => {
    render(<Examiner />);
    const button = screen.getByRole("button", { name: /EKG/ });
    fireEvent.click(button);
    const req = mock.send.mock.calls.at(-1)?.[0].payload;
    const channel = mock.channels.find(ch => ch.name === "session:Peserta A");
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: req.request_id } }));
    expect(button).toHaveAttribute("aria-pressed", "true");
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: "stale", displayed: false } }));
    expect(button).toHaveAttribute("aria-pressed", "true");
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: req.request_id, displayed: false } }));
    expect(button).toHaveAttribute("aria-pressed", "false");
    act(() => channel.handlers[PROPERTY_SYNC_EVENT]({ payload: {} }));
    expect(mock.send.mock.calls.at(-1)?.[0].payload.property).toBeNull();
    fireEvent.click(button);
    expect(mock.send.mock.calls.at(-1)?.[0].payload.property).toEqual(expect.objectContaining({ label: "EKG" }));
  });
  it("reports a missing receipt and resends the desired property when the station reconnects", async () => {
    vi.useFakeTimers();
    render(<Examiner />);
    fireEvent.click(screen.getByRole("button", { name: /EKG/ }));
    const request = mock.send.mock.calls.at(-1)?.[0].payload;
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /EKG/ })).toHaveAttribute("aria-pressed", "false");
    const channel = mock.channels.find(ch => ch.name === "session:Peserta A");
    act(() => channel.handlers[PROPERTY_SYNC_EVENT]({ payload: {} }));
    expect(mock.send).toHaveBeenLastCalledWith({ type: "broadcast", event: PROPERTY_SHOW_EVENT, payload: request });
    await act(async () => channel.handlers[PROPERTY_ACK_EVENT]({ payload: { request_id: request.request_id } }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /EKG/ })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("participant property visibility", () => {
  it("with media and caption off, does not expose the interpretation in text or alt", () => {
    render(<PropertyDisplay property={{ label: "Diagnostic clue", value: "Secret answer", media_url: "/test.png", media_type: "image", show_caption: false }} />);
    expect(screen.queryByText("Secret answer")).not.toBeInTheDocument();
    expect(screen.queryByText("Diagnostic clue")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).not.toHaveAttribute("alt", "Diagnostic clue");
  });
  it("without media, keeps the results visible even if caption was off", () => {
    render(<PropertyDisplay property={{ label: "TD", value: "140/90", show_caption: false }} />);
    expect(screen.getByText("140/90")).toBeInTheDocument();
  });
});