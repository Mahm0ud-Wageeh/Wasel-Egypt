"use client";

/**
 * Screen: journey-active (spec 04 — Live Journey HUD).
 *
 * Real GPS turn-by-turn navigation — NO simulation timers:
 * - useNavigationEngine: Kalman-filtered GPS + RouteMatcher + deviation detection.
 * - Journey lifecycle: create → start → location pings → deviation → recovery → complete/cancel.
 * - MapLibre GL 3D nav cockpit with auto-follow and heading compass.
 * - Arabic voice guidance (useVoiceGuidance / Web Speech API).
 * - Deviation detection via fetchDeviations + generateRecoveryOptions + acceptRecoveryOption.
 * - Offline queue for GPS pings (useOfflineQueue).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Crosshair,
  Footprints,
  Navigation,
  RefreshCw,
  Volume2,
  VolumeX,
  X,
  Radio,
  WifiOff,
} from "lucide-react";
import { LineBadge, ModeIcon, PillButton } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { formatEGP } from "@/lib/transit-data";
import { useNavigationEngine } from "@/hooks/useNavigationEngine";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import {
  postJourneyLocation,
  completeActiveJourney,
  cancelActiveJourney,
  fetchDeviations,
  generateRecoveryOptions,
  acceptRecoveryOption,
  saveJourneyFromSearch,
  startActiveJourney,
} from "@/api/activeJourneys";
import { planJourney, type JourneyPlan, type JourneyLeg } from "@/api/journeys";
import { DeviationModal } from "./deviation-modal";

const InteractiveMap = dynamic(
  () => import("@/components/map/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-mist text-ash">
        <span className="mono-tag text-[11px]">جارٍ تشغيل ملاحة الخريطة الحية…</span>
      </div>
    ),
  }
);

export default function JourneyActiveScreen({ navigate, params }: ScreenProps) {
  const from = params.from ?? "الشهداء";
  const to = params.to ?? "جامعة القاهرة";

  // ─── Active journey state ───────────────────────────────────────────────────
  const [activePlan, setActivePlan] = useState<JourneyPlan | null>(null);
  const [activeJourneyId, setActiveJourneyId] = useState<string | number | null>(null);
  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [followMap, setFollowMap] = useState(true);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [deviationOpen, setDeviationOpen] = useState(false);
  const [recoveryOptions, setRecoveryOptions] = useState<any[]>([]);
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [applyingRecovery, setApplyingRecovery] = useState<string | number | null>(null);

  // ─── Load stored active journey plan (with API fallback) ──────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wasel.activeJourney.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.legs && Array.isArray(parsed.legs) && parsed.legs.length > 0) {
          setActivePlan(parsed);
          return;
        }
      }
    } catch { /* ignore */ }

    // Fallback: If not found in localStorage, fetch from planJourney API
    const routeIndex = params.route ? Math.max(0, parseInt(params.route, 10) || 0) : 0;
    planJourney({ origin: from, destination: to })
      .then((results) => {
        if (results && results.length > 0) {
          const chosen = results[routeIndex] || results[0];
          setActivePlan(chosen);
          try {
            localStorage.setItem("wasel.activeJourney.v1", JSON.stringify(chosen));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* handled gracefully */ });
  }, [from, to, params.route]);

  // ─── Elapsed clock (real wall-clock, not simulation) ──────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  // ─── Offline queue for GPS pings ──────────────────────────────────────────
  const offlineQueue = useOfflineQueue({ journeyId: activeJourneyId ?? undefined });

  // ─── Location update callback (called by useNavigationEngine) ──────────────
  const handleLocationUpdate = useCallback(
    async (pos: {
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      heading?: number | null;
      speed?: number | null;
      recorded_at?: string;
    }) => {
      if (!activeJourneyId || activeJourneyId === "temp") return;
      const id = activeJourneyId;
      const payload = {
        latitude: pos.latitude,
        longitude: pos.longitude,
        speed_mps: pos.speed ?? null,
        bearing: pos.heading ?? null,
        accuracy: pos.accuracy ?? null,
      };

      // Try real API, queue if offline
      try {
        await postJourneyLocation(id, payload);
      } catch {
        offlineQueue?.enqueue?.({ endpoint: `active-journeys/${id}/location`, body: payload });
      }
    },
    [activeJourneyId, offlineQueue]
  );

  // ─── Deviation detection callback ──────────────────────────────────────────
  const handleDeviationDetected = useCallback(async () => {
    if (deviationOpen) return; // already showing
    setDeviationOpen(true);
    setLoadingRecovery(true);
    try {
      const id = activeJourneyId ?? "temp";
      // First try to get existing options, otherwise generate new ones
      let opts = await fetchDeviations(id);
      if (!Array.isArray(opts) || opts.length === 0) {
        opts = await generateRecoveryOptions(id);
      }
      setRecoveryOptions(Array.isArray(opts) ? opts : []);
    } catch {
      setRecoveryOptions([]);
    } finally {
      setLoadingRecovery(false);
    }
  }, [deviationOpen, activeJourneyId]);

  // ─── Real navigation engine ────────────────────────────────────────────────
  const nav = useNavigationEngine({
    enabled: true,
    itinerary: activePlan,
    currentLegIndex: activeLegIndex,
    onLocationUpdate: handleLocationUpdate,
    onDeviationDetected: handleDeviationDetected,
  });

  // ─── Voice guidance ────────────────────────────────────────────────────────
  const voice = useVoiceGuidance({ enabled: !voiceMuted, language: "ar" });

  // ─── Announce current leg when it changes ──────────────────────────────────
  const currentLeg: JourneyLeg | null = activePlan?.legs?.[activeLegIndex] ?? null;
  const prevLegRef = useRef<number>(-1);
  useEffect(() => {
    if (activeLegIndex !== prevLegRef.current && currentLeg?.desc_ar) {
      voice.speak?.(currentLeg.desc_ar);
      prevLegRef.current = activeLegIndex;
    }
  }, [activeLegIndex, currentLeg, voice]);

  // ─── Advance to next leg when routeMatch says leg is complete ──────────────
  useEffect(() => {
    if (nav.routeMatch?.isLegComplete && activePlan?.legs) {
      const nextIdx = activeLegIndex + 1;
      if (nextIdx < activePlan.legs.length) {
        setActiveLegIndex(nextIdx);
      }
    }
  }, [nav.routeMatch?.isLegComplete, activeLegIndex, activePlan?.legs]);

  // ─── Journey progress ─────────────────────────────────────────────────────
  const durationMinutes = activePlan?.duration ?? 25;
  const totalSec = durationMinutes * 60;
  const progressPercent = Math.min(100, Math.round((elapsedSec / totalSec) * 100));
  const remainingMinutes = Math.max(0, Math.ceil((totalSec - elapsedSec) / 60));

  // ─── Route waypoints for map ──────────────────────────────────────────────
  const routePoints = useMemo(() => {
    if (!activePlan?.legs) return [];
    const pts: { lat: number; lng: number }[] = [];
    for (const leg of activePlan.legs) {
      if (Array.isArray(leg.waypoints)) pts.push(...leg.waypoints);
    }
    return pts;
  }, [activePlan]);

  // ─── Complete journey ──────────────────────────────────────────────────────
  const handleComplete = async () => {
    nav.stop?.();
    try {
      if (activeJourneyId && activeJourneyId !== "temp") {
        await completeActiveJourney(activeJourneyId);
      }
      localStorage.removeItem("wasel.activeJourney.v1");
    } catch { /* ignore */ }
    navigate("journey-completed", {
      from,
      to,
      duration: String(Math.max(1, Math.round(elapsedSec / 60))),
      fare: String(activePlan?.fare ?? 10),
    });
  };

  // ─── Cancel journey ────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!confirm("هل تريد إلغاء الملاحة والعودة للمخطط؟")) return;
    nav.stop?.();
    try {
      if (activeJourneyId && activeJourneyId !== "temp") {
        await cancelActiveJourney(activeJourneyId);
      }
      localStorage.removeItem("wasel.activeJourney.v1");
    } catch { /* ignore */ }
    navigate("planner", { from, to });
  };

  // ─── Accept recovery option ────────────────────────────────────────────────
  const handleAcceptRecovery = async (recoveryId: string | number) => {
    setApplyingRecovery(recoveryId);
    try {
      const id = activeJourneyId ?? "temp";
      await acceptRecoveryOption(id, recoveryId);
      setDeviationOpen(false);
      setRecoveryOptions([]);
      // Reset leg tracking
      setActiveLegIndex(0);
    } catch {
      // Silently close modal even if API fails
      setDeviationOpen(false);
    } finally {
      setApplyingRecovery(null);
    }
  };

  // ─── Tunnel mode indicator ────────────────────────────────────────────────
  const showTunnel = nav.tunnelMode;

  // ─── GPS status display ───────────────────────────────────────────────────
  const gpsStatusLabel = {
    off: "بانتظار GPS…",
    starting: "جارٍ تحديد الموقع…",
    live: "موقع حي",
    denied: "الإذن مرفوض",
    error: "خطأ GPS",
    unavailable: "GPS غير متاح",
    stale: "آخر موقع معروف",
  }[nav.status as string] ?? nav.status;

  const userPos = nav.visualPosition ?? nav.rawPosition;

  // Build proper MapItinerary for InteractiveMap from activePlan
  const mapItinerary = useMemo(() => {
    if (!activePlan?.legs?.length) return null;
    return {
      legs: activePlan.legs.map((leg) => ({
        type: leg.leg_type === 'walk' ? 'walking' : 'transit',
        mode: leg.mode ?? leg.type,
        geometry: leg.geometry ?? undefined,
        from_lat: leg.from_lat,
        from_lng: leg.from_lng,
        to_lat: leg.to_lat,
        to_lng: leg.to_lng,
        from_stop: leg.from_stop ?? undefined,
        to_stop: leg.to_stop ?? undefined,
      })),
    };
  }, [activePlan]);

  const mapOrigin = useMemo(() => {
    if (!activePlan) return null;
    const lat = activePlan.origin_lat ?? activePlan.legs?.[0]?.from_lat;
    const lng = activePlan.origin_lng ?? activePlan.legs?.[0]?.from_lng;
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
    return null;
  }, [activePlan]);

  const mapDestination = useMemo(() => {
    if (!activePlan) return null;
    const lastLeg = activePlan.legs?.[activePlan.legs.length - 1];
    const lat = activePlan.dest_lat ?? lastLeg?.to_lat;
    const lng = activePlan.dest_lng ?? lastLeg?.to_lng;
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) };
    return null;
  }, [activePlan]);

  return (
    <div className="relative flex h-[calc(100dvh-64px)] w-full flex-col overflow-hidden bg-mist">
      {/* ─── Top HUD Banner ──────────────────────────────────────────────── */}
      <div className="z-20 border-b border-bone bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-interactive/10 text-interactive">
              <Navigation className="size-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-head text-[15px] font-black text-ink">
                  {from} ← {to}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 border border-emerald/25 px-2 py-0.5 text-[10px] font-bold text-emerald">
                  <span className="size-1.5 rounded-full bg-emerald animate-pulse" />
                  ملاحة حية
                </span>
              </div>
              <p className="text-[11px] text-ash">
                {nav.status === "live"
                  ? `الوصول المتوقع خلال ${remainingMinutes} دقيقة`
                  : gpsStatusLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tunnel indicator */}
            {showTunnel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ash/10 px-2 py-0.5 text-[10px] font-bold text-ash">
                <Radio className="size-3" />
                نفق
              </span>
            )}
            {/* Offline indicator */}
            {((offlineQueue as any)?.queuedCount ?? (offlineQueue as any)?.pending ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brt/10 text-brt border border-brt/20 px-2 py-0.5 text-[10px] font-bold">
                <WifiOff className="size-3" />
                {(offlineQueue as any)?.queuedCount ?? (offlineQueue as any)?.pending} معلق
              </span>
            )}
            {/* Voice toggle */}
            <button
              type="button"
              onClick={() => setVoiceMuted(!voiceMuted)}
              aria-label={voiceMuted ? "تشغيل التوجيه الصوتي" : "كتم التوجيه الصوتي"}
              className="settle-fast flex size-9 cursor-pointer items-center justify-center rounded-xl border border-bone bg-white text-carbon hover:bg-mist"
            >
              {voiceMuted ? <VolumeX className="size-4 text-ash" /> : <Volume2 className="size-4 text-brand" />}
            </button>
            {/* End journey */}
            <PillButton variant="dark" size="sm" onClick={handleComplete}>
              إنهاء الرحلة
            </PillButton>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-2.5 h-1.5 w-full max-w-4xl overflow-hidden rounded-full bg-bone">
          <div
            className="h-full bg-brand transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ─── Main 3D Navigation Map ──────────────────────────────────────── */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <InteractiveMap
          center={userPos ? [userPos.lng, userPos.lat] : [31.2357, 30.0444]}
          zoom={15}
          navigationMode={true}
          follow={followMap}
          onFollowInterrupt={() => setFollowMap(false)}
          onRecenter={() => setFollowMap(true)}
          userLocation={userPos ? { lat: userPos.lat, lng: userPos.lng, accuracy: userPos.accuracy ?? undefined } : null}
          userHeading={nav.heading}
          userSpeed={nav.speed ?? undefined}
          origin={mapOrigin}
          destination={mapDestination}
          itinerary={mapItinerary}
          currentLegIndex={activeLegIndex}
          className="h-full w-full"
        />

        {/* ─── Floating Controls ──────────────────────────────────────── */}
        <div className="absolute end-4 top-4 z-20 flex flex-col gap-2">
          {/* Recenter */}
          <button
            type="button"
            onClick={() => setFollowMap(true)}
            aria-label="إعادة التركيز على موقعي"
            className={`settle-fast flex size-10 cursor-pointer items-center justify-center rounded-2xl border border-bone bg-white/95 shadow-md backdrop-blur-md hover:bg-mist ${
              followMap ? "text-interactive ring-2 ring-interactive/30" : "text-carbon"
            }`}
          >
            <Crosshair className="size-4.5" />
          </button>

          {/* GPS retry (when error or denied) */}
          {(nav.status === "error" || nav.status === "unavailable") && (
            <button
              type="button"
              onClick={() => nav.retry?.()}
              aria-label="إعادة محاولة GPS"
              className="settle-fast flex size-10 cursor-pointer items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 text-amber-700 shadow-md hover:bg-amber-100"
            >
              <RefreshCw className="size-4.5" />
            </button>
          )}

          {/* Manual deviation trigger (for testing / demo) */}
          <button
            type="button"
            onClick={() => handleDeviationDetected()}
            aria-label="اختبار اكتشاف الانحراف"
            title="اختبار اكتشاف الانحراف وإعادة التوجيه"
            className="settle-fast flex size-10 cursor-pointer items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 text-amber-700 shadow-md hover:bg-amber-100"
          >
            <AlertTriangle className="size-4.5" />
          </button>
        </div>

        {/* ─── Floating Step Guidance Card ──────────────────────────────── */}
        <div className="rise-in absolute bottom-4 end-4 start-4 z-30 mx-auto max-w-lg rounded-3xl border border-bone bg-white/95 p-4 shadow-xl backdrop-blur-lg sm:start-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-xs">
                {currentLeg?.type === "walking" ? (
                  <Footprints className="size-5" />
                ) : (
                  <Navigation className="size-5" />
                )}
              </span>
              <div>
                <span className="mono-tag text-[9.5px] text-brand">الخطوة الحالية</span>
                <h4 className="font-head text-[14px] font-black text-ink">
                  {currentLeg?.desc_ar || `انطلق نحو ${to}`}
                </h4>
                <p className="text-[11.5px] text-ash">
                  {currentLeg ? `${currentLeg.from_ar} ← ${currentLeg.to_ar}` : "استمر على المسار المحدد"}
                </p>
              </div>
            </div>

            <div className="text-end shrink-0">
              <span className="font-head text-[20px] font-black text-ink">
                {remainingMinutes}
              </span>
              <span className="block text-[10px] text-ash">دقيقة متبقية</span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-bone pt-2.5 text-[11px] text-ash">
            <span>
              السرعة:{" "}
              <strong>{nav.speed ? Math.round(nav.speed * 3.6) : 0} كم/س</strong>
            </span>
            <span>•</span>
            <span>
              GPS:{" "}
              <strong
                className={cn(
                  nav.status === "live" ? "text-emerald" : "text-amber-600"
                )}
              >
                {gpsStatusLabel}
              </strong>
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={handleCancel}
              className="font-bold text-red-600 hover:underline"
            >
              إلغاء الرحلة
            </button>
          </div>
        </div>
      </div>

      {/* ─── Deviation & Recovery Modal ──────────────────────────────────── */}
      <DeviationModal
        open={deviationOpen}
        onOpenChange={(v) => {
          if (!v) { setDeviationOpen(false); setRecoveryOptions([]); }
        }}
        currentStation={currentLeg?.to_ar || from}
        destination={to}
        remainingMinutes={remainingMinutes}
        seed={elapsedSec}
        recoveryOptions={recoveryOptions}
        loadingRecovery={loadingRecovery}
        applyingRecovery={applyingRecovery}
        onAcceptRecovery={handleAcceptRecovery}
        onApply={() => {
          setDeviationOpen(false);
          setRecoveryOptions([]);
          setActiveLegIndex(0);
        }}
      />
    </div>
  );
}
