import { describe, expect, it } from "vitest";
import { applyItemScore, coverageForPoints, scoreChoices, PASS_THRESHOLD, type ScoreReport } from "@/lib/rubricScore";

const baseReport: ScoreReport = {
  items: [
    { item: "Anamnesis lengkap", passed: true, points: 2, maxPoints: 2, coverage: "full", isCritical: true },
    { item: "Pemeriksaan fisis", passed: true, points: 1, maxPoints: 2, coverage: "partial" },
    { item: "Diagnosis banding", passed: false, points: 0, maxPoints: 2, coverage: "none" },
  ],
  totalScore: 3,
  totalPossible: 6,
  score: 50,
  passStatus: "TIDAK LULUS",
  hasCriticalFail: false,
};

describe("admin rubric override", () => {
  it("offers every integer score from 0 to maxPoints", () => {
    expect(scoreChoices(2)).toEqual([0, 1, 2]);
    expect(scoreChoices(5)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("maps points to coverage labels", () => {
    expect(coverageForPoints(0, 2)).toBe("none");
    expect(coverageForPoints(1, 2)).toBe("partial");
    expect(coverageForPoints(2, 2)).toBe("full");
  });

  it("recalculates total and final score after one item changes", () => {
    const updated = applyItemScore(baseReport, 2, 2);
    expect(updated.items[2].points).toBe(2);
    expect(updated.items[2].coverage).toBe("full");
    expect(updated.totalScore).toBe(5);
    expect(updated.totalPossible).toBe(6);
    expect(updated.score).toBe(83);
    expect(updated.passStatus).toBe("LULUS");
  });

  it("fails the candidate when a critical item is set to 0", () => {
    const updated = applyItemScore(baseReport, 0, 0);
    expect(updated.hasCriticalFail).toBe(true);
    expect(updated.passStatus).toBe("TIDAK LULUS");
  });

  it("clamps out-of-range points to the item maximum", () => {
    const updated = applyItemScore(baseReport, 1, 99);
    expect(updated.items[1].points).toBe(2);
  });

  it("passes only at or above the 68 threshold", () => {
    // 4/6 = 67% -> below threshold
    const at67 = applyItemScore(baseReport, 2, 1);
    expect(at67.score).toBe(67);
    expect(at67.passStatus).toBe("TIDAK LULUS");
    expect(PASS_THRESHOLD).toBe(68);
  });

  it("does not mutate the original report", () => {
    applyItemScore(baseReport, 0, 0);
    expect(baseReport.items[0].points).toBe(2);
    expect(baseReport.totalScore).toBe(3);
  });
});
