import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Check } from "lucide-react";
import { NBOE_PERIODS, isValidNboePeriod, nboeLabel } from "@/lib/nboePeriods";

export type NboeValue = { is_nboe: boolean; nboe_period: string | null };

export default function NboeMarker({ value, disabled, onChange }: {
  value: NboeValue; disabled?: boolean; onChange: (value: NboeValue) => Promise<void> | void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [saving, setSaving] = useState(false);
  const showDialog = () => { setPeriod(value.nboe_period ?? ""); setOpen(true); };
  const removeMarker = async () => {
    setSaving(true);
    try { await onChange({ is_nboe: false, nboe_period: null }); }
    catch { /* Parent reports the error and retains the persisted marker. */ }
    finally { setSaving(false); }
  };
  return <>
    <div className="flex flex-wrap items-center gap-2">
      <Checkbox id={id} checked={value.is_nboe} disabled={disabled || saving}
        onCheckedChange={checked => checked === true ? showDialog() : void removeMarker()} />
      <Label htmlFor={id}>Soal NBOE</Label>
      {value.is_nboe && <>
        <Badge variant="nboe">{nboeLabel(value.nboe_period)}</Badge>
        <Button type="button" variant="ghost" size="icon" title="Ubah periode NBOE" aria-label="Ubah periode NBOE" disabled={disabled || saving} onClick={showDialog}><Pencil className="h-4 w-4" /></Button>
      </>}
    </div>
    <Dialog open={open} onOpenChange={next => { if (!saving) setOpen(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>NBOE periode kapan?</DialogTitle><DialogDescription>Pilih periode asal soal.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Periode NBOE">
          {NBOE_PERIODS.map(item => <Button key={item.value} type="button" variant={period === item.value ? "default" : "outline"} aria-pressed={period === item.value} disabled={saving} onClick={() => setPeriod(item.value)} className="justify-start text-sm">
            {period === item.value && <Check className="h-4 w-4 shrink-0" />}{item.label}
          </Button>)}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Batal</Button>
          <Button type="button" disabled={saving || !isValidNboePeriod(period)} onClick={async () => {
            setSaving(true);
            try { await onChange({ is_nboe: true, nboe_period: period }); setOpen(false); }
            catch { /* Parent reports the save error; retain the choice for retry. */ }
            finally { setSaving(false); }
          }}>{saving ? "Menyimpan..." : "Simpan periode"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}