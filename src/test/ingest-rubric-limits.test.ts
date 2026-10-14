import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ingest = readFileSync(resolve(process.cwd(), "supabase/functions/ingest-case/index.ts"), "utf8");

describe("ingest-case keeps rubrics flexible", () => {
  it("accepts focused or detailed rubrics (min 3 items, no upper item gate)", () => {
    expect(ingest).toMatch(/items\.length < 3/);
    // The old 5-7 gate rejected both focused rubrics and atomic rubrics.
    expect(ingest).not.toMatch(/items\.length < 5/);
    expect(ingest).not.toMatch(/items\.length > 7/);
    // The old >=15 gate is what forced the generator to duplicate lines.
    expect(ingest).not.toMatch(/items\.length < 15/);
    expect(ingest).not.toMatch(/items\.length >= 15/);
  });

  it("rejects duplicated rubric lines", () => {
    expect(ingest).toContain("butir duplikat");
    expect(ingest).toContain(/normalizedTexts\.indexOf\(t\) !== idx/);
  });

  it("documents the flexible rubric contract to callers", () => {
    expect(ingest).toContain("minimal 3 butir");
    expect(ingest).not.toContain("5-7 butir LUAS");
    expect(ingest).not.toContain(">=15 items");
  });
});
