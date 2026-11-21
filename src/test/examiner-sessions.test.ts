import { describe, it, expect } from "vitest";
import { pickActiveExaminerSessions, resolveSelectedSession, examinerPhase } from "@/lib/examinerSessions";

const row = (id: string, status: string, start: string | null) => ({ id, status, session_start_time: start, created_at: "" });

describe("examiner sessions", () => {
  it("shows only started active sessions, newest first", () => {
    const out = pickActiveExaminerSessions([
      row("w", "waiting", null), row("a", "active", "2026-01-01T01:00"), row("c", "completed", "2026-01-01T03:00"), row("b", "active", "2026-01-01T02:00"),
    ]);
    expect(out.map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("auto-picks when exactly one is active", () => {
    expect(resolveSelectedSession([row("a", "active", "x")], null)).toBe("a");
  });
  it("excludes an elapsed answering session even when its saved status is active", () => {
    const now = Date.parse("2026-11-21T08:30:00Z");
    const out = pickActiveExaminerSessions([
      { ...row("elapsed", "active", "2026-11-21T08:24:00Z"), case: { time_limit_seconds: 360 } },
      { ...row("running", "active", "2026-11-21T08:29:00Z"), case: { time_limit_seconds: 360 } },
      { ...row("waiting", "waiting", null), created_at: "2026-01-01T00:00:00Z" },
      { ...row("reading", "active", null), current_candidate_id: "p1", created_at: "2026-01-01T00:00:00Z" },
    ], now);
    expect(out.map(s => s.id)).toEqual(["running", "reading"]);
  });
  it("auto-opens the only remaining session even after returning to the room picker", () => {
    expect(resolveSelectedSession([row("remaining", "active", "x")], "ended", null, true)).toBe("remaining");
  });
  it("keeps the room picker open with two sessions despite a previous selection", () => {
    expect(resolveSelectedSession([row("a", "active", "x"), row("b", "active", "y")], "a", null, true)).toBeNull();
  });
  it("requires a choice when more than one is active", () => {
    expect(resolveSelectedSession([row("a", "active", "x"), row("b", "active", "y")], null)).toBeNull();
  });
  it("drops the selection when that session ends", () => {
    expect(resolveSelectedSession([row("b", "active", "y"), row("c", "active", "z")], "a")).toBeNull();
  });
  it("includes a claimed reading session before the answering timer starts", () => {
    expect(pickActiveExaminerSessions([{ ...row("reading", "active", null), current_candidate_id: "candidate-1" }]).map(s => s.id)).toEqual(["reading"]);
  });
  it("keeps the selected session when another candidate starts", () => {
    expect(resolveSelectedSession([row("a", "active", "x"), row("b", "active", "y")], "a")).toBe("a");
  });
  it("follows the same candidate within the same deployment, not another candidate", () => {
    const previous = { ...row("old", "completed", "x"), current_candidate_id: "p1", deployment_id: "d1" };
    const next = { ...row("next", "active", "x"), current_candidate_id: "p1", deployment_id: "d1" };
    const other = { ...row("other", "active", "y"), current_candidate_id: "p2", deployment_id: "d1" };
    expect(resolveSelectedSession([other, next], "old", previous)).toBe("next");
    expect(resolveSelectedSession([{ ...next, deployment_id: "different" }, other], "old", previous)).toBeNull();
  });
  it("uses answering start directly, without adding reading time", () => {
    expect(examinerPhase("2026-10-22T03:00:00Z", 360, Date.parse("2026-10-22T03:01:00Z"))).toEqual({ label: "Menjawab", left: 300000 });
    expect(examinerPhase(null, 360, Date.now())).toEqual({ label: "Membaca", left: null });
  });
});
