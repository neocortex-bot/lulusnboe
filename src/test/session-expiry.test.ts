import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleWaitingExpiry } from "@/lib/sessionExpiry";

describe("waiting session deadline", () => {
  afterEach(() => vi.useRealTimers());
  it("wakes once after the 15 minute deadline", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => {});
    scheduleWaitingExpiry(new Date(15 * 60 * 1000).toISOString(), refresh, 0);
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 - 1);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(101);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("does not schedule active/reading sessions without a deadline", () => {
    vi.useFakeTimers();
    scheduleWaitingExpiry(null, vi.fn(async () => {}), 0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans up the deadline when the session changes", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => {});
    const cleanup = scheduleWaitingExpiry(new Date(900000).toISOString(), refresh, 0);
    cleanup();
    await vi.advanceTimersByTimeAsync(900100);
    expect(refresh).not.toHaveBeenCalled();
  });
});