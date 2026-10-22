import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Examiner from "@/pages/Examiner";
import PropertyDisplay from "@/components/station/PropertyDisplay";
import { PROPERTY_ACK_EVENT, PROPERTY_SHOW_EVENT, PROPERTY_SYNC_EVENT } from "@/lib/digitalProperties";

const mock = vi.hoisted(() => ({ rows: [] as any[], channels: [] as any[], send: vi.fn(), invalid: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin" }, isMasterAdmin: false }) }));
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
const session = (id: string) => ({ id, status: "active", current_candidate_id: id, session_start_time: null, created_at: "2026-10-22T03:00:00Z", candidate: id, station_token: id, properties: [], digital: [{ label: "EKG", value: "Normal" }], case: { title: "Soal", time_limit_seconds: 360 } });

beforeEach(() => { mock.rows = [session("Peserta A")]; mock.channels = []; mock.send.mockReset(); mock.send.mockResolvedValue("ok"); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("examiner delivery and session transitions", () => {
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
    const { container } = render(<PropertyDisplay property={{ label: "Diagnostic clue", value: "Secret answer", media_url: "/test.png", media_type: "image", show_caption: false }} />);
    expect(container.textContent).not.toContain("Secret answer");
    expect(container.textContent).not.toContain("Diagnostic clue");
    expect(screen.getByRole("img")).not.toHaveAttribute("alt", "Diagnostic clue");
  });
  it("without media, keeps the results visible even if caption was off", () => {
    const { container } = render(<PropertyDisplay property={{ label: "TD", value: "140/90", show_caption: false }} />);
    expect(container.textContent).toContain("140/90");
  });
});