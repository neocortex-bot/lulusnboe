import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  properties: string[];
  onChange: (next: string[]) => void;
}

// Daftar properti soal (alat/media yang harus disiapkan pembuat soal).
// Hanya untuk admin/penguji — TIDAK pernah ditampilkan ke peserta.
const PropertiesEditor = ({ properties, onChange }: Props) => {
  const setItem = (i: number, v: string) =>
    onChange(properties.map((p, idx) => (idx === i ? v : p)));

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-base font-semibold">Properti Soal</Label>
          <p className="text-xs text-muted-foreground">
            Alat/media yang wajib disiapkan penguji (mis. printout EKG, gambar echo, laptop).
            Daftar ini <span className="font-medium">tidak ditampilkan ke peserta</span> — peserta harus
            menyebut atau memintanya sendiri kepada penguji.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...properties, ""])}
        >
          <Plus className="h-4 w-4 mr-1" /> Tambah
        </Button>
      </div>
      {properties.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada properti. Tambahkan bila soal butuh alat/media.</p>
      ) : (
        <div className="space-y-2">
          {properties.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
              <Input
                value={p}
                onChange={(e) => setItem(i, e.target.value)}
                placeholder="mis. Printout EKG 12 sadapan"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(properties.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertiesEditor;
