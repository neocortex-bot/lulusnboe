import { useEffect, useRef } from "react";
import { useExamClock } from "@/hooks/useExamClock";
import { examSecondsLeft } from "@/lib/examClock";

interface CountdownTimerProps {
  sessionStartTime: string;
  timeLimitSeconds: number;
  onComplete: () => void;
  className?: string;
}

const CountdownTimer = ({
  sessionStartTime,
  timeLimitSeconds,
  onComplete,
  className = "",
}: CountdownTimerProps) => {
  const now = useExamClock();
  const remaining = examSecondsLeft(sessionStartTime, timeLimitSeconds, now);
  const firedFor = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const key = `${sessionStartTime}:${timeLimitSeconds}`;
    if (remaining === 0 && firedFor.current !== key) {
      firedFor.current = key;
      onCompleteRef.current();
    }
  }, [remaining, sessionStartTime, timeLimitSeconds]);

  const minutes = Math.floor((remaining ?? 0) / 60);
  const seconds = (remaining ?? 0) % 60;

  const isUrgent = remaining !== null && remaining <= 30;

  return (
    <div
      className={`font-mono text-center ${
        isUrgent ? "text-destructive animate-pulse" : "text-foreground"
      } ${className}`}
    >
      <span className="text-4xl sm:text-7xl font-bold tabular-nums">
        {remaining === null ? "--:--" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
      </span>
    </div>
  );
};

export default CountdownTimer;
