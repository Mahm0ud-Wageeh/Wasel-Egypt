"use client";

/**
 * Home — next departures mini-board.
 * Glass card with 4 rows ticking every second (interval cleaned up on unmount).
 */

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { LineBadge } from "@/components/kit";
import { DEPARTURES } from "./data";
import { cn } from "@/lib/utils";

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DeparturesBoard({ className }: { className?: string }) {
  const [seconds, setSeconds] = useState<number[]>(() =>
    DEPARTURES.map((row) => row.offsetSec)
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((prev) =>
        prev.map((value, i) =>
          value <= 1 ? DEPARTURES[i].headwaySec : value - 1
        )
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={cn("glass overflow-hidden rounded-3xl", className)}>
      <div className="border-b border-bone px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="mono-tag">DEPARTURES — LIVE</p>
          <Clock className="size-3.5 text-ash" />
        </div>
        <h2 className="mt-1.5 font-head text-[17px] font-black text-ink">أقرب المغادرات</h2>
        <p className="mt-0.5 text-[11.5px] text-ash">
          من محطة السادات — الخط الأول والثاني
        </p>
      </div>

      <div className="divide-y divide-bone">
        {DEPARTURES.map((row, index) => (
          <div key={row.id} className="flex items-center gap-3 px-5 py-3">
            <LineBadge code={row.code} color={row.color} size="sm" />
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-carbon">
              {row.dest}
            </p>
            {index === 0 ? (
              <span className="shrink-0 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald">
                القادم
              </span>
            ) : null}
            <span
              className={cn(
                "num shrink-0 text-[15px] font-extrabold tabular-nums",
                index === 0 ? "text-emerald" : "text-ink"
              )}
            >
              {formatCountdown(seconds[index])}
            </span>
          </div>
        ))}
      </div>

      <p className="border-t border-bone bg-white/60 px-5 py-2.5 text-[10.5px] text-ash">
        المواعيد تقديرية وفق تداول الشبكة الفعلي
      </p>
    </div>
  );
}
