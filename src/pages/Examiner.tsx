import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { pickActiveExaminerSessions, resolveSelectedSession } from "@/lib/examinerSessions";

interface Prop { name?: string; label?: string; key?: string; value?: string }

const propName = (p: Prop) => p.name ?? p.label ?? p.key ?? "";

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
  const [given, setGiven] = useState<Record<string, boolean>>({});

  const { data: rows = [] } = useQuery({
    queryKey: ["examiner_sessions", user?.id, isMasterAdmin],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      let q = supabase.from("exam_sessions")
        .select("id, status, session_start_time, created_at, case_id, current_candidate_id, examiner_id, station_token")
        .eq("status", "active");
      if (!isMasterAdmin) q = q.eq("examiner_id", user!.id);
      else q = q.not("examiner_id", "is", null);
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
          total: sq ? totals.filter((t: any) => t.deployment_id === sq.deployment_id).length : null,
          properties: (Array.isArray(rub?.properties) ? rub.properties : []) as Prop[],
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
  const currentId = resolveSelectedSession(active, selected);
  const current = active.find((s) => s.id === currentId);

  const phase = (s: (typeof active)[number]) => {
    const start = new Date(s.session_start_time!).getTime();
    const read = (s.case?.reading_time_seconds ?? 0) * 1000;
    const limit = (s.case?.time_limit_seconds ?? 0) * 1000;
    const el = now - start;
    if (el < read) return { label: "Membaca", left: read - el };
    return { label: "Menjawab", left: Math.max(0, read + limit - el) };
  };
  const fmt = (ms: number) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">Halaman Penguji</h1>

        {!current && (
          <>
            <p className="text-sm text-muted-foreground">
              {active.length === 0 ? "Belum ada peserta yang memulai ujian pada soal yang Anda uji." : `${active.length} sesi aktif — pilih salah satu.`}
            </p>
            {active.map((s) => {
              const ph = phase(s);
              return (
                <button key={s.id} onClick={() => setSelected(s.id)} className="w-full text-left">
                  <Card className="transition-colors hover:border-primary">
                    <CardContent className="space-y-1 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{s.candidate}</span>
                        <Badge variant={ph.label === "Membaca" ? "secondary" : "default"}>{ph.label} {fmt(ph.left)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{s.case?.title}{s.order ? ` · Soal ${s.order}/${s.total}` : ""}</p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </>
        )}

        {current && (() => {
          const ph = phase(current);
          return (
            <div className="space-y-4">
              {active.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Sesi lain ({active.length - 1})
                </Button>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{current.candidate}</CardTitle>
                    <Badge variant={ph.label === "Membaca" ? "secondary" : "default"}>{ph.label} {fmt(ph.left)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{current.case?.title}{current.order ? ` · Soal ${current.order}/${current.total}` : ""}</p>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-4 whitespace-pre-line text-sm">{current.case?.initial_prompt}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Properti Soal (boleh diberikan bila diminta)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {current.properties.length === 0 && <p className="text-sm text-muted-foreground">Soal ini tidak punya properti.</p>}
                  {current.properties.map((p, i) => {
                    const k = `${current.id}:${i}`;
                    return (
                      <button key={k} onClick={() => setGiven((g) => ({ ...g, [k]: !g[k] }))}
                        className={`flex w-full items-start gap-3 rounded-md border p-3 text-left ${given[k] ? "border-primary bg-muted opacity-70" : "border-border"}`}>
                        <Check className={`mt-1 h-4 w-4 shrink-0 ${given[k] ? "text-primary" : "text-muted-foreground/30"}`} />
                        <div>
                          <div className="text-sm text-muted-foreground">{propName(p)}</div>
                          <div className="text-lg font-semibold">{p.value}</div>
                        </div>
                      </button>
                    );
                  })}
                  <p className="text-xs text-muted-foreground">Ketuk untuk menandai sudah diberikan (hanya di HP ini).</p>
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
