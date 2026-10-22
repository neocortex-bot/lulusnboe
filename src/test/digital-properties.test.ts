import { describe, it, expect } from "vitest";
import { parseDigitalProperties, isMediaPending, isCaptionVisible } from "@/lib/digitalProperties";
describe("digital properties", () => {
  it("text-only flagged as needing media is admin homework", () => {
    expect(isMediaPending({ label: "EKG", value: "", needs_media: true })).toBe(true);
  });
  it("uploaded media clears the homework flag", () => {
    expect(isMediaPending({ label: "EKG", value: "", needs_media: true, media_url: "https://x/a.png" })).toBe(false);
  });
  it("parses missing list as empty", () => {
    expect(parseDigitalProperties({ items: [] })).toEqual([]);
  });
  it("caption hidden only when media exists", () => {
    expect(isCaptionVisible({ label: "EKG", value: "x", show_caption: false, media_url: "https://x/a.png" })).toBe(false);
    expect(isCaptionVisible({ label: "EKG", value: "x", show_caption: false })).toBe(true);
  });
});
