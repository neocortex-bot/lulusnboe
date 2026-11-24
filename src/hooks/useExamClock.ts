import { useSyncExternalStore } from "react";
import { getExamClockSnapshot, subscribeExamClock } from "@/lib/examClock";

export function useExamClock() {
  return useSyncExternalStore(subscribeExamClock, getExamClockSnapshot, () => null);
}