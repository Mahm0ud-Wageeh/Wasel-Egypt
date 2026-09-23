"use client";

/**
 * Screen: journey history (spec 07 — Journey History & Saved Routes).
 * Chronological commuter log with monthly stats, favorites and
 * one-tap repeat journey. Consumes the ready history-data module.
 */

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  BookmarkCheck,
  Footprints,
  Inbox,
  Leaf,
  RotateCcw,
  Route,
  Star,
  Wallet,
} from "lucide-react";
import { FilterChip, LineBadge, PillButton, ScreenShell, SectionHead, Stat } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyJourneys } from "@/api/journeys";
import {
  buildStats,
  GROUP_LABEL_AR,
  groupOf,
  legsOf,
  SAVED_ROUTES,
  TRIPS,
  tripDateLabel,
  type Trip,
} from "./history-data";

type FilterKey = "all" | "favorites" | "week";

export default function HistoryScreen({ navigate }: ScreenProps) {
  const { isLoggedIn } = useAuth();
  const [trips, setTrips] = useState<Trip[]>(() => [...TRIPS]);
  const stats = useMemo(() => buildStats(), []);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [favs, setFavs] = useState<Set<string>>(
    () => new Set(TRIPS.filter((t) => t.favorite).map((t) => t.id))
  );

  useEffect(() => {
    let active = true;
    if (isLoggedIn) {
      fetchMyJourneys()
        .then((items) => {
          if (!active || !Array.isArray(items) || items.length === 0) return;
          const mapped: Trip[] = items.map((item, idx) => ({
            id: `journey-${item.id || idx}`,
            from: item.origin_name || item.from_name || "محطة البداية",
            to: item.destination_name || item.to_name || "محطة الوصول",
            fare: Number(item.fare) || 10,
            durationMin: Number(item.duration_minutes || item.duration) || 25,
            daysAgo: 0,
            dateIso: item.created_at || new Date().toISOString(),
            favorite: false,
            modes: ["l1", "l2"],
            legsCount: item.transfers ? item.transfers + 1 : 2,
            distanceKm: 14.2,
          }));
          setTrips((prev) => [...mapped, ...prev]);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      if (filter === "favorites" && !favs.has(t.id)) return false;
      if (filter === "week" && t.daysAgo > 6) return false;
      return true;
    });
  }, [trips, filter, favs]);

  const groups = useMemo(() => {
    const order = ["today", "yesterday", "earlier"] as const;
    return order
      .map((g) => ({ key: g, trips: filtered.filter((t) => groupOf(t) === g) }))
      .filter((g) => g.trips.length > 0);
  }, [filtered]);

  const repeat = (t: Trip) => navigate("planner", { from: t.from, to: t.to });

  return (
    <ScreenShell className="pb-28 pt-6 md:pt-10">
      <SectionHead
        tag="JOURNEY HISTORY"
        title="سجل رحلاتك ومساراتك المحفوظة"
        desc="كل رحلة موثقة بأجرتها الرسمية ومدتها الفعلية — أعد أي رحلة سابقة بضغطة واحدة."
      />

      {/* ============================ stats band ============================= */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card-flat p-4 md:p-5">
          <Stat value={String(stats.trips)} label="رحلة هذا الشهر" />
        </div>
        <div className="card-flat p-4 md:p-5">
          <Stat value={`${stats.km}`} label="كيلومتر مقطوع" />
        </div>
        <div className="card-flat p-4 md:p-5">
          <Stat value={`${stats.co2Kg}`} label="كجم CO₂ موفّرة" tone="interactive" />
        </div>
        <div className="card-flat p-4 md:p-5">
          <Stat value={`${stats.totalFare}`} label="ج.م إجمالي الأجور" tone="brand" />
        </div>
      </div>

      {/* ========================= saved routes strip ======================== */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <BookmarkCheck className="size-4 text-brand" />
          <h2 className="font-head text-[16px] font-black text-ink">المسارات المحفوظة</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SAVED_ROUTES.map((s) => (
            <div key={s.id} className="card-flat settle-fast flex items-center gap-3 p-4 hover:border-cloud">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist text-carbon ring-1 ring-bone">
                <Bookmark className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-head text-[14px] font-black text-ink">{s.label}</div>
                <div className="mt-0.5 truncate text-[12px] font-semibold text-slateink">
                  {s.from} ← {s.to}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {legsOf(s.legCodes).map((l) => (
                    <LineBadge key={l.code} code={l.code} color={l.color} size="sm" />
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate("planner", { from: s.from, to: s.to })}
                className="settle-fast flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-white hover:bg-carbon"
                aria-label={`كرر رحلة ${s.label}`}
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => navigate("planner")}
            className="settle-fast flex min-h-[76px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cloud text-[13px] font-bold text-slateink hover:border-interactive/50 hover:text-interactive"
          >
            <Route className="size-4" />
            حفظ مسار جديد
          </button>
        </div>
      </div>

      {/* ============================ filters row ============================ */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-head text-[16px] font-black text-ink">السجل الزمني</h2>
        <div className="flex items-center gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            الكل
          </FilterChip>
          <FilterChip active={filter === "favorites"} onClick={() => setFilter("favorites")}>
            <Star className="size-3.5" />
            المفضلة
          </FilterChip>
          <FilterChip active={filter === "week"} onClick={() => setFilter("week")}>
            هذا الأسبوع
          </FilterChip>
        </div>
      </div>

      {/* ========================== chronological log ======================== */}
      {groups.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-cloud py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-mist text-ash ring-1 ring-bone">
            <Inbox className="size-6" />
          </span>
          <p className="font-head text-[15px] font-black text-ink">لا رحلات مطابقة بعد</p>
          <p className="max-w-xs text-[12.5px] leading-6 text-slateink">
            ابدأ أول رحلة الآن وسيظهر السجل هنا تلقائيًا مع إيصال كل رحلة.
          </p>
          <PillButton onClick={() => navigate("planner")}>خطط أول رحلة</PillButton>
        </div>
      ) : (
        <div className="mt-4 space-y-8">
          {groups.map((g) => (
            <section key={g.key} aria-label={GROUP_LABEL_AR[g.key]}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-head text-[14px] font-black text-ink">{GROUP_LABEL_AR[g.key]}</h3>
                <span className="num rounded-full bg-mist px-2.5 py-0.5 text-[10.5px] font-bold text-ash ring-1 ring-bone">
                  {g.trips.length} رحلات
                </span>
                <div className="h-px flex-1 bg-bone" />
              </div>

              <ul className="space-y-2.5">
                {g.trips.map((t) => (
                  <li
                    key={t.id}
                    className="card-flat settle-fast flex flex-wrap items-center gap-3 p-4 hover:border-cloud sm:flex-nowrap"
                  >
                    {/* time + date */}
                    <div className="w-16 shrink-0 text-center">
                      <div className="num text-[15px] font-bold text-ink">{t.time}</div>
                      <div className="mt-0.5 text-[10px] font-semibold text-ash">
                        {tripDateLabel(t.daysAgo)}
                      </div>
                    </div>

                    <div className="h-10 w-px shrink-0 bg-bone" />

                    {/* route */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[14px] font-black text-ink">
                        <span className="truncate">{t.from}</span>
                        <span className="text-ash">←</span>
                        <span className="truncate">{t.to}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {legsOf(t.legCodes).map((l) => (
                          <LineBadge key={l.code} code={l.code} color={l.color} size="sm" />
                        ))}
                        <span className="num text-[10.5px] font-semibold text-ash">
                          {t.durationMin} دقيقة
                        </span>
                      </div>
                    </div>

                    {/* fare */}
                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-carbon">
                      <Wallet className="size-3.5 text-ash" />
                      <span className="num">{t.fare}</span>
                      <span className="text-[10.5px] text-ash">ج.م</span>
                    </div>

                    {/* actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleFav(t.id)}
                        className={cn(
                          "settle-fast flex size-10 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-mist focus-visible:ring-2 focus-visible:ring-interactive/40",
                          favs.has(t.id) ? "text-amber-400" : "text-fog"
                        )}
                        aria-label={favs.has(t.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                      >
                        <Star className={cn("size-4.5", favs.has(t.id) && "fill-amber-400")} />
                      </button>
                      <button
                        onClick={() => repeat(t)}
                        className="settle-fast flex size-10 cursor-pointer items-center justify-center rounded-full bg-mist text-carbon ring-1 ring-bone outline-none hover:bg-ink hover:text-white focus-visible:ring-2 focus-visible:ring-interactive/40"
                        aria-label="كرر هذه الرحلة"
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* ============================== eco note ============================= */}
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald/20 bg-emerald/[0.05] px-4 py-3.5">
        <Leaf className="size-4.5 shrink-0 text-emerald" />
        <p className="text-[12px] leading-6 text-carbon">
          كل كيلومتر تقطعه عبر شبكة النقل العام يوفّر في المتوسط{" "}
          <span className="num font-bold text-emerald">0.129</span> كجم من انبعاثات ثاني أكسيد
          الكربون مقارنة بالسيارة الخاصة — شكراً لمساهمتك في هواء أنظف.
        </p>
      </div>
    </ScreenShell>
  );
}
