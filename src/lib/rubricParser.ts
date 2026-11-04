/**
 * Helper function to parse rubric data from clinical_cases/checklist_rubric
 * Handles both old format (array) and new format (object with enabled/items)
 */
export interface RubricItem {
  /** Penanda tetap butir, agar nilai ujian terdahulu tetap terhubung saat teks diedit. */
  id?: string;
  text: string;
  points: number;
  isCritical: boolean;
}

export function newRubricItemId(): string {
  return `item-${crypto.randomUUID().slice(0, 8)}`;
}

/** Pastikan setiap butir punya penanda tetap sebelum disimpan. */
export function withRubricItemIds<T extends RubricItem>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((item) => {
    let id = item.id?.trim();
    if (!id || seen.has(id)) id = newRubricItemId();
    seen.add(id);
    return { ...item, id };
  });
}

export interface RubricData {
  enabled: boolean;
  items: RubricItem[];
}

export default function parseRubricData(raw: any): RubricData {
  // Format baru: { enabled: boolean, items: RubricItem[] }
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "enabled" in raw) {
    return {
      enabled: !!raw.enabled,
      items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
    };
  }
  
  // Format lama: array langsung
  if (Array.isArray(raw) && raw.length > 0) {
    return { enabled: true, items: raw.map(normalizeItem) };
  }
  
  return { enabled: false, items: [] };
}

function normalizeItem(item: any): RubricItem {
  if (typeof item === "string") {
    return { text: item, points: 10, isCritical: false };
  }
  
  return {
    text: item.text || item.item_text || String(item),
    points: item.points ?? item.point_value ?? 10,
    isCritical: item.isCritical ?? item.is_critical ?? item.critical ?? false,
  };
}
