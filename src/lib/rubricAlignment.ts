import type { RubricItem } from "@/lib/rubricParser";

export type AlignmentStatus = "sesuai" | "sebagian" | "tidak_sesuai" | "kosong";

export interface AlignmentSuggestion {
  item_id: string;
  status: AlignmentStatus;
  reason: string;
  suggested_answer?: string;
  suggested_text?: string;
}

export interface AcceptedChange {
  item_id: string;
  answer?: string;
  text?: string;
}

/**
 * Terapkan saran AI yang diterima admin. Hanya `answer` (word by word) dan `text`
 * yang boleh berubah; id, poin, dan status critical selalu dipertahankan.
 */
export function mergeAlignmentChanges<T extends RubricItem>(items: T[], changes: AcceptedChange[]): T[] {
  const byId = new Map(changes.map((c) => [c.item_id, c]));
  return items.map((item) => {
    const change = item.id ? byId.get(item.id) : undefined;
    if (!change) return item;
    const next = { ...item };
    const answer = change.answer?.trim();
    const text = change.text?.trim();
    if (answer) next.answer = answer;
    if (text) next.text = text;
    next.id = item.id;
    next.points = item.points;
    next.isCritical = item.isCritical;
    return next;
  });
}

export function itemsMissingWordByWord(items: RubricItem[]): number {
  return items.filter((i) => !i.answer?.trim()).length;
}
