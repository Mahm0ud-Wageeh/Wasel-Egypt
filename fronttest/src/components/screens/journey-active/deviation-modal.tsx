"use client";

/**
 * DeviationModal (spec 05 — Deviation & Recovery).
 * Off-route detection dialog.
 *
 * When real API recovery options are available (from backend), those are shown.
 * Falls back to local buildRecovery() only when backend returns empty array.
 */

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Footprints, Loader2, MapPin, RefreshCcw, TriangleAlert } from "lucide-react";
import { LineBadge, PillButton, StatusPill } from "@/components/kit";
import {
  buildRecovery,
  LINE_LABEL_AR,
  type RecoveryPlan,
  type RouteLeg,
} from "@/components/screens/planner/route-engine";
import { formatEGP } from "@/lib/transit-data";

interface DeviationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStation: string;
  destination: string;
  remainingMinutes: number;
  seed: number;
  onApply: () => void;
  /** Real recovery options from backend (preferred) */
  recoveryOptions?: any[];
  loadingRecovery?: boolean;
  applyingRecovery?: string | number | null;
  onAcceptRecovery?: (recoveryId: string | number) => void;
}

export function DeviationModal({
  open,
  onOpenChange,
  currentStation,
  destination,
  remainingMinutes,
  seed,
  onApply,
  recoveryOptions = [],
  loadingRecovery = false,
  applyingRecovery = null,
  onAcceptRecovery,
}: DeviationModalProps) {
  // Local fallback plan (used only when no real API options)
  const localPlan: RecoveryPlan | null = useMemo(
    () =>
      open && recoveryOptions.length === 0 && !loadingRecovery
        ? buildRecovery(currentStation, destination, Math.max(1, remainingMinutes), seed)
        : null,
    [open, currentStation, destination, remainingMinutes, seed, recoveryOptions.length, loadingRecovery]
  );

  const addedFare = useMemo(() => {
    if (!localPlan) return 0;
    return localPlan.legs.reduce((s, l) => s + (l.fareEGP ?? 0), 0);
  }, [localPlan]);

  // Use real options if available, otherwise fall back to local plan
  const hasRealOptions = recoveryOptions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border-bone bg-white p-0 sm:rounded-3xl">
        {/* ─── Warning header ────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 border-b border-brt/20 bg-brt/[0.06] px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brt/15 text-brt">
            <TriangleAlert className="size-5" />
          </span>
          <DialogHeader className="space-y-1 text-start">
            <DialogTitle className="font-head text-[16px] font-black text-ink">
              لقد ابتعدت عن مسارك المخطط
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-5 text-slateink">
              رصدنا موقعك الحالي بعيدًا عن المسار المختار. إليك خطة إعادة توجيه فورية من محطة{" "}
              <span className="font-bold text-ink">{currentStation}</span>.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ─── Recovery options ──────────────────────────────────────────── */}
        <div className="px-5 py-4">
          {loadingRecovery ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="size-8 animate-spin text-interactive" />
              <p className="text-[12.5px] text-slateink">جارٍ حساب خيارات إعادة التوجيه…</p>
            </div>
          ) : hasRealOptions ? (
            /* ─── Real backend recovery options ──────────────────────── */
            <div className="space-y-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="mono-tag">RECOVERY OPTIONS</span>
                <StatusPill tone="delay">انحراف عن المسار</StatusPill>
              </div>
              {recoveryOptions.map((opt: any, i: number) => (
                <div
                  key={opt.id ?? i}
                  className="rounded-xl border border-bone bg-white p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-bold text-ink">
                        {opt.description_ar || opt.description || `خيار إعادة توجيه ${i + 1}`}
                      </div>
                      {opt.added_minutes != null && (
                        <div className="mt-0.5 text-[10.5px] text-ash">
                          +{opt.added_minutes} دقيقة تأخير
                          {opt.additional_fare_egp != null && opt.additional_fare_egp > 0
                            ? ` · ${formatEGP(opt.additional_fare_egp)}`
                            : ""}
                        </div>
                      )}
                    </div>
                    <PillButton
                      size="sm"
                      disabled={applyingRecovery !== null}
                      onClick={() => onAcceptRecovery?.(opt.id ?? i)}
                    >
                      {applyingRecovery === (opt.id ?? i) ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      قبول
                    </PillButton>
                  </div>
                </div>
              ))}
            </div>
          ) : localPlan ? (
            /* ─── Local fallback plan ─────────────────────────────────── */
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="mono-tag">RECOVERY PLAN</span>
                <StatusPill tone="delay">+{localPlan.addedDelayMinutes} دقائق تأخير</StatusPill>
              </div>

              <ul className="space-y-2">
                {localPlan.legs.map((leg: RouteLeg, i: number) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-bone bg-white px-3 py-2.5">
                    {leg.mode === "walk" ? (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-walk/10 text-walk">
                        <Footprints className="size-4" />
                      </span>
                    ) : (
                      <LineBadge code={leg.lineCode} color={leg.lineColor} />
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-[12.5px] font-bold text-ink">
                        {leg.fromAr} ← {leg.toAr}
                      </div>
                      <div className="num mt-0.5 text-[10.5px] text-ash">
                        {leg.mode === "walk"
                          ? `${leg.minutes} د مشي`
                          : `${leg.stationsCount} محطة · ${leg.minutes} د`}
                        {leg.fareEGP ? ` · ${formatEGP(leg.fareEGP)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-3 flex items-start gap-2 rounded-xl bg-mist px-3.5 py-2.5 text-[11.5px] leading-5 text-carbon ring-1 ring-bone">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-interactive" />
                {localPlan.hintAr}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-bone bg-mist px-3 py-2.5">
                  <div className="mono-tag">NEW ETA</div>
                  <div className="num mt-1 text-[18px] font-bold text-ink">{localPlan.newEtaMinutes} د</div>
                </div>
                <div className="rounded-xl border border-bone bg-mist px-3 py-2.5">
                  <div className="mono-tag">LINE</div>
                  <div className="mt-1 truncate text-[12px] font-bold text-ink">
                    {LINE_LABEL_AR[localPlan.legs[0]?.lineCode ?? "L1"] ?? "مسار بديل"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-[12.5px] text-slateink">لم يتم العثور على خيارات تعافٍ متاحة حالياً.</p>
            </div>
          )}
        </div>

        {/* ─── Actions ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 border-t border-bone bg-mist px-5 py-4">
          <PillButton variant="ghost" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
            تجاهل
          </PillButton>
          {!hasRealOptions && (
            <PillButton size="lg" className="flex-1" onClick={onApply}>
              <RefreshCcw className="size-4" />
              أعد التوجيه الآن
            </PillButton>
          )}
        </div>

        {addedFare > 0 && !hasRealOptions ? (
          <p className="flex items-center justify-center gap-1.5 border-t border-bone py-2.5 text-[11px] font-semibold text-slateink">
            <Check className="size-3.5 text-emerald" />
            لا رسوم إضافية — الأجرة الموحدة تشمل المسار البديل ({formatEGP(addedFare)})
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
