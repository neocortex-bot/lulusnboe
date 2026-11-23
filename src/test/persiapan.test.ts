import { describe, expect, it } from "vitest";
import { buildPreparationRows, preparationSeed } from "@/lib/persiapan";

describe("persiapan seed", () => {
  it("imports all 48 PIKiR PADi cards", () => {
    expect(preparationSeed).toHaveLength(48);
  });
  it("keeps every rubric item at 1-2 points with at least one critical item", () => {
    for (const card of preparationSeed) {
      expect(card.items.every((i) => i.points >= 1 && i.points <= 2)).toBe(true);
      expect(card.items.some((i) => i.isCritical)).toBe(true);
    }
  });
  it("uses 10s reading and 60s answering without a vignette", () => {
    const { caseRow } = buildPreparationRows(preparationSeed[7]);
    expect(caseRow.reading_time_seconds).toBe(10);
    expect(caseRow.time_limit_seconds).toBe(60);
    expect(caseRow.initial_prompt).toBe("");
    expect(caseRow.exam_mode).toBe("preparation");
  });
  it("never exposes word-by-word answers in the candidate rubric", () => {
    const { caseRow } = buildPreparationRows(preparationSeed[0]);
    expect(JSON.stringify(caseRow.checklist_rubric)).not.toContain('"answer"');
  });
});
