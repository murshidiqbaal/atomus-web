"use client";

import { useEffect, useRef, useState } from "react";
import { formatDurationHMS, MAX_SESSION_MS } from "../utils/format";

/**
 * Live HH:MM:SS counter that ticks once per second up to the 4-hour max session limit.
 */
export function SessionTimer({
  startedAtEpochMs,
  className = "",
  onExpire,
}: {
  startedAtEpochMs: number;
  className?: string;
  onExpire?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const expiredFired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rawElapsed = Math.max(0, now - startedAtEpochMs);
  const elapsed = Math.min(MAX_SESSION_MS, rawElapsed);
  const isMax = rawElapsed >= MAX_SESSION_MS;

  useEffect(() => {
    if (isMax && !expiredFired.current && onExpire) {
      expiredFired.current = true;
      onExpire();
    }
  }, [isMax, onExpire]);

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {formatDurationHMS(elapsed)}
      {isMax && <span className="ml-1 text-[10px] uppercase font-bold text-amber-600">(Max 4h)</span>}
    </span>
  );
}

