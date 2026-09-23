"use client";

/**
 * Wasel Egypt — Multimodal Journey Planner (spec 03).
 * Connected directly to Laravel GTFS routing engine (/api/v1/journeys/search).
 * Ranked itineraries with explainable scoring, official Oct-2024 Metro fare matrix,
 * StationSelectorModal for 3000+ real stations, and live InteractiveMap route preview.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { formatEGP } from "@/lib/transit-data";
import {
  PillButton,
  LineBadge,
  FilterChip,
  ModeIcon,
  ScreenShell,
} from "@/components/kit";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  ArrowUpDown,
  Search,
  MoveLeft,
  Repeat,
  Footprints,
  ChevronDown,
  Ticket,
  Timer,
  CircleAlert,
  Route as RouteIcon,
  Navigation,
  RefreshCw,
  X,
  Share2,
  Bookmark,
  Check,
} from "lucide-react";
import type { ScreenProps } from "@/lib/navigation";
import StationSelectorModal from "@/components/search/StationSelectorModal";
import { planJourney, resolveCoordinates, type JourneyPlan, type JourneyLeg } from "@/api/journeys";
import { EGYPT_STATIONS } from "@/data/egyptTransitData";

const InteractiveMap = dynamic(() => import("@/components/map/InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center bg-mist text-ash">
      <span className="mono-tag text-[11px]">جارٍ تحميل خريطة المسار…</span>
    </div>
  ),
});

export default function PlannerScreen({ navigate, params }: ScreenProps) {
  // Query inputs (with defaults or URL params)
  const [from, setFrom] = useState(params.from || "الشهداء");
  const [to, setTo] = useState(params.to || "جامعة القاهرة");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [timeChoice, setTimeChoice] = useState<string>("now");

  // Station selector modal state
  const [modalTarget, setModalTarget] = useState<"from" | "to" | null>(null);

  // Search execution & results
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<JourneyPlan[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<JourneyPlan | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "details">("list");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Run search
  const doSearch = useCallback(async (originStr: string, destStr: string) => {
    if (!originStr.trim() || !destStr.trim()) return;
    setLoading(true);
    setSearchError(null);
    setSearched(true);
    setViewMode("list");

    try {
      const results = await planJourney({
        origin: originStr.trim(),
        destination: destStr.trim(),
      });
      setRoutes(results);
      if (results.length > 0) {
        setSelectedRoute(results[0]);
      }
    } catch (err: any) {
      if (err?.status === 404 || err?.message === "NO_JOURNEY_OPTIONS") {
        setSearchError("لم نعثر على رحلة مباشرة بين هذين الموقعين حالياً في الشبكة.");
      } else if (err?.status === 422 || err?.message === "UNRESOLVABLE_PLACES") {
        setSearchError("يرجى اختيار محطة معروفة من القائمة لتحديد المسار بدقة.");
      } else {
        setSearchError("تعذر الاتصال بمركز تخطيط الرحلات. يرجى المحاولة مرة أخرى.");
      }
      setRoutes([]);
      setSelectedRoute(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run search on initial mount or when params change
  useEffect(() => {
    if (params.from && params.to) {
      setFrom(params.from);
      setTo(params.to);
      doSearch(params.from, params.to);
    } else {
      doSearch(from, to);
    }
  }, []);

  // Swap origin and destination
  const swapPoints = () => {
    const tmp = from;
    setFrom(to);
    setTo(tmp);
    doSearch(to, tmp);
  };

  // Start active journey
  const handleStartActiveJourney = (routePlan: JourneyPlan) => {
    try {
      localStorage.setItem("wasel.activeJourney.v1", JSON.stringify(routePlan));
      localStorage.setItem("wasel.lastSearch.v1", JSON.stringify({ from, to }));
    } catch {
      /* ignore */
    }
    navigate("journey-active", { from, to, route: String(routes.indexOf(routePlan)) });
  };

  // Save trip locally
  const handleSaveTrip = (routePlan: JourneyPlan) => {
    try {
      const saved = JSON.parse(localStorage.getItem("wasel.saved_trips") || "[]");
      saved.push({
        id: Date.now(),
        from,
        to,
        duration: routePlan.duration,
        fare: routePlan.fare,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem("wasel.saved_trips", JSON.stringify(saved));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      /* ignore */
    }
  };

  // Prepare map route points from waypoints
  const mapRoutePoints = useMemo(() => {
    if (!selectedRoute?.legs) return [];
    const pts: { lat: number; lng: number }[] = [];
    for (const leg of selectedRoute.legs) {
      if (Array.isArray(leg.waypoints) && leg.waypoints.length > 0) {
        pts.push(...leg.waypoints);
      }
    }
    return pts;
  }, [selectedRoute]);

  return (
    <div className="min-h-screen bg-mist pb-24">
      {/* ----------------------------- Search Header Bar ---------------------------- */}
      <div className="border-b border-bone bg-white px-4 py-6 shadow-xs md:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <RouteIcon className="size-4" />
              </span>
              <h1 className="font-head text-[18px] font-black text-ink">
                مخطط الرحلات متعدد الوسائط
              </h1>
            </div>
            <span className="mono-tag text-[10px] text-emerald bg-emerald/10 border-emerald/25 px-2.5 py-1">
              مصفوفة أسعار المترو الرسمية (أكتوبر 2024)
            </span>
          </div>

          {/* Search Inputs Card */}
          <div className="rounded-3xl border border-bone bg-mist p-3.5 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
              {/* Origin button/input */}
              <div
                onClick={() => setModalTarget("from")}
                className="flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl border border-bone bg-white px-4 shadow-xs hover:border-interactive/40"
              >
                <MapPin className="size-4 shrink-0 text-interactive" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-ash">نقطة الانطلاق</p>
                  <p className="truncate text-[13px] font-bold text-ink">{from || "اختر محطة…"}</p>
                </div>
              </div>

              {/* Swap Button */}
              <button
                type="button"
                onClick={swapPoints}
                aria-label="تبديل نقطتي الانطلاق والوصول"
                className="settle-fast mx-auto flex size-10 cursor-pointer items-center justify-center rounded-full border border-bone bg-white text-carbon hover:bg-mist sm:mx-0"
              >
                <ArrowUpDown className="size-4" />
              </button>

              {/* Destination button/input */}
              <div
                onClick={() => setModalTarget("to")}
                className="flex h-12 cursor-pointer items-center gap-2.5 rounded-2xl border border-bone bg-white px-4 shadow-xs hover:border-brand/40"
              >
                <MapPin className="size-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-ash">الوجهة</p>
                  <p className="truncate text-[13px] font-bold text-ink">{to || "اختر محطة…"}</p>
                </div>
              </div>

              {/* Search Submit Button */}
              <PillButton
                variant="brand"
                size="lg"
                onClick={() => doSearch(from, to)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                <span>بحث في الشبكة</span>
              </PillButton>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------- Main Results Area ---------------------------- */}
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="gps-pulse size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand">
              <RefreshCw className="size-6 animate-spin text-brand" />
            </div>
            <p className="text-[13px] font-bold text-carbon">
              جارٍ فحص شبكة القاهرة الكبرى وحساب أرخص وأسرع المسارات…
            </p>
          </div>
        ) : searchError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <CircleAlert className="mx-auto size-8 text-red-600 mb-2" />
            <h3 className="font-head text-[15px] font-bold">{searchError}</h3>
            <p className="mt-1 text-[12px] text-red-600">
              تأكد من اختيار محطة بداية ووصول متصلتين بشبكة المترو أو النقل المشترك.
            </p>
            <PillButton
              variant="outline"
              size="sm"
              onClick={() => doSearch(from, to)}
              className="mt-4 bg-white"
            >
              إعادة المحاولة
            </PillButton>
          </div>
        ) : routes.length === 0 ? (
          <div className="rounded-3xl border border-bone bg-white p-12 text-center text-ash">
            <RouteIcon className="mx-auto size-12 text-ash/40 mb-3" />
            <h3 className="font-head text-[15px] font-bold text-ink">حدد وجهتك لبدء التخطيط</h3>
            <p className="mt-1 text-[12.5px]">اختر نقطة الانطلاق ومحطة الوصول لاستعراض أفضل مسارات النقل</p>
          </div>
        ) : viewMode === "details" && selectedRoute ? (
          /* ======================= DETAILED ITINERARY VIEW ======================= */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="settle-fast inline-flex items-center gap-1.5 rounded-full border border-bone bg-white px-3.5 py-1.5 text-[12px] font-bold text-carbon hover:bg-mist"
              >
                <MoveLeft className="size-4" />
                <span>العودة لقائمة الخيارات</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveTrip(selectedRoute)}
                  className="settle-fast inline-flex items-center gap-1.5 rounded-full border border-bone bg-white px-3.5 py-1.5 text-[12px] font-bold text-carbon hover:bg-mist"
                >
                  {savedSuccess ? <Check className="size-3.5 text-emerald" /> : <Bookmark className="size-3.5" />}
                  <span>{savedSuccess ? "تم الحفظ!" : "حفظ الرحلة"}</span>
                </button>
              </div>
            </div>

            {/* Route Map Preview */}
            <div className="overflow-hidden rounded-3xl border border-bone bg-white shadow-md">
              <div className="h-64 sm:h-72 w-full">
                <InteractiveMap
                  center={[31.2357, 30.0444]}
                  zoom={12}
                  activeRoutePoints={mapRoutePoints}
                  className="h-full w-full"
                />
              </div>

              {/* Itinerary Summary Header */}
              <div className="border-t border-bone p-5 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="mono-tag text-[10px] text-brand">خيار رحلة موثق</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-head text-[26px] font-black text-ink">
                        {selectedRoute.duration}
                      </span>
                      <span className="text-[13px] font-bold text-ash">دقيقة</span>
                      <span className="text-ash">•</span>
                      <span className="text-[13px] text-ash">
                        {selectedRoute.departure} ← {selectedRoute.arrival}
                      </span>
                    </div>
                  </div>

                  <div className="text-start sm:text-end">
                    <div className="font-head text-[20px] font-black text-ink">
                      {selectedRoute.fare > 0 ? `${selectedRoute.fare} ج.م` : "أجرة مجانية/غير محددة"}
                    </div>
                    <span className="inline-flex rounded-full bg-emerald/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald border border-emerald/25">
                      {selectedRoute.fareStatus === "official" ? "تسعيرة المترو الرسمية" : "تقديري"}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <PillButton
                    variant="brand"
                    size="lg"
                    className="w-full text-[14px]"
                    onClick={() => handleStartActiveJourney(selectedRoute)}
                  >
                    <Navigation className="size-4.5" />
                    <span>ابدأ الرحلة الآن (الملاحة الحية)</span>
                  </PillButton>
                </div>
              </div>
            </div>

            {/* Vertical Step-by-Step Spine */}
            <div className="rounded-3xl border border-bone bg-white p-5 shadow-xs">
              <h3 className="font-head text-[14px] font-bold text-ink mb-4">
                خطوات الرحلة خطوة بخطوة
              </h3>
              <div className="space-y-4">
                {selectedRoute.legs.map((leg, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-mist border border-bone text-carbon">
                      {leg.type === "walking" ? (
                        <Footprints className="size-4 text-ash" />
                      ) : (
                        <ModeIcon mode={leg.type === "transit" ? "metro" : (leg.type as any)} className="size-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-ink">
                          {leg.desc_ar || `${leg.line_ar || leg.line} من ${leg.from_ar} إلى ${leg.to_ar}`}
                        </span>
                        <span className="mono-tag text-[10px]">
                          {leg.duration} دقيقة
                        </span>
                      </div>
                      <p className="text-[11.5px] text-ash mt-0.5">
                        {leg.from_ar} ← {leg.to_ar}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ======================= RESULTS LIST VIEW ======================= */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[13px] font-bold text-carbon">
                عثرنا على <span className="text-ink font-black">{routes.length}</span> مسارات متاحة
              </p>
              <span className="text-[11px] text-ash">مرتبة بحسب أفضلية الوقت والأجرة</span>
            </div>

            {routes.map((plan, idx) => (
              <div
                key={plan.id}
                onClick={() => {
                  setSelectedRoute(plan);
                  setViewMode("details");
                }}
                className={cn(
                  "settle-fast group cursor-pointer rounded-3xl border border-bone bg-white p-5 shadow-xs transition-all hover:border-interactive/40 hover:shadow-md",
                  idx === 0 && "ring-1 ring-brand/20 bg-gradient-to-l from-brand/[0.02] to-white"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-head text-[24px] font-black text-ink">
                        {plan.duration}
                      </span>
                      <span className="text-[12px] font-bold text-ash">دقيقة</span>
                    </div>
                    {idx === 0 && (
                      <span className="rounded-full bg-emerald/10 border border-emerald/25 px-2.5 py-0.5 text-[10px] font-bold text-emerald">
                        أفضل مسار موصى به
                      </span>
                    )}
                  </div>

                  <div className="text-end">
                    <div className="font-head text-[16px] font-black text-ink">
                      {plan.fare > 0 ? `${plan.fare} ج.م` : "—"}
                    </div>
                    <span className="text-[10px] text-ash">
                      {plan.fareStatus === "official" ? "أجرة رسمية" : "تقديري"}
                    </span>
                  </div>
                </div>

                {/* Legs badges chain */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {plan.legs.map((leg, lIdx) => (
                    <div key={lIdx} className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-bone bg-mist px-2.5 py-1 text-[11px] font-bold text-carbon">
                        {leg.type === "walking" ? (
                          <>
                            <Footprints className="size-3 text-ash" />
                            <span>مشي {leg.duration} د</span>
                          </>
                        ) : (
                          <>
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: leg.color || "#E11D48" }}
                            />
                            <span>{leg.line_ar || leg.line}</span>
                          </>
                        )}
                      </span>
                      {lIdx < plan.legs.length - 1 && (
                        <span className="text-ash text-[11px]">←</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer details & CTA */}
                <div className="mt-4 flex items-center justify-between border-t border-bone pt-3 text-[11.5px] text-ash">
                  <div className="flex items-center gap-3">
                    <span>تحويلات: <strong className="text-ink">{plan.changes}</strong></span>
                    <span>•</span>
                    <span>مشي: <strong className="text-ink">{plan.walking} دقيقة</strong></span>
                  </div>
                  <span className="font-bold text-interactive group-hover:underline flex items-center gap-1">
                    <span>استعراض المسار والخريطة</span>
                    <MoveLeft className="size-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------- Station Selector Autocomplete Modal ------------------- */}
      {modalTarget && (
        <StationSelectorModal
          isOpen={true}
          onClose={() => setModalTarget(null)}
          onSelect={(selection) => {
            if (modalTarget === "from") {
              setFrom(selection.name);
              doSearch(selection.name, to);
            } else {
              setTo(selection.name);
              doSearch(from, selection.name);
            }
            setModalTarget(null);
          }}
          title={modalTarget === "from" ? "اختر نقطة الانطلاق" : "اختر محطة الوصول"}
          lang="ar"
          t={(ar) => ar}
          initialQuery={modalTarget === "from" ? from : to}
        />
      )}
    </div>
  );
}
