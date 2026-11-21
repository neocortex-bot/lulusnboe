/** DB: lowercase, spasi → "_" (mis. "echo_jantung"). UI: huruf depan kapital ("Echo Jantung"). */
export const toCategoryKey = (label: string) =>
  label.trim().toLowerCase().replace(/[^a-z0-9\s_]/g, "").replace(/[\s_]+/g, "_").replace(/^_+|_+$/g, "");

export const toCategoryLabel = (key?: string | null) =>
  (key ?? "")
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const uniqueCategories = (rows: { category?: string | null }[]) =>
  Array.from(new Set(rows.map((r) => r.category).filter((c): c is string => !!c))).sort();

const CAT_BADGE_CLASSES = [
  "border-cat-1/40 bg-cat-1/10 text-cat-1",
  "border-cat-2/40 bg-cat-2/10 text-cat-2",
  "border-cat-3/40 bg-cat-3/10 text-cat-3",
  "border-cat-4/40 bg-cat-4/10 text-cat-4",
  "border-cat-5/40 bg-cat-5/10 text-cat-5",
  "border-cat-6/40 bg-cat-6/10 text-cat-6",
  "border-cat-7/40 bg-cat-7/10 text-cat-7",
  "border-cat-8/40 bg-cat-8/10 text-cat-8",
] as const;

/** Warna badge stabil per kategori: kunci kategori sama → warna sama. */
export const categoryBadgeClass = (key?: string | null) => {
  if (!key) return "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CAT_BADGE_CLASSES[hash % CAT_BADGE_CLASSES.length];
};

export const ALL = "__all__";
export const NONE = "__none__";

export const matchesCategory = (category: string | null | undefined, filter: string) =>
  filter === ALL ? true : filter === NONE ? !category : category === filter;
