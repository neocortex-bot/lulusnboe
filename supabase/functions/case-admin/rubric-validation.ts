export interface RubricQualityItem {
  text?: string;
  points: number;
  isCritical: boolean;
}

export function getRubricQualityError(items: RubricQualityItem[]): string | null {
  // An empty checklist explicitly disables rubric-based grading.
  if (items.length === 0) return null;

  // Duplicated lines penalise the same point twice, so they are a generation bug.
  const normalized = items.map((i) => (i.text ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim());
  const dupe = normalized.find((t, idx) => t && normalized.indexOf(t) !== idx);
  if (dupe) {
    return `Rubric contains a duplicate item ("${dupe.slice(0, 60)}"). Every item must be unique.`;
  }

  // Flexible rubric: focused (3-4 items) and detailed atomic rubrics are both
  // valid. Only minimum quality is enforced, mirroring ingest-case.
  if (items.length < 3 || items.length > 100) {
    return `Active rubric must contain 3-100 items (got ${items.length}).`;
  }

  const criticalCount = items.filter((item) => item.isCritical).length;
  if (criticalCount < 1) {
    return "At least 1 rubric item must be isCritical:true";
  }

  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
  if (totalPoints < 6) {
    return `Rubric total points must be >= 6 (got ${totalPoints})`;
  }

  return null;
}
