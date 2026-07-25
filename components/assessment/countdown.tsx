"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function Countdown({ minutes, onExpire }: { minutes: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(minutes * 60);

  useEffect(() => {
    const startTs = Date.now();
    const totalMs = minutes * 60 * 1000;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((totalMs - (Date.now() - startTs)) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        onExpire?.();
      }
    }, 500);
    return () => clearInterval(tick);
  }, [minutes, onExpire]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const danger = remaining < 60;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm",
        danger ? "border-destructive bg-destructive/10 text-destructive" : "bg-muted",
      )}
    >
      <Clock className="h-4 w-4" />
      {mm}:{ss}
    </div>
  );
}
