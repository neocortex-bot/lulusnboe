import { useEffect, useState } from "react";
import { loadRecommendation, saveRecommendation, saveDecisions } from "@/lib/aiRecommendations";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, Check, X, AlertTriangle } from "lucide-react";
import type { DigitalProperty } from "@/lib/digitalProperties";
import type { RubricItem } from "@/lib/rubricParser";
import { applyPropertySyncChanges, type PropertySyncResult } from "@/lib/propertySync";
import { runAndRecordPropertyCheck } from "@/lib/caseReadiness";

interface Props {
  caseId: string;
  properties: DigitalProperty[];
  answerKeyText: string;
  items: RubricItem[];
  onApply: (next: { answerKeyText: string; items: RubricItem[] }) => void;
}

type Decision = "accept" | "skip";

export default function PropertySyncDialog({ caseId, properties, answerKeyText, items, onApply }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PropertySyncResult | null>(null);
  const [decided, setDecided] = useState<Record<string, Decision>>({});

  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (open && savedAt) void saveDecisions(caseId, "property_sync", decided);
  }, [decided]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSaved = async () => {
    setOpen(true); setLoading(true); setError(null);
    const saved = await loadRecommendation<PropertySyncResult>(caseId, "property_sync");
    if (!saved) return run();
    setResult(saved.result); setDecided((saved.decisions ?? {}) as Record<string, Decision>);
    setSavedAt(saved.updated_at); setLoading(false);
  };

  const run = async () => {
    setOpen(true); setLoading(true); setError(null); setResult(null); setDecided({}); setSavedAt(null);
    try {
      const data = await runAndRecordPropertyCheck(async () => {
        const { data, error: fnError } = await supabase.functions.invoke("property-sync", {
          body: { case_id: caseId, properties, answer_key_text: answerKeyText, items: items.map((i) => ({ text: i.text, answer: i.answer ?? "" })) },
        });
        if (fnError) {
          const ctx = (fnError as { context?: Response }).context;
          const detail = ctx ? await ctx.json().catch(() => null) : null;
          throw new Error(detail?.error ?? fnError.message);
        }
        if (data?.error) throw new Error(data.error);
        if (!data || !Array.isArray(data.items) || !Array.isArray(data.property_warnings) || !Array.isArray(data.skipped)) {
          throw new Error("Hasil pemeriksaan AI tidak valid.");
        }
        return data as PropertySyncResult;
      }, async (at) => {
        const { error: saveError } = await supabase.from("clinical_cases")
          .update({ property_sync_checked_at: at }).eq("id", caseId).select("id").single();
        if (saveError) throw new Error(`AI selesai memeriksa, tetapi riwayat pemeriksaan gagal disimpan: ${saveError.message}`);
        // Update only the list: do not refetch detail forms and overwrite unsaved edits.
        queryClient.invalidateQueries({ queryKey: ["clinical_cases"], exact: true });
      });
      setResult(data);
      await saveRecommendation(caseId, "property_sync", data);
      setSavedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pemeriksaan gagal.");
    } finally {
      setLoading(false);
    }
  };

  const keys = result ? [...(result.answer_key ? ["ak"] : []), ...result.items.map((_, i) => `i${i}`)] : [];
  const decide = (k: string, v: Decision) => setDecided((d) => ({ ...d, [k]: v }));
  const apply = (all: boolean) => {
    if (!result) return;
    const ok = (k: string) => (all ? decided[k] !== "skip" : decided[k] === "accept");
    const accepted = result.items.filter((_, i) => ok(`i${i}`));
    const nextKey = result.answer_key && ok("ak") ? result.answer_key.after : answerKeyText;
    onApply({ answerKeyText: nextKey, items: applyPropertySyncChanges(items, accepted) });
    setOpen(false);
  };

  const Row = ({ k, title, before, after, reason }: { k: string; title: string; before: string; after: string; reason: string }) => (
    <div className={`space-y-2 rounded-md border p-3 text-sm ${decided[k] === "skip" ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <div className="flex gap-1">
          <Button size="sm" variant={decided[k] === "accept" ? "default" : "outline"} onClick={() => decide(k, "accept")}><Check className="mr-1 h-3 w-3" />Terima</Button>
          <Button size="sm" variant={decided[k] === "skip" ? "secondary" : "ghost"} onClick={() => decide(k, "skip")}><X className="mr-1 h-3 w-3" />Abaikan</Button>
        </div>
      </div>
      {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
      <div className="grid gap-2 md:grid-cols-2">
        <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-destructive/5 p-2 text-xs"><span className="font-semibold">Sebelum: </span>{before || "(kosong)"}</div>
        <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-primary/5 p-2 text-xs"><span className="font-semibold">Sesudah: </span>{after}</div>
      </div>
    </div>
  );

  return (
    <>
      <Button type="button" variant="nboe" size="sm" onClick={openSaved} disabled={!properties.some((p) => p.value?.trim())}>
        <Sparkles className="mr-1 h-4 w-4" />Sinkronkan properti dengan jawaban (AI)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sinkronisasi Properti Digital</DialogTitle>
            <DialogDescription>Caption properti dianggap benar. Saran yang diterima masuk ke form; klik Simpan untuk menyimpan. Poin dan critical tidak diubah.</DialogDescription>
          </DialogHeader>
          {!loading && savedAt && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 p-3 text-sm">
              <span>Rekomendasi tersimpan · {new Date(savedAt).toLocaleString("id-ID")}</span>
              <Button size="sm" variant="outline" onClick={run}><Sparkles className="mr-1 h-3 w-3" />Analisis ulang</Button>
            </div>
          )}
          {loading && <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />AI sedang membandingkan…</div>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="space-y-3">
              {result.property_warnings.map((w, i) => (
                <div key={i} className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  <div><span className="font-medium">{w.label}: </span>{w.reason}</div>
                </div>
              ))}
              {result.skipped.length > 0 && <p className="text-xs text-muted-foreground">Butuh caption untuk dicek: {result.skipped.join(", ")}</p>}
              {keys.length === 0 && <p className="py-4 text-sm">Semua sudah sinkron dengan caption properti.</p>}
              {result.answer_key && <Row k="ak" title="Kunci jawaban" before={answerKeyText} after={result.answer_key.after} reason={result.answer_key.reason} />}
              {result.items.map((c, i) => (
                <Row key={i} k={`i${i}`} title={`Butir ${c.index + 1} — ${c.field === "answer" ? "Word by word" : "Teks butir"}`} before={c.before} after={c.after} reason={c.reason} />
              ))}
            </div>
          )}
          {result && keys.length > 0 && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => apply(false)}>Terapkan yang diterima</Button>
              <Button onClick={() => apply(true)}>Terima semua (kecuali diabaikan)</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
