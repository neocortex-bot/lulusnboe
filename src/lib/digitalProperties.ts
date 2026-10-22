// Properti digital: nilai/gambar/video/suara yang disembunyikan dari peserta
// dan baru diperlihatkan penguji ke layar station saat peserta memintanya.
export type DigitalMediaType = "image" | "video" | "audio";

export interface DigitalProperty {
  label: string;
  value: string;
  media_url?: string | null;
  media_type?: DigitalMediaType | null;
  /** Ditandai admin: seharusnya pakai media asli, tapi belum diunggah. */
  needs_media?: boolean;
  /** Tampilkan teks saat ditampilkan ke layar. Hanya bisa dimatikan bila ada media. */
  show_caption?: boolean;
}

export const PROPERTY_SHOW_EVENT = "show_property";
export const PROPERTY_ACK_EVENT = "property_displayed";
export const PROPERTY_SYNC_EVENT = "request_property";

export function parseDigitalProperties(rubric: unknown): DigitalProperty[] {
  const raw = (rubric as { digital_properties?: unknown } | null)?.digital_properties;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object")
    .map((p: any) => ({
      label: String(p.label ?? ""),
      value: String(p.value ?? ""),
      media_url: p.media_url ? String(p.media_url) : null,
      media_type: ["image", "video", "audio"].includes(p.media_type) ? p.media_type : null,
      needs_media: !!p.needs_media,
      show_caption: p.show_caption !== false,
    }));
}

export function cleanDigitalProperties(list: DigitalProperty[]): DigitalProperty[] {
  return list
    .map((p) => ({ ...p, label: p.label.trim(), value: p.value.trim() }))
    .filter((p) => p.label || p.value || p.media_url);
}

/** Masih jadi "PR" admin: ditandai butuh media tapi file belum ada. */
export const isMediaPending = (p: DigitalProperty) => !!p.needs_media && !p.media_url;

export function mediaTypeFromMime(mime: string): DigitalMediaType | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

/** Caption (label+nilai) hanya boleh disembunyikan bila media sudah terunggah. */
export const isCaptionVisible = (p: DigitalProperty) => !p.media_url || p.show_caption !== false;
