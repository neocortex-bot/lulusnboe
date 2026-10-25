/**
 * Perhitungan ulang nilai rubrik saat admin mengubah nilai satu butir secara manual.
 * Murni fungsi — dipakai ResultsViewer dan diuji di src/test/rubric-admin-override.test.ts.
 */

export interface ScoreItem {
  item: string;
  passed: boolean;
  comment?: string;
  points?: number;
  maxPoints?: number;
  coverage?: "full" | "partial" | "none";
  isCritical?: boolean;
  evidenceQuote?: string;
}

export interface ScoreReport {
  items: ScoreItem[];
  totalScore?: number;
  totalPossible?: number;
  score?: number;
  passStatus?: string;
  hasCriticalFail?: boolean;
  [key: string]: unknown;
}

export const PASS_THRESHOLD = 68;

/** Nilai yang boleh dipilih admin untuk satu butir: 0..maxPoints (langkah 1). */
export function scoreChoices(maxPoints: number): number[] {
  const max = Math.max(0, Math.round(maxPoints));
  return Array.from({ length: max + 1 }, (_, i) => i);
}

export function coverageForPoints(points: number, maxPoints: number): "full" | "partial" | "none" {
  if (points <= 0) return "none";
  if (points >= maxPoints) return "full";
  return "partial";
}

/**
 * Terapkan nilai baru untuk butir ke-`index`, lalu hitung ulang totalScore,
 * score (0-100), passStatus, dan hasCriticalFail. Mengembalikan salinan report baru.
 */
export function applyItemScore(report: ScoreReport, index: number, newPoints: number): ScoreReport {
  const items = report.items.map((item, i) => {
    if (i !== index) return item;
    const max = item.maxPoints ?? 2;
    const clamped = Math.min(Math.max(0, Math.round(newPoints)), max);
    return {
      ...item,
      points: clamped,
      coverage: coverageForPoints(clamped, max),
      passed: clamped > 0,
    };
  });

  const totalPossible = items.reduce((sum, item) => sum + (item.maxPoints ?? 2), 0);
  const totalScore = items.reduce((sum, item) => sum + (item.points ?? 0), 0);
  const hasCriticalFail = items.some(
    (item) => item.isCritical && (item.coverage ?? "none") === "none"
  );
  const score = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  const passStatus = score >= PASS_THRESHOLD && !hasCriticalFail ? "LULUS" : "TIDAK LULUS";

  return {
    ...report,
    items,
    totalScore,
    totalPossible,
    score,
    passStatus,
    hasCriticalFail,
  };
}
