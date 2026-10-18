export interface ExaminerSessionRow {
  id: string;
  status: string;
  session_start_time: string | null;
  created_at: string;
}

/** Only sessions a candidate has actually started; newest start first. */
export function pickActiveExaminerSessions<T extends ExaminerSessionRow>(rows: T[]): T[] {
  return rows
    .filter((r) => r.status === "active" && !!r.session_start_time)
    .sort((a, b) => (b.session_start_time ?? "").localeCompare(a.session_start_time ?? ""));
}

/** Keep current choice if still active; otherwise auto-pick only when exactly one is active. */
export function resolveSelectedSession(active: ExaminerSessionRow[], current: string | null): string | null {
  if (current && active.some((s) => s.id === current)) return current;
  return active.length === 1 ? active[0].id : null;
}
