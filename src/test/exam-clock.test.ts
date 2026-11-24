import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { createExamClock, examSecondsLeft } from "@/lib/examClock";

describe("shared server exam clock", () => {
  it("keeps candidate, examiner and monitor aligned despite ±2-minute device clocks", () => {
    const server = Date.parse("2026-11-24T05:20:00Z");
    const start = new Date(server).toISOString();
    const readings = [-120000, 0, 120000].map(skew => {
      let monotonic = 1000;
      const clock = createExamClock(() => monotonic);
      vi.spyOn(Date, "now").mockReturnValue(server + skew);
      clock.sample(server, 800, 1000);
      monotonic += 2000;
      return examSecondsLeft(start, 60, clock.now());
    });
    vi.restoreAllMocks();
    expect(readings).toEqual([58, 58, 58]);
  });
  it("does not expire an exam before a server sample is available", () => {
    const clock = createExamClock(() => 0);
    expect(examSecondsLeft("2026-11-24T05:20:00Z", 60, clock.now())).toBeNull();
  });
  it("resumes the same reading deadline after reload rather than granting another reading period", () => {
    const start = "2026-11-24T05:20:00Z";
    expect(examSecondsLeft(start, 120, Date.parse(start) + 90000)).toBe(30);
    expect(examSecondsLeft(start, 120, Date.parse(start) + 120000)).toBe(0);
  });
  it("catches up after suspension without counting interval ticks", () => {
    let monotonic = 0;
    const clock = createExamClock(() => monotonic);
    const server = Date.parse("2026-11-24T05:20:00Z");
    clock.sample(server, 0, 0);
    monotonic = 125000;
    expect(examSecondsLeft(new Date(server).toISOString(), 120, clock.now())).toBe(0);
  });
});