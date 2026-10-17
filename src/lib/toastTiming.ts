/**
 * Notifikasi harus hilang sendiri dengan cepat supaya tidak menutupi tombol
 * di modal atau bagian halaman lain yang sedang dikerjakan pengguna.
 *
 * - TOAST_AUTO_DISMISS_MS: pesan berhasil/biasa, cukup 1,5 detik.
 * - TOAST_ERROR_DISMISS_MS: pesan error perlu waktu lebih lama untuk dibaca.
 */
export const TOAST_AUTO_DISMISS_MS = 1500;
export const TOAST_ERROR_DISMISS_MS = 4000;

export function toastDurationFor(variant?: "default" | "destructive" | null): number {
  return variant === "destructive" ? TOAST_ERROR_DISMISS_MS : TOAST_AUTO_DISMISS_MS;
}
