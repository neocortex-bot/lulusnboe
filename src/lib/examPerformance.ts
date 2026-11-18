export const EXAM_RESULTS_PAGE_SIZE = 20;
export const EXAM_FALLBACK_POLL_MS = 30_000;
export const EXAM_AUDIO_BITS_PER_SECOND = 32_000;

// These are preferences, not exact requirements: Safari may choose its native rate.
export const EXAM_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 16_000 },
  echoCancellation: true,
  noiseSuppression: true,
};

export function resultPageRange(page: number): [number, number] {
  const start = Math.max(0, Math.floor(page)) * EXAM_RESULTS_PAGE_SIZE;
  return [start, start + EXAM_RESULTS_PAGE_SIZE - 1];
}

/** One lightweight fallback request at a time; healthy realtime does not poll. */
export function createRealtimeFallback(refresh: () => Promise<unknown>) {
  let connected = false;
  let disposed = false;
  let inFlight = false;
  const run = async () => {
    if (disposed || inFlight) return;
    inFlight = true;
    try { await refresh(); } catch (error) {
      console.warn("Exam synchronization refresh failed:", error);
    } finally { inFlight = false; }
  };
  const timer = setInterval(() => {
    if (!connected) void run();
  }, EXAM_FALLBACK_POLL_MS);
  return {
    refresh: run,
    onStatus: (status: string) => {
      if (disposed) return;
      const wasConnected = connected;
      connected = status === "SUBSCRIBED";
      if (connected && !wasConnected) void run();
    },
    dispose: () => { disposed = true; clearInterval(timer); },
  };
}