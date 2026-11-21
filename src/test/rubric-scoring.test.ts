import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { coveragePoints } from "../../supabase/functions/evaluate-exam/grading-prompt";
import { scoreSchema } from "../../supabase/functions/evaluate-exam/score-schema";

const evaluateExam = readFileSync(
  resolve(process.cwd(), "supabase/functions/evaluate-exam/index.ts"),
  "utf8",
);


describe("rubric scoring: 2 full / 1 partial / 0 none", () => {
  it("caps each rubric line at 2 points", () => {
    expect(evaluateExam).toContain("const FULL_POINTS = 2");
  });

  it("awards 2 for full, 1 for partial and 0 for none", () => {
    expect(['full', 'partial', 'none'].map(coverage => coveragePoints(coverage as 'full' | 'partial' | 'none'))).toEqual([2, 1, 0]);
  });

  it("totals earned points against the ceiling", () => {
    expect(evaluateExam).toMatch(/item\.maxPoints \?\? 2/);
    expect(evaluateExam).toMatch(/item\.points \?\? 0/);
  });

  it("asks the model for a coverage level", () => {
    expect(scoreSchema.properties.items).toMatchObject({ items: { properties: { coverage: { enum: ['full', 'partial', 'none'] } } } });
  });

  it("never awards full points to a partial mention", () => {
    expect(coveragePoints('partial')).toBeLessThan(coveragePoints('full'));
  });

  it("treats any mention as passed so the footnote is not bold", () => {
    expect(evaluateExam).toMatch(/const passed = coverage !== "none"/);
  });

  it("trusts the model's coverage instead of requiring a verifiable quote", () => {
    // Requiring a verifiable quote made the same answer score differently
    // between runs and zeroed items the candidate had actually answered.
    expect(evaluateExam).toMatch(/rawCoverage === "full"/);
    expect(evaluateExam).toMatch(/rawCoverage === "partial"/);
    expect(evaluateExam).not.toMatch(/quoteOk && claimedFull/);
  });

  it("grades deterministically", () => {
    expect(evaluateExam).toContain("deterministic: true");
  });
});
