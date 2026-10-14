/**
 * Format data standar untuk soal baru.
 * Satu soal = satu file data kecil di src/data/soal/<slug>.ts.
 * Tidak perlu membuat halaman/route baru per soal.
 */

export interface SoalTilik {
  /** Daftar tilik (kriteria penilaian) */
  dt: string;
  /** Kalimat word-by-word yang harus diucapkan peserta untuk mendapat poin ini */
  wbw: string;
  /** Poin maksimal (umumnya 2: lengkap=2, kurang lengkap=1, tidak disebut=0) */
  poin: number;
  /** Tilik kritis: wajib lulus agar peserta lulus */
  kritis?: boolean;
}

export interface SoalKeySection {
  /** Judul panel kunci jawaban admin, mis. "Kunci perhitungan (kunci jawaban)" */
  title: string;
  /** Daftar pasangan label–nilai, atau daftar teks biasa */
  items: { label: string; value: string }[] | string[];
}

export interface SoalDraft {
  /** Dipakai di URL: /preview-soal/<slug> */
  slug: string;
  /** Judul besar di halaman preview */
  pageTitle: string;
  /** Judul draft yang masuk ke /prereview (dipakai juga untuk cek duplikat) */
  draftTitle: string;
  /** Skenario klinik (ditampilkan ke peserta) */
  scenario: string;
  /** Instruksi/pertanyaan untuk peserta */
  instructions: string[];
  /** Judul kartu data pemeriksaan, mis. "Data echo (ditampilkan ke peserta)" */
  examDataTitle: string;
  /** Data pemeriksaan yang ditampilkan ke peserta */
  examData: string[];
  /** Panel kunci jawaban admin tambahan (opsional) */
  keySections?: SoalKeySection[];
  /** Properti soal (disiapkan penguji, TIDAK ditampilkan ke peserta) */
  properties: string[];
  /** Kunci jawaban lengkap word-by-word dari awal sampai selesai */
  fullAnswer: { heading: string; text: string }[];
  /** Daftar tilik disandingkan dengan word-by-word */
  tilik: SoalTilik[];
  readingTimeSeconds: number;
  timeLimitSeconds: number;
}
