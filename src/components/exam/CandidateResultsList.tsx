import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadCandidateHistory, loadCandidateHistoryDetail } from "@/lib/candidateHistory";
import { EXAM_RESULTS_PAGE_SIZE } from "@/lib/examPerformance";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertTriangle, History } from "lucide-react";
import DetailedFeedbackDisplay from "@/components/exam/DetailedFeedbackDisplay";
import type { Json } from "@/integrations/supabase/types";
import { canCandidateViewResultDetails } from "@/lib/resultVisibility";
import ModelAnswerPanel from "@/components/exam/ModelAnswerPanel";
import ResultCasePrompt from "@/components/exam/ResultCasePrompt";

interface ScoreItem {
  item: string;
  passed: boolean;
  comment?: string;
  /** Points earned: 2 = fully mentioned, 1 = mentioned but incomplete, 0 = not mentioned. */
  points?: number;
  /** Ceiling for this rubric line (2). */
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

const parseScoreReport = (report: Json | null): ScoreReport => {
  if (!report) return { items: [] };
  if (typeof report === "object" && !Array.isArray(report) && report !== null && "items" in report) {
    return report as unknown as ScoreReport;
  }
  if (Array.isArray(report)) {
    return { items: report as unknown as ScoreItem[] };
  }
  return { items: [] };
};

const getScoreDisplay = (report: Json | null): { label: string; variant: "default" | "destructive" | "outline" } => {
  const parsed = parseScoreReport(report);
  if (parsed.items.length === 0 && parsed.score == null) return { label: "Belum dinilai", variant: "outline" };

  if (parsed.score != null) {
    const status = parsed.passStatus || (parsed.score >= 68 ? "LULUS" : "TIDAK LULUS");
    if (parsed.hasCriticalFail || status === "TIDAK LULUS") {
      return { label: `${parsed.score}/100 — TIDAK LULUS`, variant: "destructive" };
    }
    return { label: `${parsed.score}/100 — LULUS`, variant: "default" };
  }

  if (parsed.hasCriticalFail) return { label: "TIDAK LULUS", variant: "destructive" };

  if (parsed.totalPossible && parsed.totalPossible > 0) {
    const pct = Math.round(((parsed.totalScore ?? 0) / parsed.totalPossible) * 100);
    return { label: `${pct}% (${parsed.totalScore}/${parsed.totalPossible})`, variant: "default" };
  }

  const passed = parsed.items.filter((i) => i.passed).length;
  return { label: `${passed}/${parsed.items.length}`, variant: "default" };
};

const CandidateResultsList = () => {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: resultPage, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["candidate_results", user?.id, page],
    enabled: !!user?.id,
    retry: false,
    gcTime: 30_000,
    queryFn: ({ signal }) => {
      if (!user) return { rows: [], count: 0 };
      return loadCandidateHistory(user.id, page, signal);
    },
  });
  const results = resultPage?.rows ?? [];
  const selectedResult = results.find(r => r.id === expandedId);
  const detailAllowed = canCandidateViewResultDetails(selectedResult?.exam_sessions?.show_results_to_candidate_override, selectedResult?.exam_sessions?.clinical_cases?.show_results_to_candidate);
  const { data: detail, isLoading: detailLoading, isError: detailError, refetch: refetchDetail } = useQuery({
    queryKey: ["candidate_result_detail", user?.id, expandedId],
    enabled: !!user && !!expandedId && detailAllowed,
    retry: false, gcTime: 0,
    queryFn: ({ signal }) => user && expandedId ? loadCandidateHistoryDetail(user.id, expandedId, signal) : null,
  });

  if (isError) return <Card><CardHeader><CardTitle className="text-lg">Riwayat Ujian</CardTitle></CardHeader>
    <CardContent className="space-y-3"><p role="alert" className="text-sm text-destructive">Riwayat ujian gagal dimuat. Periksa koneksi lalu coba lagi.</p>
      <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>Coba lagi</Button>
    </CardContent></Card>;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Memuat riwayat...</CardContent>
      </Card>
    );
  }

  if (results.length === 0 && page === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" /> Riwayat Ujian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Belum ada riwayat ujian.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" /> Riwayat Ujian
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((r: any) => {
          const sessionData = r.exam_sessions;
          const caseData = sessionData?.clinical_cases;
          const showResults = canCandidateViewResultDetails(
            sessionData?.show_results_to_candidate_override,
            caseData?.show_results_to_candidate
          );
          const caseTitle = "Ujian";
          const date = new Date(r.created_at).toLocaleDateString("id-ID", {
            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
          });
          const isExpanded = expandedId === r.id;
          const report = isExpanded ? detail?.ai_score_report ?? r.ai_score_report : r.ai_score_report;
          const parsed = parseScoreReport(report);
          const scoreDisplay = getScoreDisplay(r.ai_score_report);
          const transcript = isExpanded ? detail?.transcript ?? "" : "";

          return (
            <div key={r.id} className="rounded-lg border border-border overflow-hidden">
              <Button variant="ghost"
                className="w-full h-auto whitespace-normal flex flex-col items-start sm:flex-row sm:items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => showResults && setExpandedId(isExpanded ? null : r.id)}
                disabled={!showResults}
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{caseTitle}</p>
                  <p className="text-xs text-muted-foreground">{date}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {showResults ? (
                    <>
                      <Badge variant={scoreDisplay.variant}>{scoreDisplay.label}</Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </>
                  ) : (
                    <Badge variant="secondary">Selesai</Badge>
                  )}
                </div>
              </Button>

              {showResults && isExpanded && (
                <div className="border-t border-border p-4 bg-muted/30 space-y-4">
                  {detailLoading ? <p className="text-sm text-muted-foreground">Memuat hasil ujian...</p> : detailError ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Detail hasil gagal dimuat.</p><Button variant="outline" onClick={() => void refetchDetail()}>Coba lagi</Button></div> : <>
                  <ResultCasePrompt key={r.id} resultId={r.id} />
                  <ModelAnswerPanel
                    resultId={r.id}
                    cached={(report as any)?.modelAnswer}
                    rubricItems={parsed.items}
                  />
                  {parsed.hasCriticalFail && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-semibold">TIDAK LULUS — Item critical tidak dilakukan</span>
                    </div>
                  )}

                  <div className="rounded-md border border-border bg-background p-3">
                    <h4 className="text-sm font-normal mb-2">Jawaban Peserta (transkrip)</h4>
                    {transcript ? (
                      // Plain text on purpose: the transcript is a raw Whisper
                      // output, so highlighting it would flag pronunciation and
                      // spelling artefacts rather than clinical content.
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{transcript}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Transkrip jawaban tidak tersedia.</p>
                    )}
                  </div>

                  {parsed.items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-normal mb-2">Rubrik Penilaian</h4>
                      <div className="min-w-0 space-y-1">
                        {parsed.items.map((item, idx) => {
                          // Single source of truth: the evaluation report. Scoring
                          // per rubric line is 2 (fully mentioned), 1 (mentioned
                          // but incomplete) or 0 (not mentioned).
                          const earned = item.points ?? 0;
                          const max = item.maxPoints ?? 2;
                          const coverage = item.coverage ?? (item.passed ? "full" : "none");
                          const mentioned = coverage !== "none";
                          const label = coverage === "full"
                            ? "Disebut lengkap"
                            : coverage === "partial"
                              ? "Disebut, belum lengkap"
                              : "Belum disebut";
                          const reason = item.evidenceQuote
                            ? `Kutipan: "${item.evidenceQuote}"`
                            : (item.comment || label);
                          return (
                            <div key={idx} className={`flex flex-wrap items-start gap-2 text-sm ${mentioned ? "" : "text-muted-foreground"}`}>
                              <Badge variant={coverage === "full" ? "default" : coverage === "partial" ? "secondary" : "destructive"} className="text-xs shrink-0">
                                {label}
                              </Badge>
                              {item.isCritical && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
                              {/*
                                A rubric line the participant did not mention is
                                shown bold+italic so it reads as "you should have
                                said this". The weight classes must be mutually
                                exclusive: combining font-normal with font-bold
                                lets font-normal win and the emphasis disappears.
                              */}
                              <span className={`min-w-0 basis-full sm:basis-0 flex-1 ${mentioned ? "font-normal" : "font-bold italic"}`}>{item.item}</span>
                              <span className="text-xs font-mono text-muted-foreground shrink-0">{earned}/{max} poin</span>
                              <span className="w-full text-muted-foreground text-xs">{reason}</span>
                            </div>
                          );
                        })}
                        {parsed.totalPossible != null && (
                          <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                            <span>Total</span>
                            <span>{parsed.totalScore}/{parsed.totalPossible} pts ({parsed.totalPossible > 0 ? Math.round(((parsed.totalScore ?? 0) / parsed.totalPossible) * 100) : 0}%)</span>
                          </div>
                        )}
                        {parsed.score != null && (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-base font-bold border-t border-border pt-3 mt-3">
                            <span>Nilai Akhir</span>
                            <Badge variant={parsed.score >= 68 && !parsed.hasCriticalFail ? "default" : "destructive"} className="text-base px-3 py-1">
                              {parsed.score}/100 — {parsed.passStatus || (parsed.score >= 68 ? "LULUS" : "TIDAK LULUS")}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <DetailedFeedbackDisplay
                    detailedFeedback={parsed.detailedFeedback}
                    overallStrengths={parsed.overallStrengths}
                    overallWeaknesses={parsed.overallWeaknesses}
                    prioritizedImprovements={parsed.prioritizedImprovements}
                    reasoning={parsed.reasoning}
                    tips={parsed.tips}
                  />

                  {!parsed.items.length && parsed.score == null && (
                    <p className="text-sm text-muted-foreground">Belum ada hasil evaluasi AI.</p>
                  )}
                  </>}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="text-sm text-muted-foreground">Halaman {page + 1} · {resultPage?.count ?? 0} ujian</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0 || isFetching} onClick={() => { setExpandedId(null); setPage(p => p - 1); }}>Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * EXAM_RESULTS_PAGE_SIZE >= (resultPage?.count ?? 0) || isFetching} onClick={() => { setExpandedId(null); setPage(p => p + 1); }}>Berikutnya</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidateResultsList;
