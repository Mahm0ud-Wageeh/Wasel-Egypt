"use client";

/**
 * Screen: Interactive Map v2.0 — Wasel Egypt Next-Gen GIS Engine.
 *
 * Fully powered by MapLibre GL JS with real national transit network:
 *   • 155+ stations from Metro L1, L2, L3, LRT, Monorail, BRT, ENR, HSR.
 *   • True curved geometries (not straight-line estimates).
 *   • Multi-layer rendering: ambient glow + casing + core stroke.
 *   • 3D Pitch View 52° toggle.
 *   • Floating Glassmorphic HUD with line-colored mode filters.
 *   • Interactive Station Inspection Sheet with:
 *       - Bilingual names, zone, interchange badges.
 *       - Official Ministry of Transport 2026 tariffs.
 *       - "Plan from here" & "Plan to here" direct CTA buttons.
 */

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  RefreshCw,
  Sparkles,
  X,
  ArrowRight,
  Info,
} from "lucide-react";
import type { ScreenProps } from "@/lib/navigation";
import {
  EGYPT_STATIONS,
  TRANSIT_LINES,
  LINE_GEOMETRIES,
  calculateMetroTariff,
  calculateLRTTariff,
  calculateMonorailTariff,
  calculateBRTTariff,
  type Station,
} from "@/data/egyptTransitData";
import type { NetworkShape, TransitModeFilter } from "@/components/map/InteractiveMap";
import { fetchPublicRoutes, fetchRouteDetail, fetchVariantGeometry } from "@/api/network";
import { cn } from "@/lib/utils";

// Dynamic import: mandatory ssr:false for MapLibre GL
const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center gap-4 bg-mist text-slateink">
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-bone">
          <Navigation className="size-6 animate-pulse text-interactive" />
        </div>
        <div className="text-center">
          <p className="font-bold text-ink text-sm">جارٍ تشغيل محرك الخريطة التفاعلية…</p>
          <p className="text-xs text-ash mt-0.5">شبكة النقل القومية • القاهرة الكبرى</p>
        </div>
      </div>
    ),
  }
);

// ──────────────── Fare helpers ────────────────
function getFareForLine(lineId: string, stationCount = 10) {
  if (lineId.startsWith("metro"))    return calculateMetroTariff(stationCount)
  if (lineId.startsWith("lrt"))      return calculateLRTTariff(stationCount)
  if (lineId.startsWith("monorail")) return calculateMonorailTariff(stationCount)
  if (lineId.startsWith("brt"))      return calculateBRTTariff(stationCount)
  return { fare: null, label_ar: "تسعيرة ENR — متغيرة", label_en: "ENR variable fare", status: "official" as const }
}

const MODE_FILTERS: Array<{ id: TransitModeFilter; label: string }> = [
  { id: "all", label: "كل الشبكة" },
  { id: "metro", label: "مترو الأنفاق" },
  { id: "lrt", label: "القطار الخفيف LRT" },
  { id: "monorail", label: "المونوريل" },
  { id: "train", label: "السكة الحديد" },
  { id: "brt", label: "حافلات BRT" },
];

// ──────────────── Map Screen ────────────────
export default function MapScreen({ navigate }: ScreenProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [activeMode, setActiveMode]           = useState<TransitModeFilter>("all");
  const [shapes, setShapes]                   = useState<NetworkShape[]>([]);
  const [loadingShapes, setLoadingShapes]     = useState(false);
  const [apiShapesFailed, setApiShapesFailed] = useState(false);

  // Build local geometry shapes from real LINE_GEOMETRIES (instant, offline-safe)
  const localShapes: NetworkShape[] = Object.entries(LINE_GEOMETRIES)
    .map(([lineId, coords]) => {
      const line = TRANSIT_LINES.find(l => l.id === lineId);
      return { coords, color: line?.color ?? "#64748b", mode: line?.mode ?? "bus", name: line?.name_ar };
    });

  // Try to fetch real GTFS shapes from backend in background (graceful fallback)
  useEffect(() => {
    let cancelled = false;
    setLoadingShapes(true);
    (async () => {
      try {
        const res = await fetchPublicRoutes({ per_page: 10 });
        if (cancelled || !res?.routes?.length) {
          if (!cancelled) setApiShapesFailed(true);
          return;
        }
        const fetched: NetworkShape[] = [];
        for (const r of res.routes.slice(0, 10)) {
          const detail = await fetchRouteDetail(r.id).catch(() => null);
          if (!detail?.variants?.length) continue;
          for (const v of detail.variants.slice(0, 1)) {
            const pts = await fetchVariantGeometry(v.id).catch(() => []);
            if (Array.isArray(pts) && pts.length >= 2) {
              const coords: Array<[number, number]> = pts
                .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
                .map((p: any) => [p.lng, p.lat]);
              if (coords.length >= 2) {
                fetched.push({ coords, color: r.transit_mode?.color ?? "#1D4ED8", mode: r.transit_mode?.code ?? "bus", name: r.short_name ?? r.long_name });
              }
            }
          }
        }
        if (!cancelled && fetched.length > 0) setShapes(fetched);
        else if (!cancelled) setApiShapesFailed(true);
      } catch {
        if (!cancelled) setApiShapesFailed(true);
      } finally {
        if (!cancelled) setLoadingShapes(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    (window as any).__waselSetSelectedStation = setSelectedStation;
    return () => {
      delete (window as any).__waselSetSelectedStation;
    };
  }, []);

  // Effective shapes: prefer live API shapes, fall back to local geometries
  const effectiveShapes = shapes.length > 0 ? shapes : localShapes;
  const displayedShapes = activeMode === "all"
    ? effectiveShapes
    : effectiveShapes.filter(s => s.mode === activeMode || (activeMode === "train" && s.mode === "rail"));

  const interchangeCount = EGYPT_STATIONS.filter(s => s.isInterchange).length;

  return (
    <div className="relative flex h-[calc(100dvh-64px)] w-full flex-col overflow-hidden bg-slate-50">

      {/* ═══════════════ Top Control Header with Mode Filters ═══════════════ */}
      <div className="z-20 border-b border-bone/80 bg-white/95 px-4 py-3 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          {/* Title + Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-interactive/10 text-interactive ring-1 ring-interactive/20">
              <MapPin className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-head text-[16px] font-black text-ink">خريطة شبكة النقل القومية</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald border border-emerald/20">
                  <span className="size-1.5 rounded-full bg-emerald animate-pulse" />
                  تغطية مباشرة
                </span>
              </div>
              <p className="text-[11.5px] text-slateink">
                {EGYPT_STATIONS.length} محطة رسمية • {interchangeCount} تحويلة تبادلية
              </p>
            </div>
          </div>

          {/* Mode Filters */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="تصفية وسيلة النقل">
            {MODE_FILTERS.map((m) => {
              const isActive = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMode(m.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "settle-fast flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold outline-none cursor-pointer",
                    isActive
                      ? "bg-ink text-white shadow-xs"
                      : "border border-bone bg-white text-carbon hover:bg-mist hover:border-cloud"
                  )}
                >
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ═══════════════ GIS Map Canvas ═══════════════ */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <InteractiveMap
          center={[31.2357, 30.0444]}
          zoom={12}
          darkMode={false}
          networkShapes={displayedShapes}
          hideSchematic={true}
          modeFilter={activeMode}
          onStationSelect={(st) => setSelectedStation(st)}
          onPlanFrom={(st) => navigate("planner", { from: st.name_ar, to: "" })}
          onPlanTo={(st) => navigate("planner", { from: "", to: st.name_ar })}
          className="h-full w-full"
        />

        {/* ──── Bottom Status Pill ──── */}
        <div className="absolute bottom-4 end-3 z-20 flex flex-col gap-2 pointer-events-none">
          {loadingShapes ? (
            <div className="flex items-center gap-2 rounded-2xl border border-bone bg-white/95 px-3.5 py-2 text-[11px] font-bold text-slateink shadow-lg backdrop-blur-xl pointer-events-auto">
              <RefreshCw className="size-3.5 animate-spin text-interactive" />
              <span>تحديث بيانات المسارات…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-bone bg-white/95 px-3.5 py-1.5 text-[11.5px] font-bold text-carbon shadow-lg backdrop-blur-xl pointer-events-auto">
              <span className="size-2 rounded-full bg-emerald" />
              <span>شبكة النقل جاهزة وموثقة</span>
            </div>
          )}
        </div>

        {/* ═══════════════ Station Inspection Bottom Sheet ═══════════════ */}
        {selectedStation && (
          <div
            id="station-inspection-sheet"
            className="rise-in absolute bottom-4 end-3 start-3 z-30 mx-auto max-w-[460px] overflow-hidden rounded-3xl border border-bone bg-white/98 shadow-2xl shadow-black/15 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-bone/60">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{
                    background: selectedStation.isInterchange
                      ? "linear-gradient(135deg, #7c3aed, #1d4ed8)"
                      : "linear-gradient(135deg, #1d4ed8, #0284c7)"
                  }}
                >
                  {selectedStation.isInterchange ? <Sparkles className="size-5" /> : <MapPin className="size-5" />}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-head text-[16px] font-black text-ink leading-tight">
                      {selectedStation.name_ar}
                    </h3>
                    {selectedStation.isInterchange && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-interactive/10 px-2 py-0.5 text-[9.5px] font-bold text-interactive border border-interactive/20">
                        محطة تبادلية
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-slateink mt-0.5">
                    {selectedStation.name_en} • {selectedStation.zone_ar}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                aria-label="إغلاق بيانات المحطة"
                className="cursor-pointer rounded-full p-1.5 text-ash hover:bg-mist hover:text-ink transition-colors shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Lines & Modes */}
            <div className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {selectedStation.modes.map((mode) => {
                  const lineColor = {
                    metro: "#1D4ED8", lrt: "#0284C7", monorail: "#7C3AED",
                    brt: "#D97706", train: "#9333EA", bus: "#16A34A"
                  }[mode] ?? "#64748b";
                  const modeLabel = {
                    metro: "مترو الأنفاق", lrt: "القطار الخفيف LRT", monorail: "المونوريل",
                    brt: "حافلات BRT", train: "السكة الحديد", bus: "حافلات"
                  }[mode] ?? mode;
                  return (
                    <span
                      key={mode}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border"
                      style={{
                        color: lineColor,
                        backgroundColor: lineColor + "14",
                        borderColor: lineColor + "33",
                      }}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: lineColor }} />
                      {modeLabel}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Official Fare Info */}
            {selectedStation.lines.length > 0 && (
              <div className="mx-4 mb-3 rounded-2xl border border-bone bg-mist/60 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="size-3.5 text-ash" />
                  <span className="text-[10.5px] font-bold text-slateink">التسعيرة الرسمية المقررة</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {selectedStation.lines.slice(0, 3).map((lineId) => {
                    const tariff = getFareForLine(lineId);
                    if (!tariff.fare) return null;
                    const line = TRANSIT_LINES.find((l) => l.id === lineId);
                    return (
                      <div key={lineId} className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: line?.color ?? "#64748b" }}
                        />
                        <span className="text-[11.5px] text-carbon font-medium">
                          {line?.code ?? lineId.toUpperCase()}:
                        </span>
                        <span className="text-[12px] font-black text-ink">
                          {tariff.fare} ج.م
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 px-4 pb-4">
              <button
                type="button"
                id="station-plan-from"
                onClick={() => { navigate("planner", { from: selectedStation.name_ar, to: "" }); setSelectedStation(null); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm hover:bg-carbon transition-all cursor-pointer"
              >
                <ArrowRight className="size-3.5 rotate-180" />
                انطلق من هنا
              </button>
              <button
                type="button"
                id="station-plan-to"
                onClick={() => { navigate("planner", { from: "", to: selectedStation.name_ar }); setSelectedStation(null); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-bone bg-white px-4 py-2.5 text-[12.5px] font-bold text-carbon hover:bg-mist transition-all cursor-pointer"
              >
                الوصول إلى هنا
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
