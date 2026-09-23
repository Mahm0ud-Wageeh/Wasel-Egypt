"use client";

/**
 * Screen: journey-completed (spec 06 — Arrival & Digital Receipt).
 * Professional arrival confirmation: receipt ticket, carbon offset
 * metric, trip accuracy rating. Route rebuilt from params for the
 * leg-by-leg receipt.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Footprints,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Star,
  Ticket,
  Wallet,
} from "lucide-react";
import { LineBadge, ModeIcon, PillButton } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import {
  buildRoutes,
  carbonSavedKg,
  ticketId,
  trafficReliefKm,
} from "@/components/screens/planner/route-engine";
import { formatEGP } from "@/lib/transit-data";
import { useToast } from "@/hooks/use-toast";

const AR_DATE = new Intl.DateTimeFormat("ar-EG", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function JourneyCompletedScreen({ navigate, params }: ScreenProps) {
  const from = params.from ?? "السادات";
  const to = params.to ?? "عدلي منصور";
  const fare = Number(params.fare ?? "0");
  const duration = Number(params.duration ?? "0");
  const routeIdx = Number(params.route ?? "0") || 0;

  const route = useMemo(() => {
    const routes = buildRoutes(from, to);
    return routes[routeIdx] ?? routes[0] ?? null;
  }, [from, to, routeIdx]);

  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const distanceKm = route?.distanceKm ?? 12;
  const co2 = carbonSavedKg(distanceKm);
  const relief = trafficReliefKm(distanceKm);
  const tid = useMemo(() => ticketId(from, to), [from, to]);
  const paidLabel = AR_DATE.format(new Date());

  const submitRating = () => {
    if (rating === 0) {
      toast({ title: "اختر عدد النجوم أولًا", description: "قيّم دقة الرحلة من 1 إلى 5 نجوم." });
      return;
    }
    toast({
      title: "شكرًا لتقييمك",
      description: `سجلّنا تقييمك (${rating}/5) ويساعدنا في تحسين دقة التوقعات.`,
    });
  };

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-28 pt-8 md:px-6 md:pt-12">
      {/* ============================ arrival hero ============================ */}
      <header className="rise-in text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald/10 ring-1 ring-emerald/30">
          <Check className="size-8 text-emerald" strokeWidth={3} />
        </span>
        <h1 className="mt-5 font-head text-[30px] font-black leading-tight text-ink md:text-[38px]">
          وصلت إلى وجهتك
        </h1>
        <p className="mt-2 text-[14px] text-slateink">
          من <span className="font-bold text-ink">{from}</span> إلى{" "}
          <span className="font-bold text-ink">{to}</span> — {paidLabel}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="num rounded-full border border-bone bg-mist px-3 py-1.5 text-[12px] font-bold text-carbon">
            زمن الرحلة {duration > 0 ? duration : route?.totalMinutes ?? 0} دقيقة
          </span>
          <span className="num rounded-full border border-bone bg-mist px-3 py-1.5 text-[12px] font-bold text-carbon">
            المسافة {distanceKm} كم
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald/25 bg-emerald/10 px-3 py-1.5 text-[12px] font-bold text-emerald">
            <ShieldCheck className="size-3.5" />
            رحلة موثقة
          </span>
        </div>
      </header>

      {/* =========================== receipt ticket =========================== */}
      <section
        aria-label="الإيصال الرقمي"
        className="rise-in card-flat relative mx-auto mt-8 max-w-[640px] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-bone px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-ink text-white">
              <Ticket className="size-4.5" />
            </span>
            <div className="leading-tight">
              <div className="font-head text-[14px] font-black text-ink">إيصال النقل الرقمي</div>
              <div className="mono-tag mt-0.5">{tid}</div>
            </div>
          </div>
          <span className="mono-tag hidden sm:block">WASEL PAY</span>
        </div>

        {/* perforated divider */}
        <div className="relative">
          <div className="border-t-2 border-dashed border-cloud" />
          <span className="absolute -start-2.5 -top-2.5 size-5 rounded-full bg-white ring-1 ring-bone" />
          <span className="absolute -end-2.5 -top-2.5 size-5 rounded-full bg-white ring-1 ring-bone" />
        </div>

        <div className="px-6 py-4">
          <ul className="space-y-2.5">
            {route?.legs.map((leg, i) => (
              <li key={i} className="flex items-center gap-3">
                {leg.mode === "walk" ? (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-walk/10 text-walk">
                    <Footprints className="size-4" />
                  </span>
                ) : (
                  <LineBadge code={leg.lineCode} color={leg.lineColor} />
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[13px] font-bold text-ink">
                    {leg.fromAr} ← {leg.toAr}
                  </div>
                  <div className="num mt-0.5 text-[10.5px] text-ash">
                    {leg.mode === "walk"
                      ? `${leg.minutes} د مشي`
                      : `${leg.stationsCount} محطة · ${leg.minutes} دقيقة`}
                  </div>
                </div>
                <span className="num text-[12px] font-bold text-carbon">
                  {leg.fareEGP ? formatEGP(leg.fareEGP) : "—"}
                </span>
              </li>
            ))}
            {!route ? (
              <li className="text-[13px] text-slateink">رحلة متعددة الوسائط — تفاصيل المقاطع غير متاحة.</li>
            ) : null}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-bone pt-4">
            <div className="flex items-center gap-2 text-[13px] font-bold text-carbon">
              <Wallet className="size-4 text-interactive" />
              الإجمالي مدفوع — محفظة واصل
            </div>
            <span className="num text-[22px] font-extrabold tracking-tight text-ink">
              {fare > 0 ? formatEGP(fare) : route?.fareEGP != null ? formatEGP(route.fareEGP) : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* ============================ green impact ============================ */}
      <section className="rise-in mx-auto mt-5 grid max-w-[640px] gap-3 sm:grid-cols-2">
        <div className="card-mist flex items-start gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-emerald">
            <Leaf className="size-5" />
          </span>
          <div>
            <div className="font-head text-[15px] font-black text-ink">
              وفّرت <span className="num">{co2}</span> كجم CO₂
            </div>
            <p className="mt-1 text-[11.5px] leading-5 text-slateink">
              مقارنة برحلة سيارة خاصة لنفس المسافة — حسب معامل الانبعاثات الوطني.
            </p>
          </div>
        </div>
        <div className="card-mist flex items-start gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-interactive/10 text-interactive">
            <ModeIcon mode="metro" className="size-5" />
          </span>
          <div>
            <div className="font-head text-[15px] font-black text-ink">
              <span className="num">{relief}</span> كم تخفيفاً للطرق
            </div>
            <p className="mt-1 text-[11.5px] leading-5 text-slateink">
              مكافئ من حيث الضغط المروري الذي وفّرته لشبكة الطرق.
            </p>
          </div>
        </div>
      </section>

      {/* ============================ rating band ============================= */}
      <section
        aria-label="تقييم الرحلة"
        className="rise-in card-flat mx-auto mt-5 max-w-[640px] px-6 py-5 text-center"
      >
        <h2 className="font-head text-[16px] font-black text-ink">قيّم دقة هذه الرحلة</h2>
        <p className="mt-1 text-[12px] text-slateink">
          هل تطابقت الرحلة الحية مع الخطة المخططة؟ تقييمك يحسّن محرك التوقعات للجميع.
        </p>
        <div className="mt-3 flex items-center justify-center gap-1.5" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="cursor-pointer rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
              aria-label={`${n} نجوم`}
            >
              <Star
                className={cn(
                  "size-7 settle-fast",
                  (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-cloud"
                )}
              />
            </button>
          ))}
        </div>
        <PillButton size="md" className="mt-4" onClick={submitRating}>
          إرسال التقييم
        </PillButton>
      </section>

      {/* ============================== actions ============================== */}
      <div className="mx-auto mt-6 flex max-w-[640px] flex-col gap-2.5 sm:flex-row">
        <PillButton
          size="lg"
          className="flex-1"
          onClick={() => {
            toast({
              title: "تم حفظ الرحلة",
              description: "ستجدها في «رحلاتي» للإعادة بضغطة واحدة.",
            });
            navigate("history");
          }}
        >
          <BookmarkPlus className="size-4" />
          احفظ في رحلاتي
        </PillButton>
        <PillButton variant="outline" size="lg" className="flex-1" onClick={() => navigate("planner")}>
          <RotateCcw className="size-4" />
          رحلة جديدة
        </PillButton>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11.5px] font-semibold text-ash">
        <ArrowRight className="size-3.5 rotate-180" />
        إيصالك مؤرشف ولديك حق الرجوع إليه من سجل الرحلات في أي وقت
      </p>
    </div>
  );
}
