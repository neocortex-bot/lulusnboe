import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import parseRubricData, { type RubricItem } from "@/lib/rubricParser";
import { mergeAlignmentChanges, itemsMissingWordByWord, type AlignmentSuggestion, type AcceptedChange } from "@/lib/rubricAlignment";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sesuai: { label: "Sesuai", variant: "default" },
  sebagian: { label: "Sebagian", variant: "secondary" },
  tidak_sesuai: { label: "Tidak sesuai", variant: "destructive" },
  kosong: { label: "Word by word kosong", variant: "outline" },
};

interface Props {
  caseId: string;
  items: RubricItem[];
  canEdit: boolean;
  /** Dipanggil setelah saran disimpan, agar form lokal memakai rubrik terbaru. */
  onApplied?: (items: RubricItem[]) => void;
}

export default function RubricWordByWordSection({ caseId, items, canEdit, onApplied }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AlignmentSuggestion[]>([]);
  const [decided, setDecided] = useState<Record<string, "accept" | "skip">>({});
  const missing = itemsMissingWordByWord(items);

  const runCheck = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setDecided({});
    try {
      const { data, error: fnError } = await supabase.functions.invoke("rubric-alignment", { body: { case_id: caseId } });
      if (fnError) {
        const ctx = (fnError as { context?: Response }).context;
        const detail = ctx ? await ctx.json().catch(() => null) : null;
        throw new Error(detail?.error ?? fnError.message);
      }
      if (data?.error) throw new Error(data.error);
      setSuggestions(data?.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pemeriksaan gagal.");
    } finally {
      setLoading(false);
    }
  };

  const applyChanges = async (changes: AcceptedChange[]) => {
    if (!changes.length) return;
    setSaving(true);
    try {
      // Baca versi terbaru dari database agar tidak menimpa perubahan admin lain.
      const { data: ak, error: readErr } = await supabase
        .from("case_answer_keys").select("checklist_rubric").eq("case_id", caseId).maybeSingle();
      if (readErr || !ak) throw new Error("Rubrik terbaru gagal dimuat. Simpan soal dulu.");
      const raw = (ak.checklist_rubric ?? {}) as Record<string, unknown>;
      const current = parseRubricData(raw);
      const merged = mergeAlignmentChanges(current.items, changes);
      const { error: akErr } = await supabase.from("case_answer_keys")
        .update({ checklist_rubric: { ...raw, enabled: current.enabled, items: merged } as unknown as Json })
        .eq("case_id", caseId);
      if (akErr) throw akErr;
      const { error: ccErr } = await supabase.from("clinical_cases")
        .update({ checklist_rubric: { enabled: current.enabled, items: merged } as unknown as Json })
        .eq("id", caseId);
      if (ccErr) throw ccErr;
      queryClient.invalidateQueries({ queryKey: ["clinical_case_preview", caseId] });
      queryClient.invalidateQueries({ queryKey: ["exam_results_admin"] });
      onApplied?.(merged);
      setDecided((d) => ({ ...d, ...Object.fromEntries(changes.map((c) => [c.item_id, "accept" as const])) }));
      toast({ title: `${changes.length} saran diterapkan` });
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toChange = (s: AlignmentSuggestion): AcceptedChange => ({ item_id: s.item_id, answer: s.suggested_answer, text: s.suggested_text });
  const pending = suggestions.filter((s) => (s.suggested_answer || s.suggested_text) && !decided[s.item_id]);
  const textOf = (id: string) => items.find((i) => i.id === id)?.text ?? id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Word by Word per Butir Rubrik</CardTitle>
        <CardDescription>
          Kalimat yang perlu diucapkan peserta untuk tiap butir. Hanya acuan admin; penilaian ujian tetap memakai rubrik.
          {missing > 0 && ` ${missing} butir belum punya word by word.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada butir rubrik.</p>
        ) : (
          <ol className="space-y-2">
            {items.map((item, i) => (
              <li key={item.id ?? i} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{i + 1}. {item.text} <span className="text-muted-foreground">({item.points} poin{item.isCritical ? ", critical" : ""})</span></div>
                <div className={item.answer ? "mt-1 text-muted-foreground" : "mt-1 italic text-destructive"}>
                  {item.answer || "Belum ada"}
                </div>
              </li>
            ))}
          </ol>
        )}
        {canEdit && items.length > 0 && (
          <Button onClick={runCheck} className="h-auto min-h-10 max-w-full whitespace-normal gap-2" variant="outline">
            <Sparkles className="h-4 w-4" /> Cek kesesuaian rubrik dan word by word
          </Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kesesuaian Rubrik & Word by Word</DialogTitle>
            <DialogDescription>Saran hanya disimpan bila Anda menekan Terima. Poin dan status critical tidak diubah.</DialogDescription>
          </DialogHeader>
          {loading && <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> AI sedang memeriksa…</div>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && suggestions.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada hasil.</p>}
          <div className="space-y-3">
            {suggestions.map((s) => {
              const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.sebagian;
              const state = decided[s.item_id];
              return (
                <div key={s.item_id} className="rounded-md border p-3 text-sm space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="font-medium">{textOf(s.item_id)}</span>
                  </div>
                  {s.reason && <p className="text-muted-foreground">{s.reason}</p>}
                  {s.suggested_text && <p><span className="font-medium">Usulan teks butir:</span> {s.suggested_text}</p>}
                  {s.suggested_answer && <p><span className="font-medium">Usulan word by word:</span> {s.suggested_answer}</p>}
                  {(s.suggested_answer || s.suggested_text) && (
                    state ? (
                      <p className="text-xs text-muted-foreground">{state === "accept" ? "Diterima" : "Diabaikan"}</p>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={saving} onClick={() => applyChanges([toChange(s)])} className="gap-1"><Check className="h-3 w-3" /> Terima</Button>
                        <Button size="sm" variant="ghost" disabled={saving} onClick={() => setDecided((d) => ({ ...d, [s.item_id]: "skip" }))} className="gap-1"><X className="h-3 w-3" /> Abaikan</Button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            {pending.length > 0 && (
              <Button disabled={saving} onClick={() => applyChanges(pending.map(toChange))}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Terima semua ({pending.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
