import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mergeAlignmentChanges } from "@/lib/rubricAlignment";
import parseRubricData from "@/lib/rubricParser";

const items = [
  { id: "a", text: "Diagnosis TGA", points: 2, isCritical: true },
  { id: "b", text: "Prostaglandin", points: 1, isCritical: false, answer: "lama" },
];

describe("rubric alignment", () => {
  it("keeps id, points and critical when accepting suggestions", () => {
    const out = mergeAlignmentChanges(items, [
      { item_id: "a", text: "Diagnosis kerja TGA", answer: "Diagnosis kerja saya TGA." },
    ]);
    expect(out[0]).toEqual({ id: "a", text: "Diagnosis kerja TGA", points: 2, isCritical: true, answer: "Diagnosis kerja saya TGA." });
  });
  it("word-by-word only change leaves text and points untouched", () => {
    const out = mergeAlignmentChanges(items, [{ item_id: "b", answer: "PGE1 0,05 mcg/kg/menit." }]);
    expect(out[1].text).toBe("Prostaglandin");
    expect(out[1].points).toBe(1);
    expect(out[1].answer).toBe("PGE1 0,05 mcg/kg/menit.");
  });
  it("ignores empty suggestions", () => {
    const out = mergeAlignmentChanges(items, [{ item_id: "b", answer: "  ", text: "" }]);
    expect(out[1]).toEqual(items[1]);
  });
  it("parser preserves word by word so saving the case does not erase it", () => {
    expect(parseRubricData({ enabled: true, items }).items[1].answer).toBe("lama");
  });
  it("exam evaluation does not depend on word by word", () => {
    const src = readFileSync("supabase/functions/evaluate-exam/index.ts", "utf8");
    expect(src).not.toMatch(/\.answer\b/);
  });
});
