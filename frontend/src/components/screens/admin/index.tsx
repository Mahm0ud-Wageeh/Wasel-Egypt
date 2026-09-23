"use client";

/**
 * Screen: admin (spec 19 — Operations Telemetry & Data Governance)
 * Full-bleed dark telemetry console. Owns its sticky top bar
 * (white brand variant, live clock, back-to-app escape).
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PillButton } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { KpiRow, ModerationQueue, NetworkHealthMap, OpsTable, GtfsGovernance } from "./sections";
import { ArrowLeft } from "lucide-react";

/* ----------------------------- white brand ------------------------------ */

function AdminLogo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#ffffff" />
        <path
          d="M8 21c4 0 4-10 8-10s4 10 8 10"
          stroke="#6647f0"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="8" cy="21" r="2.4" fill="#0091ff" />
        <circle cx="24" cy="21" r="2.4" fill="#202020" />
      </svg>
      <span className="leading-none">
        <span className="block font-head text-[18px] font-black text-white">
          واصل <span className="text-brand">مصر</span>
        </span>
        <span className="mono-tag mt-1 block !text-[9px] !text-white/40">WASEL EGYPT</span>
      </span>
    </span>
  );
}

/* -------------------------------- helpers ------------------------------- */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/* --------------------------------- screen ------------------------------- */

export default function AdminScreen({ navigate }: ScreenProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, []);

  const clock = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "--:--:--";

  return (
    <div className="dark-panel min-h-dvh w-full">
      {/* ========================== sticky NOC top bar ========================== */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-4 md:px-6">
          <AdminLogo />

          <span className="mono-tag hidden !text-white/35 lg:block">
            NETWORK OPERATIONS CENTER
          </span>

          <div className="ms-auto flex items-center gap-3 md:gap-5">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[11px] font-bold text-emerald sm:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald" />
              <span className="num">100%</span> OK
            </span>
            <span className="hidden flex-col items-end leading-tight sm:flex">
              <span className="num text-[15px] font-bold text-white">{clock}</span>
              <span className="mono-tag !text-[8.5px] !text-white/35">CAIRO · UTC+2</span>
            </span>
            <PillButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("home")}
              className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft />
              عودة للتطبيق
            </PillButton>
          </div>
        </div>
      </header>

      {/* ============================== console body ============================== */}
      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6 md:py-8">
        {/* page head */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="mono-tag !text-white/35">RESTRICTED · ROLE ADMIN</span>
            <h1 className="mt-1.5 font-head text-[22px] font-black text-white md:text-[26px]">
              مركز عمليات الشبكة — لوحة القياس الحية
            </h1>
          </div>
          <p className="hidden max-w-sm text-[12px] leading-6 text-white/45 md:block">
            مراقبة لحظية لتدفق الركاب، انتظام الخطوط، وبلاغات المجتمع — مع إدارة كاملة لبيانات
            الجداول الثابتة GTFS.
          </p>
        </div>

        {/* KPI telemetry */}
        <KpiRow />

        {/* live ops grid */}
        <OpsTable />

        {/* moderation + governance / health */}
        <div className="grid gap-6 xl:grid-cols-2">
          <ModerationQueue />
          <div className="space-y-6">
            <NetworkHealthMap />
            <GtfsGovernance />
          </div>
        </div>

        {/* footer strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 pb-2">
          <span className="mono-tag !text-white/25">WASEL EGYPT · NOC BUILD 2.4.1</span>
          <span className={cn("mono-tag !text-white/25")}>GTFS FEED HEALTH 99.4% · OSRM ENGINE ONLINE</span>
        </div>
      </main>
    </div>
  );
}
