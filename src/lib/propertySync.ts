import type { RubricItem } from "@/lib/rubricParser";

export interface PropertySyncItemChange {
  index: number;
  field: "answer" | "text";
  before: string;
  after: string;
  reason: string;
}

export interface PropertySyncResult {
  answer_key: { after: string; reason: string } | null;
  items: PropertySyncItemChange[];
  property_warnings: { label: string; reason: string }[];
  skipped: string[];
}

/** Terapkan perubahan yang diterima. Hanya teks butir / word by word yang berubah; id, poin, critical tetap. */
export function applyPropertySyncChanges<T extends RubricItem>(items: T[], accepted: PropertySyncItemChange[]): T[] {
  return items.map((item, i) => {
    const mine = accepted.filter((c) => c.index === i && c.after.trim());
    if (!mine.length) return item;
    const next = { ...item };
    for (const c of mine) next[c.field] = c.after.trim();
    next.id = item.id;
    next.points = item.points;
    next.isCritical = item.isCritical;
    return next;
  });
}
