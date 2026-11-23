import { describe, expect, it } from "vitest";
import { investigationResultHints, normalizeFinalReview, UnfixedLeakError } from "../../supabase/functions/_shared/final-case-review";
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
    const result = normalizeFinalReview({ ...good, issues: [{ field: "initial_prompt", kind: "leak", quote: "EKG menunjukkan AV block total.", reason: "Peserta harus meminta EKG terlebih dahulu." }], initial_prompt: "Pasien sesak." }, input);
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
describe("interpretation station leaks", () => {
  const pda = {
    initial_prompt: "Perempuan 24 tahun sesak. PEMERIKSAAN PENUNJANG: EKG sinus rhythm, LAD, LVH dengan strain. Echo menunjukkan PDA kiri-ke-kanan diameter 3,8 mm. RHC menunjukkan mPAP 30 mmHg, Qp/Qs 1,56.",
    questions_text: "1. Sebutkan dan interpretasikan pemeriksaan penunjang.",
    answer_key_text: "EKG LVH strain; echo PDA 3,8 mm; mPAP 30 mmHg.",
    checklist_rubric: { items: [{ text: "Interpretasi echo", points: 2 }] },
  };
  const leak = { field: "initial_prompt", kind: "leak", quote: "Echo menunjukkan PDA kiri-ke-kanan diameter 3,8 mm.", reason: "Interpretasi echo sedang diujikan." };
  it("flags investigation result sentences in the vignette for the AI", () => {
    const hints = investigationResultHints(pda.initial_prompt);
    expect(hints).toContain("Echo menunjukkan PDA kiri-ke-kanan diameter 3,8 mm.");
    expect(hints).not.toContain("Perempuan 24 tahun sesak.");
  });
  it("rejects a suggestion that keeps the leaked sentence unchanged", () => {
    expect(() => normalizeFinalReview({ ...good, passed: false, issues: [leak], initial_prompt: pda.initial_prompt + " Mohon interpretasi." }, pda)).toThrow(UnfixedLeakError);
  });
  it("rejects a paraphrased suggestion that keeps the same measured value", () => {
    expect(() => normalizeFinalReview({ ...good, passed: false, issues: [leak], initial_prompt: "Perempuan 24 tahun sesak. Ekokardiografi: duktus 3,8 mm." }, pda)).toThrow(UnfixedLeakError);
  });
  it("rejects a leak finding without any suggested fix", () => {
    expect(() => normalizeFinalReview({ ...good, passed: false, issues: [leak] }, pda)).toThrow(UnfixedLeakError);
  });
  it("accepts a suggestion that only names available investigations", () => {
    const r = normalizeFinalReview({ ...good, passed: false, issues: [leak], initial_prompt: "Perempuan 24 tahun sesak. Tersedia EKG, echo, dan RHC; minta kepada penguji untuk melihat hasilnya." }, pda);
    expect(r.passed).toBe(false);
    expect(r.initial_prompt).toContain("Tersedia EKG");
  });
});
