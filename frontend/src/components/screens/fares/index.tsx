"use client";

/**
 * SCREEN: fares — الأجور الرسمية والاشتراكات
 * Official Oct-2024 fare matrix + station-count calculator + Wasel smart
 * pass + subscription passes + payment rails.
 */

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  ArrowLeftRight,
  Clock,
  Calculator,
  GraduationCap,
  BadgePercent,
  CircleCheck,
  Wallet,
  CreditCard,
  Banknote,
  Ticket,
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
import { LINES, METRO_FARE_TIERS, formatEGP } from "@/lib/transit-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  FARE_TIERS,
  FARE_STATIONS,
  PASS_PRODUCTS,
  PAYMENT_METHODS,
  stationsBetween,
  tierForStations,
  rideMinutes,
  type FareStation,
} from "./data";
import { SmartPassCard } from "./pass-card";

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

function FareResult({ stations }: { stations: number | null }) {
  const tier = stations !== null ? tierForStations(stations) : null;
  return (
    <div className="settle-fast rounded-3xl border border-bone bg-mist p-6 md:p-7">
      {stations === null || tier === null ? (
        <div className="flex min-h-[132px] flex-col items-center justify-center gap-2 text-center">
          <Calculator className="size-6 text-fog" aria-hidden="true" />
          <p className="text-[13.5px] font-medium text-slateink">
            اختر محطتي الانطلاق والوصول لحساب الأجرة
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-[11.5px] font-bold text-slateink">الأجرة المستحقة</p>
            <p className="num mt-1 text-[46px] font-extrabold leading-none tracking-tight text-onyx md:text-[56px]">
              {tier.fare.toFixed(2)}
              <span className="ms-2 align-middle text-[15px] font-bold text-ash">EGP</span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-2.5 sm:items-end">
            <StatusPill tone="info">
              <MapPin aria-hidden="true" />
              <span className="num">{stations}</span> محطة مقطوعة
            </StatusPill>
            <span className="text-[12.5px] font-medium text-slateink">{tier.labelAr}</span>
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
  const { toast } = useToast();

  const stations = useMemo(() => stationsBetween(fromId, toId), [fromId, toId]);
  const activeTierId = stations !== null ? tierForStations(stations).id : null;

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const reset = () => {
    setFromId(DEFAULT_FROM);
    setToId(DEFAULT_TO);
  };

  const subscribe = (nameAr: string, price: number) => {
    toast({
      title: `تم اختيار ${nameAr}`,
      description: `القيمة ${price} ج.م — أكمل الدفع من كارت واصل أو المحفظة الإلكترونية.`,
    });
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
            مصدر: مصلحة أنفاق القاهرة الكبرى — مصفوفة أكتوبر 2024
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
            <FareResult stations={stations} />
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-5 text-ash">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            الحساب يعتمد على أقصر مسار بين المحطتين مع احتساب التبادل بين الخطوط — تسعيرة أكتوبر
            2024 الرسمية المعتمدة.
          </p>
        </div>
      </section>

      {/* --------------------------- Official matrix -------------------------- */}
      <section className="mt-14 md:mt-20">
        <SectionHead
          tag="FARE BRACKETS"
          title="مصفوفة أجور المترو الرسمية"
          desc="أربع شرائح مسافة تغطي كل خطوط المترو الثلاثة — تُخصم الأجرة تلقائياً عند العبور بكارت واصل."
        />

        <div className="mt-7 overflow-hidden rounded-3xl border border-bone">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-start">
              <thead>
                <tr className="bg-mist text-[11.5px] font-bold text-slateink">
                  <th className="px-5 py-3.5 text-start font-bold">شريحة المحطات</th>
                  <th className="px-5 py-3.5 text-start font-bold">الأجرة للرحلة الواحدة</th>
                  <th className="px-5 py-3.5 text-start font-bold">نطاق الاستخدام</th>
                </tr>
              </thead>
              <tbody>
                {FARE_TIERS.map((t, i) => {
                  const active = t.id === activeTierId;
                  return (
                    <tr
                      key={t.id}
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
                          <span className="flex flex-col">
                            <span className={cn("text-[13.5px] font-bold", active ? "text-interactive" : "text-ink")}>
                              {t.labelAr}
                            </span>
                            <span className="num text-[10.5px] font-medium text-ash">
                              {METRO_FARE_TIERS[i].stations} stations
                            </span>
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
                          {t.fare.toFixed(2)}
                        </span>
                        <span className="ms-1 text-[11px] font-bold text-ash">ج.م</span>
                      </td>
                      <td className="px-5 py-4 text-[12.5px] font-medium text-slateink">{t.scopeAr}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-bone bg-mist/70">
                  <td colSpan={3} className="px-5 py-3.5">
                    <span className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] font-medium text-slateink">
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="size-3.5 text-brand" aria-hidden="true" />
                        طلاب المدارس والجامعات: خصم 50% على الاشتراكات
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BadgePercent className="size-3.5 text-emerald" aria-hidden="true" />
                        ذوو الهمم: إعفاء مجاني وفق السياسات الرسمية
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Ticket className="size-3.5 text-ash" aria-hidden="true" />
                        LRT والمونوريل: تعريفة مناطق مستقلة عن مصفوفة المترو
                      </span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------ Smart pass ---------------------------- */}
      <section className="mt-14 md:mt-20">
        <SectionHead
          tag="WASEL SMART PASS"
          title="كارت واصل الذكي"
          desc="عبور لاتلامسي برمز ديناميكي يُحدَّث دورياً — رصيد واحد لكل وسائل الشبكة."
        />
        <div className="mt-7">
          <SmartPassCard />
        </div>
      </section>

      {/* ----------------------------- Passes grid ---------------------------- */}
      <section className="mt-14 md:mt-20">
        <SectionHead
          tag="SUBSCRIPTIONS"
          title="الاشتراكات والبطاقات الدورية"
          desc="اشتراك بلا حدود بين المحطات أرخص من تذكرة لكل رحلة — اختر ما يناسب إيقاع يومك."
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PASS_PRODUCTS.map((p) => (
            <article key={p.id} className="card-flat settle-fast relative flex flex-col rounded-3xl p-6 hover:border-cloud">
              {p.badgeAr ? (
                <span className="absolute end-5 top-5 rounded-full bg-brand/10 px-2.5 py-1 text-[10.5px] font-bold text-brand">
                  {p.badgeAr}
                </span>
              ) : null}
              <h3 className="font-head text-[16px] font-black text-ink">{p.nameAr}</h3>
              <p className="mt-1 text-[11.5px] font-medium text-ash">{p.periodAr}</p>
              <p className="num mt-4 text-[34px] font-extrabold leading-none tracking-tight text-onyx">
                {p.price}
                <span className="ms-1.5 align-middle text-[12px] font-bold text-ash">ج.م</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {p.perksAr.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-[12.5px] leading-6 text-carbon">
                    <CircleCheck className="mt-1 size-3.5 shrink-0 text-emerald" aria-hidden="true" />
                    {perk}
                  </li>
                ))}
              </ul>
              <PillButton
                variant={p.id === "monthly" ? "dark" : "mist"}
                className="mt-5 w-full"
                onClick={() => subscribe(p.nameAr, p.price)}
              >
                اشترِ الآن
              </PillButton>
            </article>
          ))}
        </div>
      </section>

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
