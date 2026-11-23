import { describe, expect, it } from "vitest";
import { NBOE_PERIODS, isValidNboePeriod, matchesNboeFilter } from "@/lib/nboePeriods";

describe("NBOE period rules", () => {
  it("allows exactly March, June, September and December within June 2023–September 2026", () => {
    expect(NBOE_PERIODS.map(p => p.value).sort()).toEqual([
      "2023-06", "2023-09", "2023-12", "2024-03", "2024-06", "2024-09", "2024-12",
      "2025-03", "2025-06", "2025-09", "2025-12", "2026-03", "2026-06", "2026-09",
    ]);
    expect(isValidNboePeriod("2023-03")).toBe(false);
    expect(isValidNboePeriod("2026-12")).toBe(false);
    expect(isValidNboePeriod("2024-04")).toBe(false);
  });
  it("period filtering includes only NBOE cases from the chosen period", () => {
    expect(matchesNboeFilter({ is_nboe: true, nboe_period: "2026-09" }, true, "2026-09")).toBe(true);
    expect(matchesNboeFilter({ is_nboe: true, nboe_period: "2026-06" }, true, "2026-09")).toBe(false);
    expect(matchesNboeFilter({ is_nboe: false, nboe_period: "2026-09" }, true, "2026-09")).toBe(false);
  });
  it("keeps unassigned historical markers discoverable without inventing their period", () => {
    expect(matchesNboeFilter({ is_nboe: true, nboe_period: null }, true, "unset")).toBe(true);
    expect(matchesNboeFilter({ is_nboe: true, nboe_period: "2023-06" }, true, "unset")).toBe(false);
    expect(matchesNboeFilter({ is_nboe: false }, true, "unset")).toBe(false);
    expect(matchesNboeFilter({ is_nboe: true }, true, "all")).toBe(true);
    expect(matchesNboeFilter({ is_nboe: false }, false, "2026-09")).toBe(true);
  });
});