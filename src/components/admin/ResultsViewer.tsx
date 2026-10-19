import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Play, ChevronDown, ChevronUp, Loader2, AlertTriangle, Trash2, Volume2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Json } from "@/integrations/supabase/types";
import DetailedFeedbackDisplay from "@/components/exam/DetailedFeedbackDisplay";
import { invokeExamAi } from "@/lib/examAi";

interface ScoreItem {
  item: string;
  passed: boolean;
  comment?: string;
  points?: number;
  maxPoints?: number;
  coverage?: "full" | "partial" | "none";
  isCritical?: boolean;
  evidenceQuote?: string;
}

interface ScoreReport {
  items: ScoreItem[];
  totalScore?: number;
  totalPossible?: number;
  score?: number;
  passStatus?: string;
  hasCriticalFail?: boolean;
  reasoning?: string;
  tips?: string;
  detailedFeedback?: any[];
  overallStrengths?: string[];
  overallWeaknesses?: string[];
  prioritizedImprovements?: string[];
}

interface ResultsViewerProps {
  examMode: string;
}

const ResultsViewer = ({ examMode }: ResultsViewerProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["exam_results_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("*, profiles:candidate_id(full_name, email), exam_sessions:session_id(status, case_id, clinical_cases:case_id(title, exam_mode))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      const rows = (query.state.data as any[] | undefined) ?? [];
      return rows.some((r) => r.ai_eval_status === "processing" || r.ai_eval_status === "queued") ? 5000 : false;
    },
  });

  const filteredResults = results.filter(
    (result: any) => result.exam_sessions?.clinical_cases?.exam_mode === examMode
  );

  useEffect(() => {
    if (!expandedId) return;
    const result = results.find((r: any) => r.id === expandedId);
    if (!result?.audio_file_url || audioUrls[expandedId]) return;

    const generateSignedUrl = async () => {
      const filePath = result.audio_file_url as string;
      const { data } = await supabase.storage
        .from("exam-audio")
        .createSignedUrl(filePath, 3600);
      if (data?.signedUrl) {
        setAudioUrls((prev) => ({ ...prev, [expandedId]: data.signedUrl }));
      }
    };
    generateSignedUrl();
  }, [expandedId, results, audioUrls]);

  const evaluateMutation = useMutation({
    mutationFn: async (resultId: string) => {
      return invokeExamAi("evaluate-exam", resultId);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["exam_results_admin"] });
      toast({ title: data?.status === "queued" ? "Masuk antrean evaluasi" : data?.status === "busy" ? "Evaluasi sedang berjalan" : "Evaluasi AI dimulai", description: data?.message });
    },
    onError: (e: Error) => {
      toast({ title: "Evaluation Failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteAudioMutation = useMutation({
    mutationFn: async ({ resultId, audioUrl }: { resultId: string; audioUrl: string }) => {
      const { error: storageError } = await supabase.storage
        .from("exam-audio")
        .remove([audioUrl]);
      if (storageError) console.warn("Failed to delete audio file:", storageError);
      const { error } = await supabase
        .from("exam_results")
        .update({ audio_file_url: null })
        .eq("id", resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_results_admin"] });
      toast({ title: "Audio berhasil dihapus" });
    },
    onError: (e: Error) => {
      toast({ title: "Gagal menghapus audio", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ resultId, audioUrl }: { resultId: string; audioUrl: string | null }) => {
      if (audioUrl) {
        const { error: storageError } = await supabase.storage
          .from("exam-audio")
          .remove([audioUrl]);
        if (storageError) console.warn("Failed to delete audio file:", storageError);
      }
      const { error } = await supabase
        .from("exam_results")
        .delete()
        .eq("id", resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam_results_admin"] });
      toast({ title: "Hasil ujian berhasil dihapus" });
    },
    onError: (e: Error) => {
      toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
    },
  });

  const parseScoreReport = (report: Json | null): ScoreReport => {
    if (!report) return { items: [] };
    // New format: { items, totalScore, totalPossible, hasCriticalFail }
    if (typeof report === "object" && !Array.isArray(report) && report !== null && "items" in report) {
      return report as unknown as ScoreReport;
    }
    // Legacy format: ScoreItem[]
    if (Array.isArray(report)) {
      const items = report as unknown as ScoreItem[];
      return { items };
    }
    return { items: [] };
  };

  const getOverallDisplay = (report: Json | null): { label: string; variant: "default" | "destructive" | "outline" } => {
    const parsed = parseScoreReport(report);
    if (parsed.items.length === 0 && parsed.score == null) return { label: "—", variant: "outline" };

    // New format with score
    if (parsed.score != null) {
      const status = parsed.passStatus || (parsed.score >= 68 ? "LULUS" : "TIDAK LULUS");
      if (parsed.hasCriticalFail || status === "TIDAK LULUS") {
        return { label: `${parsed.score}/100 — TIDAK LULUS`, variant: "destructive" };
      }
      return { label: `${parsed.score}/100 — LULUS`, variant: "default" };
    }

    if (parsed.hasCriticalFail) {
      return { label: "TIDAK LULUS", variant: "destructive" };
    }

    if (parsed.totalPossible && parsed.totalPossible > 0) {
      const pct = Math.round((parsed.totalScore! / parsed.totalPossible) * 100);
      return { label: `${pct}% (${parsed.totalScore}/${parsed.totalPossible})`, variant: "default" };
    }

    const passed = parsed.items.filter((i) => i.passed).length;
    return { label: `${passed}/${parsed.items.length}`, variant: "default" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" /> Exam Results — {examMode === "oral_board" ? "Oral Board" : "Panel"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filteredResults.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No exam results yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden sm:table-cell">Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((r: any) => {
                const scoreDisplay = getOverallDisplay(r.ai_score_report);
                const parsed = parseScoreReport(r.ai_score_report);
                return (
                  <>
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                      <TableCell className="font-medium whitespace-normal break-words max-w-[120px] sm:max-w-none">
                        {r.profiles?.full_name ?? "—"}
                        <span className="block sm:hidden text-xs font-normal text-muted-foreground break-words">
                          {r.exam_sessions?.clinical_cases?.title ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell whitespace-normal break-words max-w-[220px]">{r.exam_sessions?.clinical_cases?.title ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.exam_sessions?.status === "completed" ? "default" : "secondary"}>
                          {r.exam_sessions?.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <Badge variant={scoreDisplay.variant} className="whitespace-normal text-center">{scoreDisplay.label}</Badge>
                        {r.ai_eval_status === "error" && (
                          <p className="text-[11px] text-destructive mt-1 max-w-[180px]" title={r.ai_eval_error ?? ""}>Evaluasi gagal: {r.ai_eval_error ?? "coba lagi"}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={(evaluateMutation.isPending && evaluateMutation.variables === r.id) || !r.audio_file_url || r.ai_eval_status === "processing" || r.ai_eval_status === "queued"}
                                  onClick={(e) => { e.stopPropagation(); evaluateMutation.mutate(r.id); }}
                                >
                                  {(r.ai_eval_status === "processing" || r.ai_eval_status === "queued" || (evaluateMutation.isPending && evaluateMutation.variables === r.id)) ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1" /> : <Play className="h-4 w-4 sm:mr-1" />}
                                  <span className="hidden sm:inline">{r.ai_eval_status === "processing" ? "Menilai..." : r.ai_eval_status === "queued" ? "Antre" : "Evaluate"}</span>
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!r.audio_file_url && (
                              <TooltipContent>Audio telah dihapus, evaluasi tidak dapat dijalankan ulang</TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Hapus hasil ujian ini? Kandidat akan bisa mengerjakan ujian lagi.")) {
                              deleteMutation.mutate({ resultId: r.id, audioUrl: r.audio_file_url });
                            }
                          }}
                        >
                          {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1" /> : <Trash2 className="h-4 w-4 sm:mr-1" />}
                          <span className="hidden sm:inline">Hapus</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === r.id ? null : r.id); }}>
                          {expandedId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === r.id && (
                      <TableRow key={`${r.id}-detail`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            {r.audio_file_url && (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold">Audio Recording</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={deleteAudioMutation.isPending}
                                    onClick={() => {
                                      if (confirm("Hapus file audio secara permanen? Transcript dan hasil AI tetap tersimpan.")) {
                                        deleteAudioMutation.mutate({ resultId: r.id, audioUrl: r.audio_file_url });
                                      }
                                    }}
                                  >
                                    {deleteAudioMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Volume2 className="h-3.5 w-3.5 mr-1" />}
                                    Hapus Audio
                                  </Button>
                                </div>
                                {audioUrls[r.id] ? (
                                  <audio controls src={audioUrls[r.id]} className="w-full max-w-md" />
                                ) : (
                                  <p className="text-sm text-muted-foreground">Loading audio...</p>
                                )}
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm font-semibold mb-1">Transcript</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3">
                                {r.transcript || "No transcript available. Run AI Evaluation to generate."}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold mb-1">AI Score Report</h4>
                              {parsed.hasCriticalFail && (
                                <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="font-semibold">TIDAK LULUS — Item critical tidak dilakukan</span>
                                </div>
                              )}
                              {parsed.items.length > 0 ? (
                                <div className="space-y-1.5">
                                  {parsed.items.map((item, idx) => {
                                    const max = item.maxPoints ?? 2;
                                    const earned = item.points ?? (item.passed ? max : 0);
                                    const coverage = item.coverage ?? (earned >= max ? "full" : earned > 0 ? "partial" : "none");
                                    const statusLabel = coverage === "full" ? "PASS" : coverage === "partial" ? "HALF" : "FAIL";
                                    const statusVariant = coverage === "full" ? "default" : coverage === "partial" ? "secondary" : "destructive";
                                    return (
                                      <div key={idx} className="rounded-md border border-border bg-background p-2 text-sm space-y-1">
                                        <div className="flex items-start gap-2">
                                          <Badge variant={statusVariant} className="text-xs shrink-0 mt-0.5">
                                            {statusLabel}
                                          </Badge>
                                          {item.isCritical && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-1" />}
                                          <span className="flex-1 min-w-0 break-words">{item.item}</span>
                                          <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                                            {earned}/{max} pts
                                          </span>
                                        </div>
                                        {(item.evidenceQuote || item.comment) && (
                                          <p className="text-xs text-muted-foreground break-words">
                                            {item.evidenceQuote ? `Kutipan: "${item.evidenceQuote}"` : item.comment}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {parsed.totalPossible != null && (
                                    <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                                      <span>Total</span>
                                      <span>{parsed.totalScore}/{parsed.totalPossible} pts ({Math.round((parsed.totalScore! / parsed.totalPossible) * 100)}%)</span>
                                    </div>
                                  )}
                                  {parsed.score != null && (
                                    <div className="flex items-center justify-between text-base font-bold border-t border-border pt-3 mt-3">
                                      <span>Nilai Akhir</span>
                                      <Badge variant={parsed.score >= 68 && !parsed.hasCriticalFail ? "default" : "destructive"} className="text-base px-3 py-1">
                                        {parsed.score}/100 — {parsed.passStatus || (parsed.score >= 68 ? "LULUS" : "TIDAK LULUS")}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No score report. Run AI Evaluation to generate.</p>
                              )}
                            </div>

                            <DetailedFeedbackDisplay
                              detailedFeedback={parsed.detailedFeedback}
                              overallStrengths={parsed.overallStrengths}
                              overallWeaknesses={parsed.overallWeaknesses}
                              prioritizedImprovements={parsed.prioritizedImprovements}
                              reasoning={parsed.reasoning}
                              tips={parsed.tips}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsViewer;
