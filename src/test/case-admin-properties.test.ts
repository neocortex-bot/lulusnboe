import { describe, it, expect } from "vitest";
import { mergeProperties } from "../../supabase/functions/case-admin/properties";

describe("case-admin properti fisik", () => {
  it("membaca dari kolom clinical_cases walau answer key kosong", () => {
    expect(mergeProperties(["A", "B"], undefined)).toEqual(["A", "B"]);
  });
  it("menggabungkan dua lokasi tanpa duplikat, kolom dulu", () => {
    expect(mergeProperties(["A", "B"], ["B", "C"])).toEqual(["A", "B", "C"]);
  });
  it("tetap utuh bila hanya answer key yang berisi", () => {
    expect(mergeProperties([], ["X"])).toEqual(["X"]);
  });
});
