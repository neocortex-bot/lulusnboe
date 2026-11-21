export interface ExaminerSessionRow {
  id: string;
  status: string;
  session_start_time: string | null;
  created_at: string;
  current_candidate_id?: string | null;
  deployment_id?: string | null;
  case?: { time_limit_seconds?: number } | null;
}

/** Reading stays eligible; elapsed answering sessions must not block live rooms. */
export function pickActiveExaminerSessions<T extends ExaminerSessionRow>(rows: T[], now = Date.now()): T[] {
  return rows
    .filter((r) => {
      if (r.status !== "active" || (!r.current_candidate_id && !r.session_start_time)) return false;
      if (!r.session_start_time) return true;
      const start = Date.parse(r.session_start_time);
      const limit = r.case?.time_limit_seconds;
      // Do not invent a deadline when legacy data lacks the case duration.
      return !Number.isFinite(start) || limit === undefined || !Number.isFinite(limit)
        || now < start + limit * 1000;
    })
    .sort((a, b) => (Date.parse(b.session_start_time ?? b.created_at) || 0) - (Date.parse(a.session_start_time ?? a.created_at) || 0));
}

/** Keep current choice if still active; otherwise auto-pick only when exactly one is active. */
export function resolveSelectedSession(active: ExaminerSessionRow[], current: string | null, previous?: ExaminerSessionRow | null, choosing = false): string | null {
  if (active.length === 1) return active[0].id;
  if (choosing) return null;
  if (current && active.some((s) => s.id === current)) return current;
  if (previous?.current_candidate_id && previous.deployment_id) {
    const next = active.filter((s) => s.current_candidate_id === previous.current_candidate_id && s.deployment_id === previous.deployment_id);
    if (next.length === 1) return next[0].id;
  }
  return active.length === 1 ? active[0].id : null;
}

export function examinerPhase(start: string | null, limitSeconds: number, now: number) {
  if (!start) return { label: "Membaca", left: null };
  return { label: "Menjawab", left: Math.max(0, limitSeconds * 1000 - (now - Date.parse(start))) };
}
