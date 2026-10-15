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

export const ALL = "__all__";
export const NONE = "__none__";

export const matchesCategory = (category: string | null | undefined, filter: string) =>
  filter === ALL ? true : filter === NONE ? !category : category === filter;
