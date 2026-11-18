import { afterEach, describe, expect, it, vi } from "vitest";
import { createRealtimeFallback, resultPageRange, EXAM_AUDIO_CONSTRAINTS, EXAM_AUDIO_BITS_PER_SECOND } from "@/lib/examPerformance";

afterEach(() => vi.useRealTimers());
describe("bounded exam resources", () => {
  it("uses nonoverlapping pages of 20 results", () => {
    expect(resultPageRange(0)).toEqual([0, 19]);
    expect(resultPageRange(1)).toEqual([20, 39]);
  });
  it("requests mono 16 kHz audio at 32 kbps without exact constraints", () => {
    expect(EXAM_AUDIO_CONSTRAINTS.channelCount).toEqual({ ideal: 1 });
    expect(EXAM_AUDIO_CONSTRAINTS.sampleRate).toEqual({ ideal: 16000 });
    expect(EXAM_AUDIO_BITS_PER_SECOND).toBe(32000);
  });
  it("polls every 30 seconds only while disconnected and syncs on reconnect", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const fallback = createRealtimeFallback(refresh);
    await vi.advanceTimersByTimeAsync(29999);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    fallback.onStatus("SUBSCRIBED");
    await vi.advanceTimersByTimeAsync(90000);
    expect(refresh).toHaveBeenCalledTimes(2);
    fallback.onStatus("CHANNEL_ERROR");
    await vi.advanceTimersByTimeAsync(30000);
    expect(refresh).toHaveBeenCalledTimes(3);
    fallback.dispose();
    await vi.advanceTimersByTimeAsync(60000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
  it("never overlaps a slow fallback request", async () => {
    vi.useFakeTimers();
    let finish: (() => void) | undefined;
    const refresh = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const fallback = createRealtimeFallback(refresh);
    await vi.advanceTimersByTimeAsync(120000);
    expect(refresh).toHaveBeenCalledTimes(1);
    finish?.();
    await vi.advanceTimersByTimeAsync(30000);
    expect(refresh).toHaveBeenCalledTimes(2);
    fallback.dispose();
  });
});