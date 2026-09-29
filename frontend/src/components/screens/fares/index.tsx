"use client";

/**
 * SCREEN: fares — الأجور الرسمية والاشتراكات
 * Official Oct-2024 fare matrix + station-count calculator + Wasel smart
 * pass + subscription passes + payment rails.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  ArrowLeftRight,
  Clock,
  Calculator,
  Wallet,
  CreditCard,
  Banknote,
  MapPin,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PillButton,
  LineBadge,
  StatusPill,
  SectionHead,
  FilterChip,
  ScreenShell,
} from "@/components/kit";
import { LINES } from "@/lib/transit-data";
import { cn } from "@/lib/utils";
import {
  FARE_TIERS,
  FARE_STATIONS,
  PAYMENT_METHODS,
  stationsBetween,
  rideMinutes,
  type FareStation,
} from "./data";
import { SmartPassCard } from "./pass-card";
import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";

const METRO_LINES = LINES.filter((l) => l.mode === "metro");
const lineBy = (id: string) => METRO_LINES.find((l) => l.id === id)!;

const DEFAULT_FROM = "metro-l1-8"; // المعادي
const DEFAULT_TO = "metro-l2-0"; // شبرا الخيمة

/* ---------------------------- Station selector ----------------------------- */

function StationSelect({
  value,
  onChange,
  labelAr,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  labelAr: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold text-slateink">
        {icon}
        {labelAr}
      </label>
      <Select dir="rtl" value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 w-full rounded-2xl border-bone bg-white px-4 text-[14px] font-bold text-ink shadow-none hover:border-cloud focus-visible:ring-interactive/40 [&>span]:min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-2xl">
          {METRO_LINES.map((line) => (
            <SelectGroup key={line.id}>
              <SelectLabel className="flex items-center gap-2 py-2">
                <LineBadge code={line.code} color={line.color} size="sm" />
                <span className="text-[11.5px] font-bold text-carbon">{line.nameAr}</span>
              </SelectLabel>
              {FARE_STATIONS.filter((s) => s.lineId === line.id).map((s) => (
                <StationItem key={s.id} station={s} />
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StationItem({ station }: { station: FareStation }) {
  const line = lineBy(station.lineId);
  return (
    <SelectItem
      value={station.id}
      className="rounded-xl py-2 text-[13.5px] font-medium"
    >
      <span className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: line.color }}
          aria-hidden="true"
        />
        <span className="truncate">{station.nameAr}</span>
      </span>
    </SelectItem>
  );
}

/* ------------------------------- Fare result ------------------------------- */
/* Price ALWAYS comes from the backend tariff (prop) — never static. */

function FareResult({
  stations,
  price,
  bracketLabel,
  priceStatus,
  loading,
}: {
  stations: number | null;
  price: number | null;
  bracketLabel: string | null;
  priceStatus: string | null;
  loading: boolean;
}) {
  return (
    <div className="settle-fast rounded-3xl border border-bone bg-mist p-6 md:p-7">
      {stations === null ? (
        <div className="flex min-h-[132px] flex-col items-center justify-center gap-2 text-center">
          <Calculator className="size-6 text-fog" aria-hidden="true" />
          <p className="text-[13.5px] font-medium text-slateink">
            اختر محطتي الانطلاق والوصول لحساب الأجرة
          </p>
        </div>
      ) : loading ? (
        <div className="flex min-h-[132px] flex-col items-center justify-center gap-2 text-center">
          <Calculator className="size-6 animate-pulse text-fog" aria-hidden="true" />
          <p className="text-[13.5px] font-medium text-slateink">جارٍ جلب السعر المعتمد من الخادم…</p>
        </div>
      ) : price === null ? (
        <div className="flex min-h-[132px] flex-col items-center justify-center gap-2 text-center">
          <Calculator className="size-6 text-fog" aria-hidden="true" />
          <p className="text-[13.5px] font-bold text-ink">تعذر حساب الأجرة</p>
          <p className="text-[12px] font-medium text-slateink">أسعار الخادم غير متاحة حالياً — حاول لاحقاً.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-[11.5px] font-bold text-slateink">الأجرة المستحقة</p>
            <p className="num mt-1 text-[46px] font-extrabold leading-none tracking-tight text-onyx md:text-[56px]">
              {price.toFixed(2)}
              <span className="ms-2 align-middle text-[15px] font-bold text-ash">EGP</span>
            </p>
            {priceStatus === "real" ? (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                سعر رسمي معتمد
              </p>
            ) : (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-brt/30 bg-brt/10 px-2 py-0.5 text-[10.5px] font-bold text-brt">
                سعر تقديري — بانتظار التوثيق
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2.5 sm:items-end">
            <StatusPill tone="info">
              <MapPin aria-hidden="true" />
              <span className="num">{stations}</span> محطة مقطوعة
            </StatusPill>
            {bracketLabel ? <span className="text-[12.5px] font-medium text-slateink">{bracketLabel}</span> : null}
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-carbon">
              <Clock className="size-3.5 text-interactive" aria-hidden="true" />
              زمن تقريبي
              <span className="num font-bold text-onyx">{rideMinutes(stations)}</span>
              دقيقة
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Screen ---------------------------------- */

export default function FaresScreen() {
  const [fromId, setFromId] = useState(DEFAULT_FROM);
  const [toId, setToId] = useState(DEFAULT_TO);

  // Backend tariff — the ONLY price source. Static tiers supply bracket
  // boundaries (structure), never amounts.
  const [backendFares, setBackendFares] = useState<any[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiRequest<any>(endpoints.public.fares, { method: "GET", auth: false })
      .then((res) => {
        if (cancelled) return;
        const list = res?.data ?? res;
        setBackendFares(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setBackendFares([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const metroFares = useMemo(
    () =>
      (backendFares ?? [])
        .filter((f: any) => f?.transit_mode?.name === "metro" || f?.mode_name === "مترو الأنفاق")
        .sort((a: any, b: any) => Number(a.amount) - Number(b.amount)),
    [backendFares]
  );
  const faresLoading = backendFares === null;

  const stations = useMemo(() => stationsBetween(fromId, toId), [fromId, toId]);
  const bracketIndex = stations !== null ? FARE_TIERS.findIndex((t) => stations >= t.min && stations <= t.max) : -1;
  const fromStation = useMemo(() => FARE_STATIONS.find((s) => s.id === fromId), [fromId]);
  const toStation = useMemo(() => FARE_STATIONS.find((s) => s.id === toId), [toId]);
  const backendRow = bracketIndex >= 0 && bracketIndex < metroFares.length ? metroFares[bracketIndex] : null;
  const fare: number | null = backendRow ? Number(backendRow.amount) : null;
  const fareStatus: string | null = backendRow?.data_status ?? null;

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const reset = () => {
    setFromId(DEFAULT_FROM);
    setToId(DEFAULT_TO);
  };

  return (
    <ScreenShell className="pb-24 md:pb-8">
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="pt-8 md:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <SectionHead
            tag="OFFICIAL TARIFF MATRIX — OCT 2024"
            title="الأجور الرسمية والاشتراكات"
            desc="حاسبة الأجرة بالمحطات، كارت واصل الذكي، وكل اشتراكات الشبكة الكبرى — بأسعار رسمية موثقة."
          />
          <StatusPill tone="ontime" className="mb-1">
            <ShieldCheck aria-hidden="true" />
            {faresLoading
              ? "جارٍ جلب التعريفة المعتمدة…"
              : metroFares.length > 0
              ? `الأسعار المعتمدة بالخادم · ${metroFares.length} شريحة`
              : "لا توجد أسعار معتمدة بالخادم حالياً"}
          </StatusPill>
        </div>
      </section>

      {/* ----------------------------- Calculator ---------------------------- */}
      <section className="mt-12 md:mt-16">
        <div className="card-flat rounded-3xl p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-head text-[17px] font-black text-ink md:text-[19px]">
              حاسبة الأجرة بعدد المحطات
            </h3>
            <PillButton variant="ghost" size="sm" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              إعادة تعيين
            </PillButton>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <StationSelect
              value={fromId}
              onChange={setFromId}
              labelAr="من محطة"
              icon={<MapPin className="size-3.5" aria-hidden="true" />}
            />
            <button
              type="button"
              onClick={swap}
              aria-label="تبديل المحطتين"
              className="settle-fast mx-auto flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-bone bg-white text-carbon hover:border-cloud hover:bg-mist focus-visible:ring-2 focus-visible:ring-interactive/40 outline-none md:mb-0.5"
            >
              <ArrowLeftRight className="size-4" aria-hidden="true" />
            </button>
            <StationSelect
              value={toId}
              onChange={setToId}
              labelAr="إلى محطة"
              icon={<MapPin className="size-3.5" aria-hidden="true" />}
            />
          </div>

          <div className="mt-5">
            <FareResult
              stations={stations}
              price={fare}
              bracketLabel={backendRow?.label ?? (bracketIndex >= 0 ? FARE_TIERS[bracketIndex].labelAr : null)}
              priceStatus={fareStatus}
              loading={faresLoading}
            />
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-5 text-ash">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            الحساب يعتمد على أقصر مسار بين المحطتين — والسعر من التعريفة المعتمدة بالخادم لحظة الحساب.
          </p>
        </div>
      </section>

      {/* --------------------------- Official matrix -------------------------- */}
      {/* Backend tariff rows only — hidden when the server has none. */}
      {faresLoading ? (
        <section className="mt-14 md:mt-20" aria-label="مصفوفة الأجور">
          <SectionHead
            tag="FARE BRACKETS"
            title="مصفوفة أجور المترو المعتمدة"
            desc="جارٍ جلب التعريفة المعتمدة من الخادم…"
          />
          <div className="mt-7 animate-pulse rounded-3xl border border-bone bg-mist/50 h-48" />
        </section>
      ) : metroFares.length > 0 ? (
        <section className="mt-14 md:mt-20">
          <SectionHead
            tag="FARE BRACKETS"
            title="مصفوفة أجور المترو المعتمدة"
            desc="الأسعار المعتمدة بالخادم — أي تعديل إداري ينعكس هنا فوراً."
          />

          <div className="mt-7 overflow-hidden rounded-3xl border border-bone">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-start">
                <thead>
                  <tr className="bg-mist text-[11.5px] font-bold text-slateink">
                    <th className="px-5 py-3.5 text-start font-bold">الشريحة</th>
                    <th className="px-5 py-3.5 text-start font-bold">الأجرة للرحلة الواحدة</th>
                    <th className="px-5 py-3.5 text-start font-bold">حالة الاعتماد</th>
                  </tr>
                </thead>
                <tbody>
                  {metroFares.map((f: any, i: number) => {
                    const active = bracketIndex === i;
                    const real = f.data_status === "real" || f.data_status === "verified";
                    return (
                      <tr
                        key={f.id ?? i}
                        className={cn(
                          "settle-fast border-t border-bone transition-colors",
                          active ? "bg-interactive/[0.07]" : "bg-white hover:bg-mist/60"
                        )}
                      >
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "num flex size-7 items-center justify-center rounded-full text-[11px] font-bold",
                                active ? "bg-interactive text-white" : "bg-mist text-carbon border border-bone"
                              )}
                            >
                              {i + 1}
                            </span>
                            <span className={cn("text-[13.5px] font-bold", active ? "text-interactive" : "text-ink")}>
                              {f.label || `شريحة ${i + 1}`}
                            </span>
                            {active ? (
                              <span className="rounded-full bg-interactive px-2 py-0.5 text-[10px] font-bold text-white">
                                شريحتك
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("num text-[17px] font-extrabold", active ? "text-interactive" : "text-onyx")}>
                            {Number(f.amount).toFixed(2)}
                          </span>
                          <span className="ms-1 text-[11px] font-bold text-ash">ج.م</span>
                        </td>
                        <td className="px-5 py-4">
                          {real ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                              رسمي معتمد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-brt/30 bg-brt/10 px-2 py-0.5 text-[10.5px] font-bold text-brt">
                              تقديرية — بانتظار التوثيق
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-14 md:mt-20" aria-label="مصفوفة الأجور">
          <div className="rounded-3xl border border-dashed border-bone bg-white px-6 py-10 text-center">
            <p className="text-[13.5px] font-bold text-ink">لا توجد أسعار معتمدة بالخادم حالياً</p>
            <p className="mt-1 text-[12px] text-slateink">لن تُعرض أي أسعار غير موثقة — حاول لاحقاً.</p>
          </div>
        </section>
      )}

      {/* ------------------------------ Smart pass ---------------------------- */}
      <section className="mt-14 md:mt-20">
        <SectionHead
          tag="WASEL SMART PASS"
          title="كارت واصل الذكي وإصدار التذاكر"
          desc="عبور لاتلامسي برمز ديناميكي يُحدَّث دورياً — رصيد واحد وتذاكر QR فورية لكل وسائل الشبكة."
        />
        <div className="mt-7">
          <SmartPassCard
            calculatedOrigin={fromStation?.nameAr}
            calculatedDest={toStation?.nameAr}
            calculatedFare={fare ?? undefined}
          />
        </div>
      </section>

      {/* Subscription products have no backend source — hidden entirely
          rather than showing invented prices. */}

      {/* ---------------------------- Payment rails --------------------------- */}
      <section className="mt-14 md:mt-20">
        <div className="card-mist rounded-3xl p-6 md:p-7">
          <h3 className="font-head text-[16px] font-black text-ink">وسائل الدفع المعتمدة</h3>
          <p className="mt-1 text-[12.5px] font-medium text-slateink">
            كل القنوات الرسمية لشحن كارت واصل وشراء الاشتراكات.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {PAYMENT_METHODS.map((m, i) => {
              const icons = [Wallet, CreditCard, Banknote];
              const Icon = icons[i] ?? Wallet;
              return (
                <div
                  key={m.id}
                  className="settle-fast flex items-center gap-3.5 rounded-2xl border border-bone bg-white p-4 hover:border-cloud"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-bone bg-mist text-ink">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-ink">{m.labelAr}</span>
                    <span className="mono-tag mt-1 block !text-[9px]">{m.meta}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </ScreenShell>
  );
}
