import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DigitalProperty, isMediaPending, mediaTypeFromMime } from "@/lib/digitalProperties";

interface Props {
  items: DigitalProperty[];
  onChange: (next: DigitalProperty[]) => void;
  caseId?: string;
}

export const DigitalMediaPreview = ({ p }: { p: DigitalProperty }) => {
  if (!p.media_url) return null;
  if (p.media_type === "video") return <video src={p.media_url} controls className="max-h-48 rounded-md" />;
  if (p.media_type === "audio") return <audio src={p.media_url} controls className="w-full" />;
  return <img src={p.media_url} alt={p.label} className="max-h-48 rounded-md object-contain" />;
};

const DigitalPropertiesEditor = ({ items, onChange, caseId }: Props) => {
  const [uploading, setUploading] = useState<number | null>(null);
  const set = (i: number, patch: Partial<DigitalProperty>) =>
    onChange(items.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const upload = async (i: number, file: File) => {
    const type = mediaTypeFromMime(file.type);
    if (!type) return toast.error("Hanya gambar, video, atau suara");
    setUploading(i);
    try {
      const path = `properties/${caseId ?? "new"}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("case-assets").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("case-assets").getPublicUrl(path);
      set(i, { media_url: data.publicUrl, media_type: type });
      toast.success("Media terunggah — jangan lupa Simpan");
    } catch (e: any) {
      toast.error(`Gagal unggah: ${e.message ?? e}`);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Nilai/gambar/video/suara yang diperlihatkan penguji ke layar station bila peserta memintanya.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { label: "", value: "", needs_media: false }])}>
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Belum ada properti digital.</p>}
      {items.map((p, i) => (
        <div key={i} className={`space-y-2 rounded-md border p-3 ${isMediaPending(p) ? "border-destructive bg-destructive/5" : "border-border"}`}>
          <div className="flex items-center gap-2">
            <Input value={p.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Nama pemeriksaan, mis. Tekanan darah / EKG" />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea rows={2} value={p.value} onChange={(e) => set(i, { value: e.target.value })} placeholder="Nilai/hasil, mis. 150/95 mmHg (boleh kosong bila hanya media)" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!p.needs_media} onCheckedChange={(v) => set(i, { needs_media: v })} />
              Butuh media asli
            </label>
            <label className={`flex items-center gap-2 text-sm ${p.media_url ? "" : "opacity-50"}`} title={p.media_url ? "" : "Unggah media dulu agar teks bisa disembunyikan"}>
              <Switch checked={!p.media_url || p.show_caption !== false} disabled={!p.media_url} onCheckedChange={(v) => set(i, { show_caption: v })} />
              Tampilkan caption saat ditampilkan
            </label>
            <Label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" /> {uploading === i ? "Mengunggah..." : p.media_url ? "Ganti media" : "Unggah media"}
              <input type="file" accept="image/*,video/*,audio/*" className="hidden" disabled={uploading !== null}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(i, f); e.target.value = ""; }} />
            </Label>
            {p.media_url && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set(i, { media_url: null, media_type: null })}>
                <X className="mr-1 h-4 w-4" /> Hapus media
              </Button>
            )}
            {isMediaPending(p) && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> PR admin: media belum diunggah
              </span>
            )}
          </div>
          <DigitalMediaPreview p={p} />
        </div>
      ))}
    </div>
  );
};

export default DigitalPropertiesEditor;
