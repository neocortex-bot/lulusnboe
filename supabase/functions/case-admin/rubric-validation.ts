export interface RubricQualityItem {
  text?: string;
  points: number;
  isCritical: boolean;
}

export function getRubricQualityError(_items: RubricQualityItem[]): string | null {
  // Rubric quality is reviewed separately from ingest/PATCH. Do not block a
  // station merely because it is focused, incomplete, or still being drafted.
  // Structural validation remains enforced by the request schema.
  return null;
}
