import { describe, it, expect } from "vitest";
import { applyPropertySyncChanges } from "@/lib/propertySync";

const items = [
  { id: "a", text: "Sebut EF", points: 2, isCritical: true, answer: "EF 40%" },
  { id: "b", text: "Lain", points: 1, isCritical: false, answer: "x" },
];

describe("applyPropertySyncChanges", () => {
  it("keeps id, points and critical while changing answer", () => {
    const out = applyPropertySyncChanges(items, [{ index: 0, field: "answer", before: "EF 40%", after: "EF 55%", reason: "" }]);
    expect(out[0]).toEqual({ id: "a", text: "Sebut EF", points: 2, isCritical: true, answer: "EF 55%" });
    expect(out[1]).toBe(items[1]);
  });
  it("ignores unknown indexes", () => {
    const out = applyPropertySyncChanges(items, [{ index: 9, field: "text", before: "", after: "z", reason: "" }]);
    expect(out).toEqual(items);
  });
});
