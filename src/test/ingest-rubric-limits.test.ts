import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ingest = readFileSync(resolve(process.cwd(), "supabase/functions/ingest-case/index.ts"), "utf8");

describe("ingest-case quality review is non-blocking", () => {
  it("does not contain minimum item-count or total-quality gates", () => {
    expect(ingest).not.toMatch(/items\.length < 3/);
    expect(ingest).not.toMatch(/items\.length < 5/);
    expect(ingest).not.toMatch(/items\.length > 7/);
    expect(ingest).not.toMatch(/items\.length < 15/);
    expect(ingest).not.toMatch(/items\.length >= 15/);
    expect(ingest).toContain("review/publish dilakukan terpisah");
  });

  it("does not reject duplicated rubric lines during ingest", () => {
    expect(ingest).not.toMatch(/normalizedTexts\.indexOf\(t\) !== idx/);
    expect(ingest).not.toContain("butir duplikat");
  });

  it("retains technical question-shape validation", () => {
    expect(ingest).toContain("questions_text harus berisi pertanyaan bernomor");
    expect(ingest).toContain("const RubricItem = z.object");
  });
});
