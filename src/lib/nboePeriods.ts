const months = [{ code: "03", label: "Maret" }, { code: "06", label: "Juni" }, { code: "09", label: "September" }, { code: "12", label: "Desember" }];

export const NBOE_PERIODS = [2023, 2024, 2025, 2026].flatMap(year =>
  months.map(month => ({ value: `${year}-${month.code}`, label: `${month.label} ${year}` }))
).filter(period => period.value >= "2023-06" && period.value <= "2026-09").reverse();

export const isValidNboePeriod = (value: string) => NBOE_PERIODS.some(period => period.value === value);
export const nboeLabel = (period?: string | null) => {
  const match = NBOE_PERIODS.find(item => item.value === period);
  return match ? `NBOE ${match.label}` : "Soal NBOE · Periode belum diisi";
};

export function matchesNboeFilter(c: { is_nboe?: boolean; nboe_period?: string | null }, only: boolean, period: string) {
  if (!only) return true;
  return c.is_nboe === true && (period === "all" || (period === "unset" ? !c.nboe_period : c.nboe_period === period));
}

// Single-select variant used by the case table: one control covers
// "no NBOE filtering", "any NBOE case", a specific period, or a missing period.
export const NBOE_FILTER_ALL = "all";
export const NBOE_FILTER_ANY = "nboe";
export const NBOE_FILTER_UNSET = "unset";

export function matchesNboePeriodFilter(c: { is_nboe?: boolean; nboe_period?: string | null }, filter: string) {
  if (filter === NBOE_FILTER_ALL) return true;
  if (filter === NBOE_FILTER_ANY) return c.is_nboe === true;
  if (filter === NBOE_FILTER_UNSET) return c.is_nboe === true && !c.nboe_period;
  return c.is_nboe === true && c.nboe_period === filter;
}