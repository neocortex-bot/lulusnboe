import { describe, expect, it, vi } from "vitest";
import { getCaseMediaReadiness, runAndRecordPropertyCheck } from "@/lib/caseReadiness";

describe("case readiness", () => {
  it("marks required media complete only when every required property has an uploaded URL", () => {
    expect(getCaseMediaReadiness({ digital_properties: [
      { needs_media: true, media_url: "https://example.test/echo.mp4" },
      { needs_media: true, media_url: " " },
      { needs_media: false, media_url: null },
    ] })).toEqual({ required: 2, completed: 1, ready: false });
    expect(getCaseMediaReadiness({ digital_properties: [
      { needs_media: true, media_url: "https://example.test/echo.mp4" },
    ] })).toEqual({ required: 1, completed: 1, ready: true });
  });
  it("does not mark cases with no required media as media completed", () => {
    expect(getCaseMediaReadiness(null)).toEqual({ required: 0, completed: 0, ready: false });
    expect(getCaseMediaReadiness({ digital_properties: [{ needs_media: false, media_url: " " }] }).ready).toBe(false);
  });
  it("counts an already uploaded EKG even if its old needs-media flag is false or missing", () => {
    for (const needs_media of [false, undefined]) {
      expect(getCaseMediaReadiness({ digital_properties: [{ label: "EKG TAVB", needs_media, media_url: "ekg.jpg" }] }))
        .toEqual({ required: 1, completed: 1, ready: true });
    }
  });
  it("records a successful check and returns its suggestions unchanged", async () => {
    const result = { items: [{ after: "EF 55%" }] };
    const record = vi.fn().mockResolvedValue(undefined);
    expect(await runAndRecordPropertyCheck(async () => result, record)).toBe(result);
    expect(record).toHaveBeenCalledOnce();
    expect(Number.isNaN(Date.parse(record.mock.calls[0][0]))).toBe(false);
  });
  it("does not persist a failed AI attempt as a successful check", async () => {
    const record = vi.fn();
    await expect(runAndRecordPropertyCheck(async () => { throw new Error("AI failed"); }, record)).rejects.toThrow("AI failed");
    expect(record).not.toHaveBeenCalled();
  });
  it("reports persistence failure rather than claiming the check was recorded", async () => {
    await expect(runAndRecordPropertyCheck(async () => ({}), async () => { throw new Error("save failed"); })).rejects.toThrow("save failed");
  });
});