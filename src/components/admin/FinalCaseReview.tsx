import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { approveFinalReviewManually, finalReviewLabel, finalReviewState, loadFinalReview, loadManualReviewHash, runFinalReview } from "@/lib/finalCaseReview";

export default function FinalCaseReview({ caseId, disabled = false }: { caseId: string; disabled?: boolean }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"choose" | "manual" | "result">("choose");
  const [manualHash, setManualHash] = useState<string | null>(null);
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
    setStage("result");
    setBusy(true); setError(null);
    try {
      const next = await runFinalReview(caseId);
      client.setQueryData(["final_case_review", caseId], next);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Pemeriksaan gagal."); }
    finally { setBusy(false); }
  };
  const show = async () => {
    setOpen(true); setStage("choose"); setManualHash(null); setError(null);
    try {
      const latest = await query.refetch();
      if (latest.error) throw latest.error;
    } catch (e) { setError(e instanceof Error ? e.message : "Rekomendasi gagal dimuat."); }
  };
  const confirmManual = async () => {
    setStage("manual"); setManualHash(null); setBusy(true); setError(null);
    try { setManualHash(await loadManualReviewHash(caseId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Isi soal gagal dimuat."); }
    finally { setBusy(false); }
  };
  const approveManual = async () => {
    if (!manualHash || disabled) return;
    setBusy(true); setError(null);
    try {
      const next = await approveFinalReviewManually(caseId, manualHash);
      client.setQueryData(["final_case_review", caseId], next);
      await refresh(); setStage("result");
    } catch (e) { setManualHash(null); setError(e instanceof Error ? e.message : "Persetujuan gagal disimpan."); }
    finally { setBusy(false); }
  };
  const apply = async () => {
    setBusy(true); setError(null);
    try {
      const { error: applyError } = await supabase.rpc("apply_final_case_review", { _case_id: caseId });
      if (applyError) throw applyError;
      await client.invalidateQueries({ queryKey: ["clinical_case_preview", caseId] });
      await refresh();
      // Acceptance alone is never approval; verify the new saved text again.
      await run();
    } catch (e) { setError(e instanceof Error ? e.message : "Perbaikan gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2 border-t border-border pt-4">
    <Button type="button" variant="nboe" disabled={disabled || busy || query.isLoading} onClick={show} className="h-auto min-h-10 max-w-full whitespace-normal text-left">
      <ShieldCheck className="mr-2 h-4 w-4 shrink-0" />Periksa akhir kebocoran & kesesuaian soal (AI)
    </Button>
    <p className={`text-xs ${finalReviewState(review) === "passed" && !disabled ? "text-primary" : "text-muted-foreground"}`}>
      {disabled ? "Simpan perubahan sebelum pemeriksaan akhir." : query.error ? "Status pemeriksaan gagal dimuat — deployment terkunci" : review?.result.approval_method === "manual" && finalReviewState(review) === "passed" ? "Disetujui manual tanpa analisis AI" : finalReviewLabel(review)}
    </p>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{stage === "manual" ? "Konfirmasi Persetujuan Manual" : "Pemeriksaan Akhir Soal"}</DialogTitle><DialogDescription>{stage === "choose" ? "Yakin ingin menganalisis soal dengan AI, atau menyetujui berdasarkan pemeriksaan manusia?" : stage === "manual" ? "Dengan menyetujui, Anda menyatakan sudah memeriksa kebocoran dan kesesuaian vignette, pertanyaan, kunci jawaban, rubrik, Word by Word, serta properti digital. Pengajuan dan deployment akan diizinkan tanpa analisis AI." : "Vignette dan pertanyaan dibandingkan dengan kunci jawaban, rubrik, Word by Word, serta properti digital."}</DialogDescription></DialogHeader>
        {(busy || query.isFetching) && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memeriksa dan menyimpan hasil…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {stage === "choose" && <div className="flex flex-wrap gap-2">
          <Button disabled={busy || query.isFetching || disabled} onClick={run} className="h-auto whitespace-normal"><Sparkles className="mr-2 h-4 w-4 shrink-0" />Ya, analisis dengan AI</Button>
          <Button variant="outline" disabled={busy || disabled} onClick={confirmManual} className="h-auto whitespace-normal"><ShieldCheck className="mr-2 h-4 w-4 shrink-0" />Bypassed / setujui tanpa analisis AI</Button>
          {review && <Button variant="ghost" disabled={busy} onClick={() => { setStage("result"); setError(null); }}>Lihat hasil tersimpan</Button>}
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Batal</Button>
        </div>}
        {stage === "manual" && <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !manualHash || disabled} onClick={approveManual} className="h-auto whitespace-normal"><Check className="mr-2 h-4 w-4 shrink-0" />Ya, setujui tanpa AI</Button>
          <Button variant="outline" disabled={busy} onClick={() => { setStage("choose"); setError(null); }}>Kembali</Button>
        </div>}
        {stage === "result" && review && <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div><p className={`font-medium ${finalReviewState(review) === "passed" ? "text-primary" : "text-destructive"}`}>{review.result.approval_method === "manual" && finalReviewState(review) === "passed" ? "Disetujui manual tanpa analisis AI" : finalReviewLabel(review)}</p><p className="text-xs text-muted-foreground">{review.result.approval_method === "manual" ? "Persetujuan manual tersimpan" : "Rekomendasi tersimpan"} · {new Date(review.updated_at).toLocaleString("id-ID")}</p></div>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => { setStage("choose"); setError(null); }}><Sparkles className="mr-1 h-4 w-4" />Analisis ulang / setujui manual</Button>
          </div>
          <p className="text-sm">{result?.summary}</p>
          {result?.issues.map((issue, i) => <div key={i} className="space-y-1 border-l-2 border-destructive pl-3 text-sm"><p className="font-medium">{issue.field === "initial_prompt" ? "Vignette" : "Pertanyaan"} · {issue.kind === "leak" ? "Kebocoran" : "Ketidaksesuaian"}</p>{issue.quote && <blockquote className="whitespace-pre-wrap text-muted-foreground">“{issue.quote}”</blockquote>}<p>{issue.reason}</p></div>)}
          {(["initial_prompt", "questions_text"] as const).map(field => result?.[field] && <div key={field} className="space-y-2"><p className="text-sm font-medium">Saran {field === "initial_prompt" ? "Vignette" : "Pertanyaan"}</p><div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">{result[field]}</div></div>)}
          {(result?.initial_prompt || result?.questions_text) && <Button disabled={busy || review.stale || disabled} onClick={apply} className="h-auto whitespace-normal"><Check className="mr-2 h-4 w-4 shrink-0" />Terima perbaikan, simpan & periksa ulang</Button>}
        </div>}
        {stage === "result" && !review && !busy && <Button onClick={() => setStage("choose")}><Sparkles className="mr-2 h-4 w-4" />Coba periksa</Button>}
      </DialogContent>
    </Dialog>
  </div>;
}