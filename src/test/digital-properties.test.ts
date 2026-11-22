import { describe, it, expect } from "vitest";
import { parseDigitalProperties, isMediaPending, isCaptionVisible, withExaminerCaptionOverride } from "@/lib/digitalProperties";
describe("digital properties", () => {
  it("examiner override hides captions for image, video and audio without changing saved properties", () => {
    for (const media_type of ["image", "video", "audio"] as const) {
      const property = { label: "Pemeriksaan", value: "Hasil", media_url: "/media", media_type, show_caption: true };
      expect(isCaptionVisible(withExaminerCaptionOverride(property, true))).toBe(false);
      expect(property.show_caption).toBe(true);
      expect(withExaminerCaptionOverride(property, false)).toBe(property);
    }
  });
  it("examiner override never hides text-only results", () => {
    expect(isCaptionVisible(withExaminerCaptionOverride({ label: "TD", value: "140/90", show_caption: true }, true))).toBe(true);
  });
  it("text-only flagged as needing media is admin homework", () => {
    expect(isMediaPending({ label: "EKG", value: "", needs_media: true })).toBe(true);
  });
  it("uploaded media clears the homework flag", () => {
    expect(isMediaPending({ label: "EKG", value: "", needs_media: true, media_url: "https://x/a.png" })).toBe(false);
  });
  it("parses missing list as empty", () => {
    expect(parseDigitalProperties({ items: [] })).toEqual([]);
  });
  it("defaults legacy media without a caption choice to hidden but preserves an explicit choice", () => {
    const properties = parseDigitalProperties({ digital_properties: [
      { label: "EKG", media_url: "ekg.jpg" },
      { label: "Echo", media_url: "echo.mp4", show_caption: true },
      { label: "Nadi", value: "80" },
    ] });
    expect(properties.map(p => p.show_caption)).toEqual([false, true, true]);
  });
  it("caption hidden only when media exists", () => {
    expect(isCaptionVisible({ label: "EKG", value: "x", show_caption: false, media_url: "https://x/a.png" })).toBe(false);
    expect(isCaptionVisible({ label: "EKG", value: "x", show_caption: false })).toBe(true);
  });
});
