"use client";

/**
 * Home — live line status radar.
 * Line identities are static reference; every STATUS comes from real
 * /service-alerts/active data. No invented headways or sparklines.
 */

import { useEffect, useState } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { LineBadge, StatusPill } from "@/components/kit";
import { LINE_STATUS_LABEL, type LineStatus } from "@/lib/transit-data";
import type { ScreenKey } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { RADAR_LINES } from "./data";
import { fetchActiveAlerts } from "@/api/network";

const SCREEN_BY_ID: Record<string, ScreenKey> = {
  "metro-l1": "metro",
  "metro-l2": "metro",
  "metro-l3": "metro",
  "metro-l4": "metro",
  lrt: "lrt",
  "monorail-east": "monorail",
  brt: "brt",
};

function statusTone(status: LineStatus): "ontime" | "delay" | "info" {
  if (status === "normal") return "ontime";
  if (status === "busy") return "delay";
  return "info";
}

/** Map backend alert severity/type → line status */
function alertToStatus(alert: any): LineStatus {
  const sev = (alert.severity ?? alert.level ?? "").toLowerCase();
  if (sev === "high" || sev === "severe") return "busy";
  if (sev === "medium" || sev === "moderate") return "busy";
  if (sev === "maintenance" || sev === "low") return "maintenance";
  return "normal";
}

export function LineRadar({
  onNavigate,
  className,
}: {
  onNavigate: (key: ScreenKey) => void;
  className?: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  /** Overlay real alert statuses on the static radar lines */
  const radarLines = RADAR_LINES.map((line) => {
    // Check if any active alert affects this line
    const affectingAlert = alerts.find((alert) => {
      const routeCode = (alert.route?.short_name ?? alert.route_code ?? "").toUpperCase();
      return routeCode === line.code || alert.line_code === line.code;
    });
    if (affectingAlert) {
      return { ...line, status: alertToStatus(affectingAlert) as LineStatus };
    }
    return line;
  });

  const loadAlerts = async () => {
    const data = await fetchActiveAlerts();
    setAlerts(data);
    setLoaded(true);
  };

  // Load on mount
  useEffect(() => {
    loadAlerts();
  }, []);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    loadAlerts().finally(() => {
      window.setTimeout(() => setRefreshing(false), 500);
    });
  };

  return (
    <div className={cn("card-flat overflow-hidden rounded-3xl", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-bone px-5 py-4">
        <div>
          <h2 className="font-head text-[17px] font-black text-ink">رادار حالة الشبكة</h2>
          <p className="mt-0.5 text-[11.5px] text-ash">
            الخطوط العاملة الآن في القاهرة الكبرى
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="تحديث حالة الشبكة"
          className="settle-fast inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-bone bg-white px-3 text-[11.5px] font-bold text-carbon outline-none hover:bg-mist focus-visible:ring-2 focus-visible:ring-interactive/40 disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          <span className="hidden sm:inline">
            {refreshing ? "جارٍ التحديث…" : "تحديث الحالة"}
          </span>
        </button>
      </div>

      <div className="divide-y divide-bone">
        {refreshing
          ? RADAR_LINES.map((line) => (
              <div key={line.id} className="flex items-center gap-3 px-5 py-3.5" aria-hidden="true">
                <div className="h-7 w-12 animate-pulse rounded-full bg-mercury" />
                <div className="h-4 flex-1 animate-pulse rounded-full bg-mercury" />
                <div className="h-6 w-14 animate-pulse rounded-full bg-mercury" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-mercury" />
              </div>
            ))
          : radarLines.map((line) => {
              const affecting = alerts.find((alert) => {
                const routeCode = (alert.route?.short_name ?? alert.route_code ?? "").toUpperCase();
                return routeCode === line.code || alert.line_code === line.code;
              });
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => onNavigate(SCREEN_BY_ID[line.id])}
                  className="settle-fast flex w-full items-center gap-3 px-5 py-3.5 text-start outline-none hover:bg-mist/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-interactive/40"
                >
                  <LineBadge code={line.code} color={line.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-carbon">
                      {line.nameAr}
                    </span>
                    <span className="block text-[10.5px] text-ash">
                      {affecting
                        ? affecting.header_text || affecting.title || "تنبيه نشط على الخط"
                        : loaded
                        ? "يعمل بدون تنبيهات معلنة"
                        : "جارٍ فحص الحالة…"}
                    </span>
                  </span>
                  <StatusPill tone={statusTone(line.status)} className="shrink-0">
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {LINE_STATUS_LABEL[line.status]}
                  </StatusPill>
                  <ChevronLeft className="hidden size-4 shrink-0 text-fog md:block" />
                </button>
              );
            })}
      </div>
    </div>
  );
}
