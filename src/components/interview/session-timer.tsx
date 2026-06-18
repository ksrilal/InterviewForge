"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SessionTimerProps {
  startedAt: string;
  timeLimitSeconds: number;
  onExpire: () => void;
}

export function SessionTimer({ startedAt, timeLimitSeconds, onExpire }: SessionTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(timeLimitSeconds - elapsed, 0);
  });
  const hasExpiredRef = useState(() => ({ fired: false }))[0];

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const next = Math.max(timeLimitSeconds - elapsed, 0);
      setRemaining(next);
      if (next === 0 && !hasExpiredRef.fired) {
        hasExpiredRef.fired = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timeLimitSeconds, onExpire, hasExpiredRef]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining < 60;

  return (
    <span className={cn("font-mono text-sm font-medium", isLow ? "text-destructive" : "text-foreground")}>
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}
