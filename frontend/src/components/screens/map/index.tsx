"use client";

/**
 * Screen: Interactive Map (Wasel Egypt Production GIS Engine).
 * Fully powered by MapLibre GL JS with real Cairo transit layers:
 * OSM Streets, High-Res Esri Satellite with street labels overlay, Dark mode,
 * Real GTFS network polylines, 3000+ stations with clustering, live departures,
 * and high-accuracy device geolocation with auto-follow.
 */

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  Layers,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Sparkles,
  TrainFront,
  X,
} from "lucide-react";
import { LineBadge, PillButton } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { LINES } from "@/lib/transit-data";
import { EGYPT_STATIONS, type Station } from "@/data/egyptTransitData";
import type { NetworkShape } from "@/components/map/InteractiveMap";
import { fetchPublicRoutes, fetchRouteDetail, fetchVariantGeometry } from "@/api/network";
import { useEffect } from "react";

// Dynamic import with ssr: false is mandatory for MapLibre GL to prevent prerender window errors
const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center gap-3 bg-mist text-ash">
        <div className="gps-pulse size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand">
          <Navigation className="size-6 animate-pulse" />
        </div>
        <span className="mono-tag text-[11px] font-bold text-ink">
          جارٍ تشغيل محرك الخريطة التفاعلية…
        </span>
      </div>
    ),
  }
);

type ModeFilter = "all" | "metro" | "lrt" | "monorail" | "train" | "brt";

const MODE_FILTERS: { id: ModeFilter; labelAr: string; color?: string }[] = [
  { id: "all", labelAr: "جميع الوسائل" },
  { id: "metro", labelAr: "المترو", color: "#E11D48" },
  { id: "lrt", labelAr: "قطار LRT", color: "#0284C7" },
  { id: "monorail", labelAr: "المونوريل", color: "#7C3AED" },
  { id: "brt", labelAr: "حافلات BRT", color: "#D97706" },
  { id: "train", labelAr: "سكك حديد مصر", color: "#9333EA" },
];

export default function MapScreen({ navigate }: ScreenProps) {
  const [filter, setFilter] = useState<ModeFilter>("all");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [shapes, setShapes] = useState<NetworkShape[]>([]);
  const [loadingShapes, setLoadingShapes] = useState(false);

  // Fetch real route shapes from backend
  useEffect(() => {
    let cancelled = false;
    setLoadingShapes(true);
    (async () => {
      try {
        const res = await fetchPublicRoutes({ per_page: 15 });
        if (cancelled || !res?.routes) return;
        const fetchedShapes: NetworkShape[] = [];
        for (const r of res.routes.slice(0, 15)) {
          const detail = await fetchRouteDetail(r.id).catch(() => null);
          if (!detail || !Array.isArray(detail.variants)) continue;
          for (const v of detail.variants.slice(0, 1)) {
            const pts = await fetchVariantGeometry(v.id).catch(() => []);
            if (Array.isArray(pts) && pts.length >= 2) {
              const coords: Array<[number, number]> = pts
                .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
                .map((p: any) => [p.lng, p.lat]);
              if (coords.length >= 2) {
                const modeStr = r.transit_mode?.code || "bus";
                fetchedShapes.push({
                  coords,
                  color: r.transit_mode?.color || "#1D4ED8",
                  mode: modeStr,
                  name: r.short_name || r.long_name,
                });
              }
            }
          }
        }
        if (!cancelled) setShapes(fetchedShapes);
      } catch {
        /* fail gracefully */
      } finally {
        if (!cancelled) setLoadingShapes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  // Request actual device GPS position
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return (
    <div className="relative flex h-[calc(100dvh-64px)] w-full flex-col overflow-hidden bg-mist">
      {/* ----------------------------- Top Control Header ---------------------------- */}
      <div className="z-20 border-b border-bone bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <MapPin className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-head text-[16px] font-black text-ink">
                  خريطة شبكة النقل الذكية
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald/25 bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald">
                  <span className="size-1.5 rounded-full bg-emerald" />
                  مباشر • GIS
                </span>
              </div>
              <p className="text-[11px] text-ash">
                مترو القاهرة • LRT • المونوريل • حافلات BRT • سكك حديد مصر
              </p>
            </div>
          </div>

          {/* Mode Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {MODE_FILTERS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFilter(m.id)}
                className={`settle-fast inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-bold outline-none ${
                  filter === m.id
                    ? "border-ink bg-ink text-white shadow-xs"
                    : "border-bone bg-white text-carbon hover:bg-mist"
                }`}
              >
                {m.color && (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                )}
                {m.labelAr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ----------------------------- Main GIS Map Canvas --------------------------- */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <InteractiveMap
          center={[31.2357, 30.0444]} // Downtown Cairo (Tahrir / Ramses)
          zoom={12}
          darkMode={false}
          userLocation={userLoc}
          networkShapes={shapes}
          hideSchematic={shapes.length > 0}
          onStationSelect={(st) => setSelectedStation(st)}
          onPlanFrom={(st) => {
            navigate("planner", { from: st.name_ar, to: "" });
          }}
          onPlanTo={(st) => {
            navigate("planner", { from: "", to: st.name_ar });
          }}
          className="h-full w-full"
        />

        {/* Floating Quick Action Buttons */}
        <div className="absolute end-4 top-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={locateMe}
            aria-label="تحديد موقعي الآن"
            title="تحديد موقعي الآن"
            className="settle-fast flex size-10 cursor-pointer items-center justify-center rounded-2xl border border-bone bg-white/95 text-carbon shadow-md backdrop-blur-md hover:bg-mist hover:text-ink focus-visible:ring-2 focus-visible:ring-interactive/40"
          >
            <LocateFixed className={`size-4.5 ${locating ? "animate-spin text-interactive" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => navigate("planner")}
            aria-label="فتح مخطط الرحلات"
            title="فتح مخطط الرحلات"
            className="settle-fast flex size-10 cursor-pointer items-center justify-center rounded-2xl border border-bone bg-brand text-white shadow-md hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-interactive/40"
          >
            <Route className="size-4.5" />
          </button>
        </div>

        {/* Real Route Shapes Indicator */}
        {loadingShapes && (
          <div className="absolute bottom-4 start-4 z-20 flex items-center gap-2 rounded-2xl border border-bone bg-white/95 px-3.5 py-2 text-[11px] font-bold text-carbon shadow-md backdrop-blur-md">
            <RefreshCw className="size-3.5 animate-spin text-interactive" />
            <span>جارٍ تحميل مسارات الـ GTFS الحقيقية…</span>
          </div>
        )}
        {shapes.length > 0 && !loadingShapes && (
          <div className="absolute bottom-4 start-4 z-20 flex items-center gap-2 rounded-2xl border border-emerald/25 bg-white/95 px-3.5 py-1.5 text-[11px] font-bold text-emerald shadow-md backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald animate-pulse" />
            <span>{shapes.length} مسار حقيقي موثق على الخريطة</span>
          </div>
        )}

        {/* Floating Selected Station Card */}
        {selectedStation && (
          <div className="rise-in absolute bottom-4 end-4 start-4 z-30 mx-auto max-w-md rounded-3xl border border-bone bg-white/95 p-4 shadow-xl backdrop-blur-lg sm:start-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-interactive/10 text-interactive">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <h3 className="font-head text-[15px] font-black text-ink">
                    {selectedStation.name_ar}
                  </h3>
                  <p className="text-[11px] text-ash">
                    {selectedStation.name_en} • {selectedStation.zone_ar}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                className="cursor-pointer rounded-full p-1 text-ash hover:bg-mist hover:text-ink"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <PillButton
                variant="dark"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigate("planner", { from: selectedStation.name_ar, to: "" });
                }}
              >
                انطلق من هنا
              </PillButton>
              <PillButton
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigate("planner", { from: "", to: selectedStation.name_ar });
                }}
              >
                الوصول إلى هنا
              </PillButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
