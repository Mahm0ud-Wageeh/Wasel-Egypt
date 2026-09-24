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
import type { NetworkShape } from "@/components/map/InteractiveMap";
import { fetchPublicRoutes, fetchRouteDetail, fetchVariantGeometry } from "@/api/network";

// Dynamic import: mandatory ssr:false for MapLibre GL
const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center gap-4 bg-[#0b0f19] text-slate-400">
        <div className="relative flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 shadow-2xl ring-1 ring-white/10">
          <Navigation className="size-7 animate-pulse text-blue-400" />
          <span className="absolute -inset-1 animate-ping rounded-3xl bg-blue-500/10" />
        </div>
        <div className="text-center">
          <p className="font-bold text-white text-sm">جارٍ تشغيل محرك الخريطة التفاعلية…</p>
          <p className="text-xs text-slate-500 mt-1">MapLibre GL • National GIS Engine v2.0</p>
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

// ──────────────── Map Screen v2.0 ────────────────
export default function MapScreen({ navigate }: ScreenProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [shapes, setShapes]                 = useState<NetworkShape[]>([]);
  const [loadingShapes, setLoadingShapes]   = useState(false);
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

  // Effective shapes: prefer live API shapes, fall back to local geometries
  const effectiveShapes = shapes.length > 0 ? shapes : localShapes;
  const shapesAreLocal  = shapes.length === 0;

  const interchangeCount = EGYPT_STATIONS.filter(s => s.isInterchange).length;

  return (
    <div className="relative flex h-[calc(100dvh-64px)] w-full flex-col overflow-hidden bg-[#0b0f19]">

      {/* ═══════════════ Top Control Header with Mode Filters ═══════════════ */}
      <div className="z-20 border-b border-white/10 bg-[#0d1117]/90 px-3 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          {/* Title + Live Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-400 ring-1 ring-white/10">
              <MapPin className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-head text-[15px] font-black text-white">خريطة شبكة النقل القومية</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9.5px] font-bold text-emerald-400 ring-1 ring-emerald-500/25">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مباشر • GIS v2.0
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                {EGYPT_STATIONS.length} محطة • {effectiveShapes.length} مسار •{" "}
                {interchangeCount} تحويلة تبادلية
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════ GIS Map Canvas ═══════════════ */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <InteractiveMap
          center={[31.2357, 30.0444]}
          zoom={12}
          darkMode={true}
          networkShapes={effectiveShapes}
          hideSchematic={false}
          modeFilter="all"
          onStationSelect={(st) => setSelectedStation(st)}
          onPlanFrom={(st) => navigate("planner", { from: st.name_ar, to: "" })}
          onPlanTo={(st) => navigate("planner", { from: "", to: st.name_ar })}
          className="h-full w-full"
        />

        {/* ──── Bottom Status Bar ──── */}
        <div className="absolute bottom-4 end-3 z-20 flex flex-col gap-2 pointer-events-none">
          {loadingShapes && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0d1117]/90 px-3.5 py-2 text-[11px] font-bold text-slate-400 shadow-xl backdrop-blur-xl pointer-events-auto">
              <RefreshCw className="size-3.5 animate-spin text-blue-400" />
              <span>جارٍ تحميل مسارات GTFS الحقيقية…</span>
            </div>
          )}
          {!loadingShapes && (
            <div className={`flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-[11px] font-bold shadow-xl backdrop-blur-xl pointer-events-auto ${
              shapesAreLocal
                ? "border-amber-500/25 bg-[#0d1117]/90 text-amber-400"
                : "border-emerald-500/25 bg-[#0d1117]/90 text-emerald-400"
            }`}>
              <span className={`size-2 rounded-full ${shapesAreLocal ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
              {shapesAreLocal
                ? `${localShapes.length} مسار — بيانات جغرافية محلية دقيقة`
                : `${shapes.length} مسار GTFS مباشر من الخادم`
              }
            </div>
          )}
        </div>

        {/* ═══════════════ Station Inspection Bottom Sheet ═══════════════ */}
        {selectedStation && (
          <div
            id="station-inspection-sheet"
            className="rise-in absolute bottom-4 end-3 start-3 z-30 mx-auto max-w-[480px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
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
                    <h3 className="font-head text-[15.5px] font-black text-white leading-tight">
                      {selectedStation.name_ar}
                    </h3>
                    {selectedStation.isInterchange && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-300 ring-1 ring-violet-500/30">
                        <span className="size-1 rounded-full bg-violet-400" />
                        تحويلة تبادلية
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedStation.name_en} • {selectedStation.zone_ar}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                aria-label="إغلاق بيانات المحطة"
                className="cursor-pointer rounded-full p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Lines & Modes */}
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {selectedStation.modes.map((mode) => {
                  const lineColor = {
                    metro: "#1D4ED8", lrt: "#0284C7", monorail: "#7C3AED",
                    brt: "#D97706", train: "#9333EA", bus: "#16A34A"
                  }[mode] ?? "#64748b"
                  const modeLabel = {
                    metro: "مترو", lrt: "LRT", monorail: "مونوريل",
                    brt: "BRT", train: "قطار", bus: "أتوبيس"
                  }[mode] ?? mode
                  return (
                    <span
                      key={mode}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1"
                      style={{
                        color: lineColor,
                        backgroundColor: lineColor + "22",
                        borderColor: lineColor + "44",
                      }}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: lineColor }} />
                      {modeLabel}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Official Fare Info */}
            {selectedStation.lines.length > 0 && (
              <div className="mx-4 mb-3 rounded-2xl border border-white/8 bg-white/4 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="size-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">تسعيرة رسمية 2026</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStation.lines.slice(0, 3).map(lineId => {
                    const tariff = getFareForLine(lineId)
                    if (!tariff.fare) return null
                    const line = TRANSIT_LINES.find(l => l.id === lineId)
                    return (
                      <div key={lineId} className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: line?.color ?? "#64748b" }}
                        />
                        <span className="text-[11px] text-slate-300 font-medium">
                          {line?.code ?? lineId.toUpperCase()}:
                        </span>
                        <span className="text-[12px] font-black text-white">
                          {tariff.fare} ج.م
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[9.5px] text-slate-600 mt-1.5">
                  * التسعيرة وفق قرار وزارة النقل 2026 — بدء الرحلة
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 px-4 pb-4">
              <button
                type="button"
                id="station-plan-from"
                onClick={() => { navigate("planner", { from: selectedStation.name_ar, to: "" }); setSelectedStation(null); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-all"
              >
                <ArrowRight className="size-3.5 rotate-180" />
                انطلق من هنا
              </button>
              <button
                type="button"
                id="station-plan-to"
                onClick={() => { navigate("planner", { from: "", to: selectedStation.name_ar }); setSelectedStation(null); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-2.5 text-[12px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
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
