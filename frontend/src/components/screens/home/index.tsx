"use client";

/**
 * Wasel Egypt — Home / commuter dashboard screen.
 * Time-based greeting, quick trip search hero card with local
 * autocomplete, live line radar, saved trips, next departures
 * ticking board and quick access grid.
 */

import { useState, useEffect } from "react";
import {
  ArrowUpDown,
  ArrowUpLeft,
  Bell,
  Briefcase,
  ChevronLeft,
  GraduationCap,
  History,
  House,
  Map,
  Search,
  TrainFront,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PillButton, ScreenShell } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { StationInput } from "./station-input";
import { LineRadar } from "./line-radar";
import { DeparturesBoard } from "./departures-board";
import { QUICK_ACCESS, SAVED_TRIPS, type SavedTrip } from "./data";

const TRIP_ICONS: Record<SavedTrip["icon"], LucideIcon> = {
  home: House,
  work: Briefcase,
  university: GraduationCap,
  station: TrainFront,
};

const QUICK_ICONS: Record<string, LucideIcon> = {
  fares: Wallet,
  history: History,
  map: Map,
  community: Users,
};

/* ================================= SCREEN ================================= */

export default function HomeScreen({ navigate }: ScreenProps) {
  const [greeting, setGreeting] = useState("أهلاً بك");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    setGreeting(new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير");
    try {
      setDateLabel(
        new Intl.DateTimeFormat("ar-EG", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())
      );
    } catch {
      /* ignore */
    }
  }, []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [swapped, setSwapped] = useState(false);

  const swap = () => {
    setFrom(to);
    setTo(from);
    setSwapped((s) => !s);
  };

  const planTrip = () => {
    const params: Record<string, string> = {};
    if (from.trim()) params.from = from.trim();
    if (to.trim()) params.to = to.trim();
    navigate("planner", params);
  };

  return (
    <ScreenShell className="pb-12">
      {/* ---------------------------- greeting row ---------------------------- */}
      <header className="flex items-start justify-between gap-4 pt-6">
        <div>
          <p className="min-h-[18px] text-[12.5px] font-medium text-ash">{dateLabel}</p>
          <h1 className="mt-1 font-head text-[26px] font-black leading-tight text-ink md:text-[30px]">
            {greeting}
          </h1>
          <p className="mt-1 text-[13px] text-slateink">
            جاهز لرحلة اليوم؟ الشبكة تعمل بكامل طاقتها
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("notifications")}
          aria-label="الإشعارات"
          className="relative mt-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-bone bg-white text-carbon outline-none settle-fast hover:bg-mist focus-visible:ring-2 focus-visible:ring-interactive/40"
        >
          <Bell className="size-[18px]" />
          <span
            className="absolute end-2.5 top-2.5 size-2 rounded-full bg-l2 ring-2 ring-white"
            aria-hidden="true"
          />
        </button>
      </header>

      {/* -------------------------- quick search card ------------------------- */}
      <section
        className="glass mt-5 rounded-3xl p-4 md:p-6"
        aria-label="البحث السريع عن رحلة"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-head text-[17px] font-black text-ink md:text-[19px]">
            إلى أين تريد الذهاب اليوم؟
          </h2>
          <span className="mono-tag hidden md:block">TRIP PLANNER</span>
        </div>

        <div className="mt-4 grid items-start gap-2.5 lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-3">
          <StationInput
            id="trip-from"
            label="من"
            placeholder="محطة الانطلاق…"
            value={from}
            onChange={setFrom}
            dotColor="#0091ff"
            showGpsOption
          />
          <button
            type="button"
            onClick={swap}
            aria-label="تبديل نقطة الانطلاق والوصول"
            className="settle mx-auto flex size-11 items-center justify-center rounded-full border border-bone bg-white text-carbon outline-none hover:bg-mist focus-visible:ring-2 focus-visible:ring-interactive/40 active:scale-95 lg:mb-0.5"
            style={{ transform: swapped ? "rotate(180deg)" : undefined }}
          >
            <ArrowUpDown className="size-4" />
          </button>
          <StationInput
            id="trip-to"
            label="إلى"
            placeholder="وجهتك في القاهرة الكبرى…"
            value={to}
            onChange={setTo}
            dotColor="#00c07a"
          />
        </div>

        <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-[11.5px] leading-5 text-ash sm:block">
            اختر محطتك من القائمة أو اكتب اسمها — واصل يكمل التفاصيل
          </p>
          <PillButton variant="dark" size="lg" className="w-full sm:w-auto" onClick={planTrip}>
            <Search className="size-4" />
            اعثر على رحلتك
          </PillButton>
        </div>
      </section>

      {/* ------------------------- radar + departures ------------------------- */}
      <section
        className="mt-8 grid items-start gap-4 lg:mt-10 lg:grid-cols-[1.35fr_1fr]"
        aria-label="حالة الشبكة والمغادرات"
      >
        <LineRadar onNavigate={navigate} />
        <DeparturesBoard />
      </section>

      {/* ----------------------------- saved trips ---------------------------- */}
      <section className="mt-8 lg:mt-10" aria-label="الرحلات المحفوظة">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-head text-[19px] font-black text-ink md:text-[22px]">
              مساراتك المحفوظة
            </h2>
            <p className="mt-1 text-[12.5px] text-slateink">
              ضغطة واحدة تخطط رحلتك اليومية
            </p>
          </div>
          <PillButton variant="outline" size="sm" onClick={() => navigate("history")}>
            كل الرحلات
            <ChevronLeft className="size-3.5" />
          </PillButton>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {SAVED_TRIPS.map((trip) => {
            const Icon = TRIP_ICONS[trip.icon];
            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => navigate("planner", { from: trip.from, to: trip.to })}
                className="card-flat settle group w-[230px] shrink-0 rounded-2xl p-4 text-start outline-none hover:-translate-y-0.5 hover:border-cloud focus-visible:ring-2 focus-visible:ring-interactive/40 md:w-auto"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-full bg-ink/[0.04] text-carbon">
                    <Icon className="size-4" />
                  </span>
                  <ArrowUpLeft className="size-4 text-fog settle-fast group-hover:text-interactive" />
                </span>
                <span className="mt-3 block text-[14px] font-black text-ink">{trip.title}</span>
                <span className="mt-1 block truncate text-[12px] font-bold text-carbon">
                  {trip.from} <span className="text-ash">←</span> {trip.to}
                </span>
                <span className="mt-0.5 block text-[11px] text-ash">{trip.via}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------------------------- quick access ---------------------------- */}
      <section className="mt-8 lg:mt-10" aria-label="وصول سريع">
        <h2 className="font-head text-[19px] font-black text-ink md:text-[22px]">وصول سريع</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACCESS.map((item) => {
            const Icon = QUICK_ICONS[item.icon];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.screen)}
                className="card-mist settle rounded-2xl p-4 text-start outline-none hover:-translate-y-0.5 hover:border-cloud focus-visible:ring-2 focus-visible:ring-interactive/40"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-full border border-bone bg-white text-carbon">
                    <Icon className="size-4" />
                  </span>
                  <ChevronLeft className="size-4 text-fog" />
                </span>
                <span className="mt-3 block text-[14px] font-black text-ink">{item.label}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-slateink">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </ScreenShell>
  );
}
