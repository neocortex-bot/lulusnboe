import type { SoalDraft } from "./types";
import { hocm } from "./hocm";
import { constrictive } from "./constrictive";
import { diastolik } from "./diastolik";
import { mitralStenosis } from "./mitral-stenosis";

/** Registry soal: slug → data. Tambah soal baru cukup 1 file data + 1 baris di sini. */
export const SOAL_REGISTRY: Record<string, SoalDraft> = {
  hocm,
  constrictive,
  diastolik,
  "mitral-stenosis": mitralStenosis,
};
