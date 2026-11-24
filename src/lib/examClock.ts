import { supabase } from "@/integrations/supabase/client";

// A monotonic, server-anchored clock: device wall-clock changes cannot move it.
export function createExamClock(monotonicNow: () => number) {
  let anchor: { server: number; monotonic: number } | null = null;
  return {
    sample(server: number, sent: number, received: number) {
      if (!Number.isFinite(server) || received < sent) return false;
      anchor = { server: server + (received - sent) / 2, monotonic: received };
      return true;
    },
    now(): number | null {
      return anchor ? anchor.server + monotonicNow() - anchor.monotonic : null;
    },
  };
}

export function examSecondsLeft(start: string, duration: number, now: number | null) {
  const end = Date.parse(start) + duration * 1000;
  if (now === null || !Number.isFinite(end)) return null;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

const clock = createExamClock(() => performance.now());
let snapshot: number | null = null;
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;
let inFlight: Promise<void> | null = null;
const publish = () => {
  snapshot = clock.now();
  listeners.forEach(listener => listener());
};
export function syncExamClock() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const sent = performance.now();
    try {
      const { data, error } = await supabase.rpc("get_exam_server_time")
        .abortSignal(AbortSignal.timeout(10_000));
      const received = performance.now();
      // Ignore very slow samples: keep the previous good anchor instead.
      if (!error && data && received - sent < 5_000) {
        clock.sample(Date.parse(data), sent, received);
        publish();
      }
    } catch { /* Retain the last server anchor during a network interruption. */ }
  })().finally(() => { inFlight = null; });
  return inFlight;
}
export function subscribeExamClock(listener: () => void) {
  listeners.add(listener);
  if (!stop) {
    void syncExamClock();
    const ticks = window.setInterval(publish, 250);
    const syncs = window.setInterval(() => void syncExamClock(), 60_000);
    const refresh = () => { publish(); void syncExamClock(); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    stop = () => {
      clearInterval(ticks); clearInterval(syncs);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { stop?.(); stop = null; }
  };
}
export const getExamClockSnapshot = () => snapshot;