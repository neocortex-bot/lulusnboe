// One deadline wake-up; the server decides expiration and protects active sequences.
export function scheduleWaitingExpiry(
  expiresAt: string | null | undefined,
  refresh: () => Promise<void>,
  now = Date.now(),
): () => void {
  const deadline = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(deadline)) return () => {};
  const timer = setTimeout(() => { void refresh(); }, Math.max(0, deadline - now) + 100);
  return () => clearTimeout(timer);
}