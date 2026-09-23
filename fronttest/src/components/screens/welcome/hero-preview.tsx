"use client";

/**
 * Welcome — hero visual anchor.
 * A dense "working software" trip-plan card (ClickUp-style product mock)
 * showing a real multimodal itinerary: السادات → العاصمة الإدارية.
 */

import { Check, Clock, Footprints, Wallet } from "lucide-react";
import { LineBadge, StatusPill } from "@/components/kit";
import { cn } from "@/lib/utils";

interface Leg {
  code: string;
  color: string;
  from: string;
  to: string;
  stops: number;
}

const LEGS: Leg[] = [
  { code: "L2", color: "#dc2626", from: "السادات", to: "جامعة القاهرة", stops: 6 },
  { code: "L3", color: "#16a34a", from: "جامعة القاهرة", to: "عدلي منصور", stops: 17 },
  { code: "LRT", color: "#0284c7", from: "عدلي منصور", to: "الفنون والثقافة", stops: 9 },
];

export function HeroPreview({ className }: { className?: string }) {
  return (
    <div className={cn("card-flat relative rounded-3xl p-5 md:p-6", className)}>
      {/* card header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mono-tag">TRIP PLAN — LIVE</p>
          <p className="mt-1.5 text-[13px] font-bold text-ink">
            مخطط رحلة حقيقي من الشبكة
          </p>
        </div>
        <StatusPill tone="ontime">
          <span className="size-1.5 rounded-full bg-emerald" />
          تداول طبيعي
        </StatusPill>
      </div>

      {/* origin / destination */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="size-2.5 shrink-0 rounded-full bg-interactive shadow-[0_0_0_4px_rgba(0,145,255,0.14)]" />
          <div>
            <p className="text-[15px] font-bold text-ink">السادات</p>
            <p className="text-[11.5px] text-ash">الخط الأول والثاني — ميدان التحرير</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="size-2.5 shrink-0 rounded-full bg-emerald shadow-[0_0_0_4px_rgba(0,192,122,0.14)]" />
          <div>
            <p className="text-[15px] font-bold text-ink">العاصمة الإدارية</p>
            <p className="text-[11.5px] text-ash">محطة المونوريل — الفنون والثقافة</p>
          </div>
        </div>
      </div>

      {/* legs */}
      <div className="mt-5 space-y-2">
        {LEGS.map((leg) => (
          <div
            key={leg.code}
            className="flex items-center gap-3 rounded-2xl border border-bone bg-mist px-3.5 py-2.5"
          >
            <LineBadge code={leg.code} color={leg.color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-carbon">
                {leg.from} <span className="text-ash">←</span> {leg.to}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-ash">
              <span className="num">{leg.stops}</span> محطة
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-cloud px-3.5 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-plaster text-slateink">
            <Footprints className="size-3.5" />
          </span>
          <p className="text-[12.5px] font-medium text-slateink">
            مشي <span className="num">9</span> دقائق بين المحطات
          </p>
        </div>
      </div>

      {/* summary strip */}
      <div className="mt-5 grid grid-cols-3 divide-x divide-bone rounded-2xl border border-bone">
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <Clock className="size-3.5 text-ash" />
          <span className="num text-[15px] font-extrabold text-ink">63</span>
          <span className="text-[10.5px] text-ash">دقيقة زمن الرحلة</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <Wallet className="size-3.5 text-ash" />
          <span className="num text-[15px] font-extrabold text-ink">20</span>
          <span className="text-[10.5px] text-ash">ج.م أجر رسمي</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <Check className="size-3.5 text-emerald" />
          <span className="text-[15px] font-extrabold text-ink">
            <span className="num">3</span> تحويلات
          </span>
          <span className="text-[10.5px] text-ash">بنقله واحد</span>
        </div>
      </div>
    </div>
  );
}
