import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { approveFinalReview, finalReviewLabel, finalReviewState, loadFinalReview, runFinalReview } from "@/lib/finalCaseReview";

export default function FinalCaseReview({ caseId, disabled = false }: { caseId: string; disabled?: boolean }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["final_case_review", caseId], queryFn: () => loadFinalReview(caseId) });
  const review = query.data;
  const result = review?.result;
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["final_case_review", caseId] }),
      client.invalidateQueries({ queryKey: ["clinical_cases"] }),
    ]);
  };
  const run = async () => {
    setBusy(true); setError(null);
    try {
      const next = await runFinalReview(caseId);
      client.setQueryData(["final_case_review", caseId], next);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Pemeriksaan gagal."); }
    finally { setBusy(false); }
  };
  const show = async () => {
    setOpen(true); setError(null);
    try {
      const latest = await query.refetch();
      if (latest.error) throw latest.error;
    } catch (e) { setError(e instanceof Error ? e.message : "Rekomendasi gagal dimuat."); }
  };
  const approve = async () => {
    setBusy(true); setError(null);
    try {
      const next = await approveFinalReview(caseId);
      client.setQueryData(["final_case_review", caseId], next);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Persetujuan gagal disimpan."); }
    finally { setBusy(false); }
  };
  const apply = async () => {
    setBusy(true); setError(null);
    try {
      const { error: applyError } = await supabase.rpc("apply_final_case_review", { _case_id: caseId });
      if (applyError) throw applyError;
      await client.invalidateQueries({ queryKey: ["clinical_case_preview", caseId] });
      await refresh();
      // Changed content needs explicit AI analysis or manual approval, never automatic AI.
    } catch (e) { setError(e instanceof Error ? e.message : "Perbaikan gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2 border-t border-border pt-4">
    <Button type="button" variant="nboe" disabled={disabled || busy || query.isLoading} onClick={show} className="h-auto min-h-10 max-w-full whitespace-normal text-left">
      <ShieldCheck className="mr-2 h-4 w-4 shrink-0" />Periksa akhir kebocoran & kesesuaian soal
    </Button>
    <p className={`text-xs ${finalReviewState(review) === "passed" && !disabled ? "text-primary" : "text-muted-foreground"}`}>
      {disabled ? "Simpan perubahan sebelum pemeriksaan akhir." : query.error ? "Status pemeriksaan gagal dimuat — deployment terkunci" : finalReviewLabel(review)}
    </p>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Konfirmasi Pemeriksaan Akhir Soal</DialogTitle><DialogDescription>Apakah ingin menganalisis kebocoran vignette dan pertanyaan dengan AI, atau menandai soal sudah sesuai berdasarkan pemeriksaan admin?</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" disabled={busy || disabled || query.isFetching} onClick={run} className="h-auto min-h-10 whitespace-normal"><Sparkles className="mr-2 h-4 w-4 shrink-0" />{review ? "Analisis ulang dengan AI" : "Lanjut analisis AI"}</Button>
          <Button variant="nboe" disabled={busy || disabled || query.isFetching} onClick={approve} className="h-auto min-h-10 whitespace-normal"><Check className="mr-2 h-4 w-4 shrink-0" />Tandai sudah sesuai</Button>
        </div>
        {(busy || query.isFetching) && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memeriksa dan menyimpan hasil…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {review && <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div><p className={`font-medium ${finalReviewState(review) === "passed" ? "text-primary" : "text-destructive"}`}>{finalReviewLabel(review)}</p><p className="text-xs text-muted-foreground">Rekomendasi tersimpan · {new Date(review.updated_at).toLocaleString("id-ID")}</p></div>
          </div>
          <p className="text-sm">{result?.summary}</p>
          {result?.issues.map((issue, i) => <div key={i} className="space-y-1 border-l-2 border-destructive pl-3 text-sm"><p className="font-medium">{issue.field === "initial_prompt" ? "Vignette" : "Pertanyaan"} · {issue.kind === "leak" ? "Kebocoran" : "Ketidaksesuaian"}</p>{issue.quote && <blockquote className="whitespace-pre-wrap text-muted-foreground">“{issue.quote}”</blockquote>}<p>{issue.reason}</p></div>)}
          {(["initial_prompt", "questions_text"] as const).map(field => result?.[field] && <div key={field} className="space-y-2"><p className="text-sm font-medium">Saran {field === "initial_prompt" ? "Vignette" : "Pertanyaan"}</p><div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">{result[field]}</div></div>)}
          {(result?.initial_prompt || result?.questions_text) && <Button disabled={busy || review.stale || disabled} onClick={apply} className="h-auto whitespace-normal"><Check className="mr-2 h-4 w-4 shrink-0" />Terima perbaikan & simpan</Button>}
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
}