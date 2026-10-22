import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Monitor, MonitorOff, AlertTriangle, Loader2 } from "lucide-react";
import { parseDigitalProperties, PROPERTY_SHOW_EVENT, PROPERTY_ACK_EVENT, PROPERTY_SYNC_EVENT, isMediaPending, isCaptionVisible, type DigitalProperty } from "@/lib/digitalProperties";
import { pickActiveExaminerSessions, resolveSelectedSession, examinerPhase, type ExaminerSessionRow } from "@/lib/examinerSessions";

type Prop = string | { name?: string; label?: string; key?: string; value?: string };

const splitProp = (p: Prop) => {
  if (typeof p !== "string") return { name: p.name ?? p.label ?? p.key ?? "", value: p.value ?? "" };
  const i = p.indexOf(":");
  return i > 0 ? { name: p.slice(0, i).trim(), value: p.slice(i + 1).trim() } : { name: "", value: p };
};

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

const Examiner = () => {
  const { user, isMasterAdmin } = useAuth();
  const qc = useQueryClient();
  const now = useNow();
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [choosing, setChoosing] = useState(false);
  const previousRef = useRef<ExaminerSessionRow | null>(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const desiredRef = useRef<{ property: DigitalProperty | null; request_id: string; index: number | null } | null>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["examiner_sessions", user?.id, isMasterAdmin],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from("exam_sessions")
        .select("id, status, session_start_time, created_at, case_id, current_candidate_id, examiner_id, station_token")
        .eq("status", "active");
      if (!isMasterAdmin) q = q.eq("examiner_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      const sessions = data ?? [];
      const caseIds = [...new Set(sessions.map((s) => s.case_id))];
      const candIds = [...new Set(sessions.map((s) => s.current_candidate_id).filter(Boolean))] as string[];
      const sIds = sessions.map((s) => s.id);
      const [cases, keys, profs, seq] = await Promise.all([
        caseIds.length ? supabase.from("clinical_cases").select("id, title, initial_prompt, reading_time_seconds, time_limit_seconds").in("id", caseIds) : { data: [] },
        caseIds.length ? supabase.from("case_answer_keys").select("case_id, checklist_rubric").in("case_id", caseIds) : { data: [] },
        candIds.length ? supabase.from("profiles").select("id, full_name").in("id", candIds) : { data: [] },
        sIds.length ? supabase.from("exam_sequence_items").select("session_id, deployment_id, sequence_order").in("session_id", sIds) : { data: [] },
      ]);
      for (const result of [cases, keys, profs, seq]) {
        if ("error" in result && result.error) throw result.error;
      }
      const depIds = [...new Set((seq.data ?? []).map((x: any) => x.deployment_id))];
      const totals = depIds.length ? (await supabase.from("exam_sequence_items").select("deployment_id").in("deployment_id", depIds)).data ?? [] : [];
      const cMap = new Map((cases.data ?? []).map((c: any) => [c.id, c]));
      const kMap = new Map((keys.data ?? []).map((k: any) => [k.case_id, k.checklist_rubric]));
      const pMap = new Map((profs.data ?? []).map((p: any) => [p.id, p.full_name]));
      const sMap = new Map((seq.data ?? []).map((x: any) => [x.session_id, x]));
      return sessions.map((s) => {
        const sq: any = sMap.get(s.id);
        const rub: any = kMap.get(s.case_id);
        return {
          ...s,
          case: cMap.get(s.case_id) as any,
          candidate: pMap.get(s.current_candidate_id ?? "") ?? "Peserta",
          order: sq?.sequence_order ?? null,
          deployment_id: sq?.deployment_id ?? null,
          total: sq ? totals.filter((t: any) => t.deployment_id === sq.deployment_id).length : null,
          properties: (Array.isArray(rub?.properties) ? rub.properties : []) as Prop[],
          digital: parseDigitalProperties(rub),
        };
      });
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`examiner:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_sessions", ...(isMasterAdmin ? {} : { filter: `examiner_id=eq.${user.id}` }) },
        () => qc.invalidateQueries({ queryKey: ["examiner_sessions"] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, isMasterAdmin, qc]);

  const active = useMemo(() => pickActiveExaminerSessions(rows), [rows]);
  const currentId = choosing ? null : resolveSelectedSession(active, selected, previousRef.current);
  const current = active.find((s) => s.id === currentId);
  useEffect(() => {
    if (current) {
      previousRef.current = current;
      setSelected(current.id);
    }
  }, [current]);

  // Channel ke layar station untuk sesi terpilih
  useEffect(() => {
    setShown(null);
    setConnected(false);
    setSending(false);
    setDisplayError(null);
    desiredRef.current = null;
    if (!currentId) return;
    let alive = true;
    const ch = supabase.channel(`session:${currentId}`)
      .on("broadcast", { event: PROPERTY_ACK_EVENT }, ({ payload }) => {
        if (!alive || !desiredRef.current || payload?.request_id !== desiredRef.current.request_id) return;
        if (ackTimer.current) clearTimeout(ackTimer.current);
        setShown(desiredRef.current.index);
        setSending(false);
        setDisplayError(null);
      })
      .on("broadcast", { event: PROPERTY_SYNC_EVENT }, () => {
        if (alive && desiredRef.current) void ch.send({ type: "broadcast", event: PROPERTY_SHOW_EVENT, payload: desiredRef.current });
      })
      .subscribe((status) => {
        if (!alive) return;
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED" && desiredRef.current) void ch.send({ type: "broadcast", event: PROPERTY_SHOW_EVENT, payload: desiredRef.current });
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          setShown(null);
          setSending(false);
          setDisplayError("Koneksi terputus. Tampilan layar peserta belum dapat dipastikan.");
        }
      });
    chRef.current = ch;
    return () => {
      alive = false;
      if (ackTimer.current) clearTimeout(ackTimer.current);
      // Close the old screen before leaving it; never broadcast new-session data to it.
      void ch.send({ type: "broadcast", event: PROPERTY_SHOW_EVENT, payload: { property: null, request_id: crypto.randomUUID() } })
        .finally(() => { void supabase.removeChannel(ch); });
      chRef.current = null;
    };
  }, [currentId]);

  const toggleShow = async (i: number) => {
    if (!current || !chRef.current || !connected || sending) return;
    const ch = chRef.current;
    const next = shown === i ? null : i;
    const p = next === null ? null : current.digital[next];
    const request = { property: p ?? null, request_id: crypto.randomUUID(), index: next };
    desiredRef.current = request;
    setSending(true);
    setDisplayError(null);
    if (ackTimer.current) clearTimeout(ackTimer.current);
    ackTimer.current = setTimeout(() => {
      if (chRef.current !== ch) return;
      setSending(false);
      setShown(null);
      setDisplayError("Layar peserta belum mengonfirmasi. Periksa layar lalu coba kembali.");
    }, 5000);
    try {
      const result = await ch.send({ type: "broadcast", event: PROPERTY_SHOW_EVENT, payload: request });
      if (chRef.current !== ch) return;
      if (result !== "ok") throw new Error("send failed");
    } catch {
      if (chRef.current !== ch) return;
      if (ackTimer.current) clearTimeout(ackTimer.current);
      setSending(false);
      setShown(null);
      setDisplayError("Gagal mengirim properti. Silakan coba kembali.");
    }
  };

  const phase = (s: (typeof active)[number]) => {
    return examinerPhase(s.session_start_time, s.case?.time_limit_seconds ?? 0, now);
  };
  const fmt = (ms: number | null) => { if (ms === null) return ""; const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">Halaman Penguji</h1>
        <p className="text-sm text-muted-foreground">{active.length} sesi aktif</p>
        {isLoading && <p role="status">Memuat sesi ujian...</p>}
        {isError && <div role="alert" className="space-y-2 text-destructive"><p>Gagal memuat sesi atau detail soal.</p><Button variant="outline" onClick={() => void refetch()}>Coba lagi</Button></div>}

        {!current && (
          <>
            <p className="text-sm text-muted-foreground">
              {active.length === 0 && !isLoading && !isError ? "Belum ada peserta yang memulai ujian pada soal yang Anda uji." : active.length ? "Pilih sesi ujian." : ""}
            </p>
            {active.map((s) => {
              const ph = phase(s);
              return (
                <Button key={s.id} variant="outline" onClick={() => { setSelected(s.id); setChoosing(false); }} className="h-auto w-full whitespace-normal p-4 text-left">
                    <div className="w-full min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="break-words font-medium">{s.candidate}</span>
                        <Badge variant={ph.label === "Membaca" ? "secondary" : "default"}>{ph.label} {fmt(ph.left)}</Badge>
                      </div>
                      <p className="break-words text-sm text-muted-foreground">{s.case?.title}{s.order ? ` · Soal ${s.order}/${s.total}` : ""} · {s.station_token}</p>
                    </div>
                </Button>
              );
            })}
          </>
        )}

        {current && (() => {
          const ph = phase(current);
          return (
            <div className="space-y-4">
              {active.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => setChoosing(true)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Sesi lain ({active.length - 1})
                </Button>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="break-words text-base">{current.candidate}</CardTitle>
                    <Badge variant={ph.label === "Membaca" ? "secondary" : "default"}>{ph.label} {fmt(ph.left)}</Badge>
                  </div>
                  <p className="break-words text-sm text-muted-foreground">{current.case?.title}{current.order ? ` · Soal ${current.order}/${current.total}` : ""} · {current.station_token}</p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line break-words text-sm">{current.case?.initial_prompt}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Properti Digital (tampilkan bila diminta)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p role="status" className="text-sm text-muted-foreground">{sending ? "Menunggu konfirmasi layar peserta..." : connected ? "Pengiriman siap" : "Menghubungkan..."}</p>
                  {displayError && <p role="alert" className="text-sm text-destructive">{displayError}</p>}
                  {current.digital.length === 0 && <p className="text-sm text-muted-foreground">Soal ini tidak punya properti digital.</p>}
                  {current.digital.map((p, i) => {
                    const on = shown === i;
                    return (
                      <Button variant="outline" disabled={!connected || sending || isError} aria-pressed={on} key={`${current.id}:${i}`} onClick={() => void toggleShow(i)}
                        className={`h-auto w-full items-start justify-start whitespace-normal p-3 text-left ${on ? "border-primary bg-primary/10" : "border-border"}`}>
                        {on ? <Monitor className="mt-1 h-5 w-5 shrink-0 text-primary" /> : <MonitorOff className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-muted-foreground">{p.label}{p.media_type ? ` · ${p.media_type === "image" ? "gambar" : p.media_type === "video" ? "video" : "suara"}` : ""}</div>
                          {p.value && <div className="whitespace-pre-line break-words text-lg font-semibold">{p.value}</div>}
                          {!isCaptionVisible(p) && <p className="text-xs text-muted-foreground">Peserta hanya melihat media, tanpa caption.</p>}
                          {isMediaPending(p) && <div className="mt-1 inline-flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> Media asli belum diunggah admin</div>}
                          <div className={`mt-1 text-xs font-medium ${on ? "text-primary" : "text-muted-foreground"}`}>{on ? "Sedang tampil di layar — ketuk untuk menutup" : "Ketuk untuk tampilkan di layar"}</div>
                        </div>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Properti Fisik</CardTitle></CardHeader>
                <CardContent>
                  {current.properties.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada properti fisik.</p> : (
                    <ol className="list-inside list-decimal space-y-1 text-sm">
                      {current.properties.map((p, i) => { const sp = splitProp(p); return <li key={i}>{sp.name ? `${sp.name}: ` : ""}{sp.value}</li>; })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Examiner;
