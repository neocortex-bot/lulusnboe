import type { SoalDraft } from "./types";
import { hocm } from "./hocm";
import { constrictive } from "./constrictive";
import { diastolik } from "./diastolik";

/** Registry soal: slug → data. Tambah soal baru cukup 1 file data + 1 baris di sini. */
export const SOAL_REGISTRY: Record<string, SoalDraft> = {
  hocm,
  constrictive,
  diastolik,
};
