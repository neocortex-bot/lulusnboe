import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ingest = readFileSync(resolve(process.cwd(), "supabase/functions/ingest-case/index.ts"), "utf8");
const admin = readFileSync(resolve(process.cwd(), "supabase/functions/case-admin/index.ts"), "utf8");

// The admin UI (CaseManager / CategoryFilter / CategoryPicker) reads and writes
// clinical_cases.category, but the edge functions previously ignored the field:
// zod strips keys that are not declared, so an agent push or PATCH silently lost
// the category. These tests pin the contract on both endpoints.
describe("category is writable through the agent API", () => {
  it("ingest-case declares and persists category", () => {
    expect(ingest).toMatch(/category:\s*z\.string\(\)\.max\(100\)\.optional\(\)/);
    expect(ingest).toMatch(/category:\s*data\.category\s*\?\?\s*null/);
  });

  it("case-admin declares category (nullable, so it can be cleared)", () => {
    expect(admin).toMatch(/category:\s*z\.string\(\)\.max\(100\)\.nullable\(\)\.optional\(\)/);
    expect(admin).toMatch(/if \(data\.category !== undefined\) patch\.category = data\.category;/);
  });

  it("both endpoints document the field to callers", () => {
    expect(ingest).toContain("clinical_cases.category");
    expect(admin).toContain("clinical_cases.category");
  });

  it("category matches the UI normalisation contract (lowercase key)", () => {
    // src/lib/caseCategory.ts normalises labels with toCategoryKey:
    // trim -> lowercase -> non [a-z0-9 _] dropped -> whitespace/_ runs collapse to "_".
    const toCategoryKey = (label: string) =>
      label.trim().toLowerCase().replace(/[^a-z0-9\s_]/g, "").replace(/[\s_]+/g, "_").replace(/^_+|_+$/g, "");
    // The API stores whatever string it is given (max 100); the UI helper is the
    // agreed way to produce that value, so the stored form must round-trip.
    expect(toCategoryKey("Echo Jantung")).toBe("echo_jantung");
    expect(toCategoryKey("Vaskular")).toBe("vaskular");
    expect(toCategoryKey("  Gagal Jantung  ")).toBe("gagal_jantung");
  });
});
