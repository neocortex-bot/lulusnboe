import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen } from "lucide-react";
import AssetRenderer from "@/components/station/AssetRenderer";
import { useExamClock } from "@/hooks/useExamClock";
import { examSecondsLeft } from "@/lib/examClock";
import { Button } from "@/components/ui/button";

interface ReadingPhaseViewProps {
  sessionId: string;
  onReadingComplete: (caseInfo: {
    caseTitle: string;
    casePrompt: string;
    questionsText: string;
    timeLimitSeconds: number;
  }) => Promise<boolean>;
}

const ReadingPhaseView = ({ sessionId, onReadingComplete }: ReadingPhaseViewProps) => {
  const [caseData, setCaseData] = useState<{
    title: string;
    initial_prompt: string;
    reading_time_seconds: number;
    questions_text: string;
    time_limit_seconds: number;
    case_id: string;
  } | null>(null);
  const [caseMedia, setCaseMedia] = useState<{ asset_url: string; asset_type: string }[]>([]);
  const now = useExamClock();
  const [timing, setTiming] = useState<{ reading_started_at: string | null; session_start_time: string | null } | null>(null);
  const starting = useRef(false);
  const [startFailed, setStartFailed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const remaining = timing?.reading_started_at && caseData
    ? examSecondsLeft(timing.reading_started_at, caseData.reading_time_seconds ?? 120, now)
    : null;

  // Fetch case data + case_media assets
  useEffect(() => {
    let disposed = false;
    const fetchData = async () => {
      setLoadFailed(false);
      const { error: timingError } = await supabase.rpc("start_exam_reading_timer", { _session_id: sessionId });
      if (disposed) return;
      if (timingError) { setLoadFailed(true); return; }
      const { data: session } = await supabase
        .from("exam_sessions")
        .select("case_id, reading_started_at, session_start_time")
        .eq("id", sessionId)
        .single();
      if (disposed) return;
      if (!session) { setLoadFailed(true); return; }
      setTiming(session);

      const [caseResult, mediaResult] = await Promise.all([
        supabase
          .from("clinical_cases")
          .select("title, initial_prompt, reading_time_seconds, questions_text, time_limit_seconds")
          .eq("id", session.case_id)
          .single(),
        supabase
          .from("case_assets")
          .select("asset_url, asset_type, category")
          .eq("case_id", session.case_id),
      ]);

      if (disposed) return;
      if (caseResult.data) {
        setCaseData({ ...(caseResult.data as any), case_id: session.case_id });
      } else { setLoadFailed(true); }

      const media = (mediaResult.data || []).filter((a: any) => a.category === "case_media");
      setCaseMedia(media);
    };
    void fetchData().catch(() => { if (!disposed) setLoadFailed(true); });
    return () => { disposed = true; };
  }, [sessionId, loadAttempt]);

  const completeReading = async () => {
    if (!caseData || starting.current) return;
    starting.current = true;
    setStartFailed(false);
    try {
      const ok = await onReadingComplete({
        caseTitle: caseData.title, casePrompt: caseData.initial_prompt,
        questionsText: caseData.questions_text, timeLimitSeconds: caseData.time_limit_seconds,
      });
      if (!ok) { starting.current = false; setStartFailed(true); }
    } catch { starting.current = false; setStartFailed(true); }
  };

  // Resume the persisted answering phase; never restart reading on reload.
  useEffect(() => {
    if (!startFailed && (timing?.session_start_time || remaining === 0)) void completeReading();
  }, [caseData, timing, remaining, startFailed, onReadingComplete]);

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {loadFailed ? <div role="alert" className="space-y-3 text-center"><p>Gagal memuat soal dan waktu ujian.</p><Button onClick={() => setLoadAttempt(value => value + 1)}>Coba lagi</Button></div> : <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />}
      </div>
    );
  }

  const minutes = Math.floor((remaining ?? 0) / 60);
  const seconds = (remaining ?? 0) % 60;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Waktu Membaca</span>
        </div>
        <div className={`font-mono text-2xl font-bold tabular-nums ${remaining !== null && remaining <= 10 ? "text-destructive animate-pulse" : "text-foreground"}`}>
          {remaining === null ? "--:--" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Silahkan Soal Dibaca</h1>
        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap break-words">
          {caseData.initial_prompt}
        </div>

        {caseData.questions_text?.trim() && (
          <section className="space-y-2 border-t border-border pt-4">
            <h2 className="text-lg font-semibold text-foreground">Pertanyaan Peserta</h2>
            <p className="whitespace-pre-wrap break-words text-foreground leading-relaxed">
              {caseData.questions_text}
            </p>
          </section>
        )}

        {caseMedia.length > 0 && (
          <div className="space-y-3 pt-2">
            {caseMedia.map((media, idx) => (
              <AssetRenderer key={idx} url={media.asset_url} type={media.asset_type} />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/50">
        {startFailed && <Button onClick={() => void completeReading()}>Coba mulai menjawab lagi</Button>}
        <p className="text-sm text-muted-foreground text-center">
          Baca kasus di atas dengan seksama. Ujian akan dimulai otomatis setelah waktu baca habis.
        </p>
      </div>
    </div>
  );
};

export default ReadingPhaseView;
