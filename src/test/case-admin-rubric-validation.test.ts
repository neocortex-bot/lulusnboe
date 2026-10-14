import { describe, expect, it } from "vitest";
import { getRubricQualityError } from "../../supabase/functions/case-admin/rubric-validation";

const item = (points = 2, isCritical = true) => ({ points, isCritical });
const many = (n: number, points = 2, isCritical = false) =>
  Array.from({ length: n }, (_, i) => ({ text: `Butir penilaian nomor ${i + 1}`, points, isCritical: i === 0 ? true : isCritical }));

describe("case-admin flexible rubric validation", () => {
  it("treats an empty rubric as disabling checklist grading", () => {
    expect(getRubricQualityError([])).toBeNull();
  });

  it("accepts a focused 3-item rubric", () => {
    expect(getRubricQualityError(many(3))).toBeNull();
  });

  it("accepts a detailed 53-item atomic rubric", () => {
    expect(getRubricQualityError(many(53))).toBeNull();
  });

  it("rejects a 2-item rubric", () => {
    expect(getRubricQualityError(many(2, 3))).toContain("3-100");
  });

  it("requires at least 1 critical item and 6 total points", () => {
    expect(getRubricQualityError(Array.from({ length: 3 }, () => item(2, false)))).toContain("isCritical");
    expect(getRubricQualityError([item(1, true), item(1, false), item(1, false)])).toContain(">= 6");
  });

  it("rejects a rubric that repeats the same line", () => {
    const w = (text: string) => ({ text, points: 2, isCritical: true });
    expect(getRubricQualityError([w("Atropin 0.5 mg IV"), w("Kalsium glukonat"), w("Atropin 0.5 mg IV")])).toContain("duplicate");
  });
});
