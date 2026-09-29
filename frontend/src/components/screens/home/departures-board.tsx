"use client";

/**
 * Home — next departures mini-board (real data only).
 * Picks the first public stop that actually has departures and renders the
 * backend rows. Ticks/refetches every 60s. Hidden entirely when the backend
 * has no departures to show — no invented times, no fake countdowns.
 */

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { LineBadge } from "@/components/kit";
import { fetchStops, fetchStopDepartures, getStopDisplayName, type ApiDeparture } from "@/api/stops";
import { cn } from "@/lib/utils";

export function DeparturesBoard({ className }: { className?: string }) {
  const [stopName, setStopName] = useState<string | null>(null);
  const [rows, setRows] = useState<ApiDeparture[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const stopsRes = await fetchStops({ limit: 10 });
        const stops = Array.isArray(stopsRes?.data) ? stopsRes.data : [];
        for (const s of stops) {
          try {
            const dep = await fetchStopDepartures(s.id, 4);
            const list: ApiDeparture[] = Array.isArray(dep?.departures)
              ? dep.departures
              : Array.isArray(dep)
              ? dep
              : [];
            if (list.length > 0) {
              if (cancelled) return;
              setStopName(getStopDisplayName(s));
              setRows(list.slice(0, 4));
              return;
            }
          } catch {
            /* try next stop */
          }
        }
        if (!cancelled) setRows([]);
      } catch {
        if (!cancelled) setRows(null);
      }
    };

    load();
    const iv = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, []);

  // Loading → skeleton shimmer; failed/empty → hide the board completely.
  if (rows === null) return null;
  if (rows.length === 0) return null;

  return (
    <div className={cn("glass overflow-hidden rounded-3xl", className)}>
      <div className="border-b border-bone px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="mono-tag">DEPARTURES — LIVE</p>
          <Clock className="size-3.5 text-ash" />
        </div>
        <h2 className="mt-1.5 font-head text-[17px] font-black text-ink">أقرب المغادرات</h2>
        <p className="mt-0.5 text-[11.5px] text-ash">من {stopName ?? "محطة الشبكة"}</p>
      </div>

      <div className="divide-y divide-bone">
        {rows.map((row, index) => (
          <div key={`${row.route_short_name}-${row.headsign}-${index}`} className="flex items-center gap-3 px-5 py-3">
            <LineBadge code={row.route_short_name ?? "—"} color={row.color ?? "#1D4ED8"} size="sm" />
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-carbon">
              {row.headsign || row.route_long_name || "رحلة"}
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
              {row.minutes_until != null ? (
                <>{row.minutes_until <= 1 ? "الآن" : <span dir="ltr">{row.minutes_until} د</span>}</>
              ) : (
                row.estimated_departure || row.scheduled_departure || "—"
              )}
            </span>
          </div>
        ))}
      </div>

      <p className="border-t border-bone bg-white/60 px-5 py-2.5 text-[10.5px] text-ash">
        مواعيد حية من جداول التشغيل بالخادم
      </p>
    </div>
  );
}
