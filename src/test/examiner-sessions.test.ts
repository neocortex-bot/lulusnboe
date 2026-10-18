import { describe, it, expect } from "vitest";
import { pickActiveExaminerSessions, resolveSelectedSession } from "@/lib/examinerSessions";

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
  it("requires a choice when more than one is active", () => {
    expect(resolveSelectedSession([row("a", "active", "x"), row("b", "active", "y")], null)).toBeNull();
  });
  it("drops the selection when that session ends", () => {
    expect(resolveSelectedSession([row("b", "active", "y"), row("c", "active", "z")], "a")).toBeNull();
  });
});
