import { parseDigitalProperties } from "@/lib/digitalProperties";

export function getCaseMediaReadiness(rubric: unknown) {
  const required = parseDigitalProperties(rubric).filter((p) => p.needs_media);
  const completed = required.filter((p) => p.media_url?.trim()).length;
  return { required: required.length, completed, ready: required.length > 0 && completed === required.length };
}

/** Record only a successful AI check, never a click that failed. */
export async function runAndRecordPropertyCheck<T>(check: () => Promise<T>, record: (at: string) => Promise<void>): Promise<T> {
  const result = await check();
  await record(new Date().toISOString());
  return result;
}