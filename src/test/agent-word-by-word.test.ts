import { describe, expect, it } from "vitest";
import { preserveWordByWord, publicRubricItems, validAgentKey, wordByWordCoverage } from "../../supabase/functions/_shared/case-word-by-word";

const old = { id: "b8a90ae9-8b1a-4b6c-8cba-0752450da0f1", text: "Diagnosis awal", answer: "Diagnosis saya HOCM.", points: 2, isCritical: true };

describe("agent Word by Word", () => {
  it("preserves answer and ID when changing rubric text without answer", () => {
    const { answer: _, ...input } = old;
    expect(preserveWordByWord([{ ...input, text: "Diagnosis kerja" }], [old])[0]).toEqual({ ...old, text: "Diagnosis kerja" });
  });
  it("writes new answer without changing points or critical", () => {
    expect(preserveWordByWord([{ ...old, answer: "Jawaban baru" }], [old])[0]).toEqual({ ...old, answer: "Jawaban baru" });
  });
  it("allows explicit clearing of answer", () => {
    expect(preserveWordByWord([{ ...old, answer: "" }], [old])[0].answer).toBe("");
  });
  it("never gives a new rubric item the removed item's answer or ID", () => {
    const out = preserveWordByWord([{ text: "Tatalaksana berbeda", points: 2, isCritical: false }], [old])[0];
    expect(out.answer).toBeUndefined();
    expect(out.id).not.toBe(old.id);
  });
  it("keeps word by word out of participant rubric", () => {
    expect(publicRubricItems([old])).toEqual([{ id: old.id, text: old.text, points: 2, isCritical: true }]);
  });
  it("reports missing answers without claiming clinical AI alignment or changing grading", () => {
    expect(wordByWordCoverage([old, { ...old, id: "new", answer: "" }])).toMatchObject({ total: 2, filled: 1, missing_item_ids: ["new"], ai_checked: false, grading_uses_word_by_word: false });
  });
  it("rejects absent or invalid agent credentials", () => {
    expect(validAgentKey(null)).toBe(false);
    expect(validAgentKey("bad", "admin", "ingest")).toBe(false);
    expect(validAgentKey("ingest", "admin", "ingest")).toBe(false);
    expect(validAgentKey("admin", "admin", "ingest")).toBe(true);
    expect(validAgentKey("ingest", undefined, "ingest")).toBe(true);
  });
});