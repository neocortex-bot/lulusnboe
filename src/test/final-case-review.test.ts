import { describe, expect, it } from "vitest";
import { normalizeFinalReview } from "../../supabase/functions/_shared/final-case-review";
import { finalReviewState } from "@/lib/finalCaseReview";
import { getDeploymentValidationError } from "@/lib/deploymentEligibility";

const input = { initial_prompt: "Pasien sesak. EKG menunjukkan AV block total.", questions_text: "1. Sebutkan pemeriksaan penunjang yang Anda minta.", answer_key_text: "Minta EKG, interpretasikan AV block total.", checklist_rubric: { items: [{ text: "Meminta EKG", points: 2, answer: "Saya meminta EKG" }] } };
const good = { passed: true, summary: "Soal aman dan sesuai.", issues: [], initial_prompt: null, questions_text: null };
const deployment = (reviewedCaseIds: Set<string>) => getDeploymentValidationError({ participantIds: [], pcCount: 1, caseIds: ["avb"], reviewedCaseIds });

describe("final review rules", () => {
  it("does not deploy a case that has never been checked", () => {
    expect(finalReviewState(null)).toBe("unchecked");
    expect(deployment(new Set())).not.toBeNull();
  });
  it("blocks detected leaked investigation results even when the model says passed", () => {
    const result = normalizeFinalReview({ ...good, issues: [{ field: "initial_prompt", kind: "leak", quote: "EKG menunjukkan AV block total.", reason: "Peserta harus meminta EKG terlebih dahulu." }] }, input);
    expect(result.passed).toBe(false);
  });
  it("does not count suggested corrections as passing the current question", () => {
    expect(normalizeFinalReview({ ...good, initial_prompt: "Pasien sesak." }, input).passed).toBe(false);
  });
  it("requires a new check after content edits", () => {
    expect(finalReviewState({ passed: true, stale: true })).toBe("stale");
  });
  it("allows deployment only after a current passing review", () => {
    expect(finalReviewState({ passed: true, stale: false })).toBe("passed");
    expect(deployment(new Set(["avb"]))).toBeNull();
  });
  it("fails closed on incomplete AI output", () => {
    expect(() => normalizeFinalReview({ passed: true, issues: [] }, input)).toThrow();
    expect(() => normalizeFinalReview({ passed: true, summary: "Aman", issues: [] }, input)).toThrow();
  });
  it("rejects invented evidence quotes", () => {
    expect(() => normalizeFinalReview({ ...good, issues: [{ field: "questions_text", kind: "leak", quote: "EF 20%", reason: "Bocor" }] }, input)).toThrow();
  });
  it("cannot pass an empty question even with a confident AI reply", () => {
    expect(normalizeFinalReview(good, { ...input, questions_text: "" }).passed).toBe(false);
  });
  it("keeps answer keys, rubric scores and Word by Word untouched", () => {
    const before = structuredClone(input);
    normalizeFinalReview({ ...good, questions_text: "1. Jelaskan pemeriksaan yang akan Anda minta." }, input);
    expect(input).toEqual(before);
  });
});