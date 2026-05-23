"use client";

import { useEffect, useState } from "react";
import { formatDurationHMS } from "../utils/format";

/**
 * Live HH:MM:SS counter that ticks once per second.
 *
 * One internal interval is fine for now — every active session card mounts its
 * own timer. If we ever render hundreds simultaneously we should hoist the tick
 * into a single shared "now" provider to avoid wasted re-renders.
 */
export function SessionTimer({
  startedAtEpochMs,
  className = "",
}: {
  startedAtEpochMs: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, now - startedAtEpochMs);
  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {formatDurationHMS(elapsed)}
    </span>
  );
}
