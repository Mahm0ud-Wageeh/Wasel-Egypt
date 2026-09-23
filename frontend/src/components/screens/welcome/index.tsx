"use client";

/**
 * Wasel Egypt — Welcome / public landing screen.
 * Full standalone page: own announcement bar, top bar, hero,
 * verified metrics count-up, interactive Cairo map teaser,
 * modes row, partner wordmarks and own rich footer.
 * Global shell header/footer/tab-bar are hidden for this screen.
 */

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LineBadge, ModeIcon, PillButton, SectionHead, WaselLogo, WaselLogoMark } from "@/components/kit";
import { LINES } from "@/lib/transit-data";
import type { ScreenProps } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  FOOTER_COLS,
  HERO_POINTS,
  MODE_CARDS,
  NETWORK_METRICS,
  PARTNERS,
  QUICK_DESTINATIONS,
} from "./data";
import { MapTeaser } from "./map-teaser";
import { HeroPreview } from "./hero-preview";
import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";

/* ------------------------------ count-up hook ----------------------------- */

function useCountUp(target: number, active: boolean, duration = 1400): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

const TOP_LINKS: { label: string; screen: "map" | "metro" | "fares" | "community" }[] = [
  { label: "الخطوط", screen: "metro" },
  { label: "الخريطة", screen: "map" },
  { label: "الأجور", screen: "fares" },
  { label: "المجتمع", screen: "community" },
];

/* ================================= SCREEN ================================= */

export default function WelcomeScreen({ navigate }: ScreenProps) {
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const metricsInView = useInView(metricsRef, { once: true, margin: "-60px" });
  const [metrics, setMetrics] = useState(NETWORK_METRICS);

  useEffect(() => {
    let cancelled = false;
    apiRequest(endpoints.public.networkStats, { method: "GET", auth: false })
      .then((res) => {
        if (cancelled || !res) return;
        const d = res.data || res;
        if (d.stops || d.routes) {
          setMetrics([
            { to: d.routes || 1018, suffix: "+", caption: "خطوط نقل مسجلة" },
            { to: d.stops || 3041, suffix: "+", caption: "محطة عبر المحافظة" },
            { to: d.variants_with_geometry || 1792, suffix: "", caption: "مسار موثق جغرافياً" },
            { to: d.operators || 15, suffix: "", caption: "هيئة ومشغل نقل" },
          ]);
        }
      })
      .catch(() => {
        /* honest fallback to verified static metrics */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white">
      {/* ------------------------- announcement bar ------------------------- */}
      <div className="bg-onyx text-white">
        <div className="mx-auto flex h-10 w-full max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Megaphone className="size-3.5 shrink-0 text-mint" />
            <p className="truncate text-[12px] font-medium text-white/85">
              <span className="font-bold text-mint">جديد: </span>
              الخط الرابع للمترو بدأ تداوله التجريبي بين الحرام والتجمع الخامس
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("metro")}
            className="settle-fast hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12px] font-bold text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 sm:inline-flex"
          >
            تابع الخط الرابع
            <ChevronLeft className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------ top bar ----------------------------- */}
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="واصل مصر — أعلى الصفحة"
          >
            <WaselLogo />
          </button>
          <nav className="hidden items-center gap-1 md:flex" aria-label="روابط رئيسية">
            {TOP_LINKS.map((link) => (
              <button
                key={link.screen}
                type="button"
                onClick={() => navigate(link.screen)}
                className="settle-fast rounded-full px-3.5 py-2 text-[13px] font-bold text-carbon outline-none hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-interactive/40"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <PillButton variant="ghost" size="sm" onClick={() => navigate("auth")}>
              دخول
            </PillButton>
            <PillButton variant="dark" size="sm" onClick={() => navigate("planner")}>
              ابدأ رحلتك
            </PillButton>
          </div>
        </div>
      </header>

      {/* -------------------------------- hero ------------------------------ */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-plaster/60 to-transparent"
        />
        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 pb-16 pt-12 md:px-6 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24">
          <div className="rise-in">
            <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-bone bg-white px-3.5 py-1.5">
              <Sparkles className="size-3.5 text-brand" />
              <span className="text-[12px] font-bold text-carbon">
                منصة النقل الذكي للقاهرة الكبرى
              </span>
              <span className="mono-tag !text-[9px]">GTFS-RT READY</span>
            </span>

            <h1 className="mt-6 font-head text-[44px] font-black leading-[1.14] text-onyx md:text-[62px] md:leading-[1.1]">
              القاهرة كلها…
              <br />
              <span className="text-brand">في جيبك</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-8 text-slateink md:text-[17px]">
              واصل مصر — مخطط رحلات موحد يجمع المترو والقطار الكهربائي الخفيف
              والمونوريل والحافلات السريعة: مواعيد حية، أجور رسمية، وخريطة
              واحدة لكل وسائل المواصلات.
            </p>

            <ul className="mt-7 space-y-3.5">
              {HERO_POINTS.map((point) => (
                <li key={point.lead} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-interactive/10">
                    <Check className="size-3.5 text-interactive" strokeWidth={3} />
                  </span>
                  <p className="text-[14px] leading-6">
                    <span className="font-bold text-ink">{point.lead}</span>
                    <span className="text-slateink"> — {point.desc}</span>
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <span className="conic-border inline-flex rounded-full">
                <PillButton
                  size="lg"
                  className="rounded-full px-8"
                  onClick={() => navigate("planner")}
                >
                  ابدأ رحلتك الآن
                  <ArrowLeft className="size-4" />
                </PillButton>
              </span>
              <PillButton variant="outline" size="lg" onClick={() => navigate("map")}>
                استكشف الشبكة
              </PillButton>
            </div>

            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-bold text-slateink">وجهات سريعة:</span>
                {QUICK_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.label}
                    type="button"
                    onClick={() => navigate("planner", { to: dest.to })}
                    className="settle-fast inline-flex h-9 items-center gap-1.5 rounded-full border border-bone bg-white px-3.5 text-[12.5px] font-bold text-carbon outline-none hover:border-cloud hover:bg-mist focus-visible:ring-2 focus-visible:ring-interactive/40"
                  >
                    <MapPin className="size-3.5 text-interactive" />
                    {dest.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rise-in [animation-delay:120ms]">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* --------------------------- lines ribbon --------------------------- */}
      <section className="border-y border-bone bg-white" aria-label="خطوط الشبكة الرسمية">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-5 md:justify-between md:px-6">
          <span className="mono-tag hidden md:block">OFFICIAL NETWORK LINES</span>
          {LINES.map((line) => (
            <button
              key={line.id}
              type="button"
              onClick={() => navigate(line.screen)}
              className="group flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
            >
              <LineBadge code={line.code} color={line.color} size="sm" />
              <span className="hidden text-[12px] font-bold text-slateink group-hover:text-ink lg:block">
                {line.nameAr}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* --------------------------- metrics strip -------------------------- */}
      <section className="section-gap" aria-label="أرقام الشبكة">
        <div ref={metricsRef} className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-emerald/10 px-3.5 py-1.5 text-[12px] font-bold text-emerald">
              <ShieldCheck className="size-3.5" />
              بيانات شبكة حقيقية موثقة 100%
            </span>
            <h2 className="font-head text-[26px] font-black leading-[1.25] text-ink md:text-[34px]">
              أرقام شبكة القاهرة الكبرى — محدثة باستمرار
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {metrics.map((metric, index) => (
              <MetricItem
                key={metric.caption}
                metric={metric}
                active={metricsInView}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- map teaser ---------------------------- */}
      <section className="section-gap border-t border-bone" aria-label="معاينة الخريطة">
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          <SectionHead
            tag="LIVE NETWORK MAP"
            title={
              <>
                الشبكة كما تعرفها… <span className="text-brand">وأدق</span>
              </>
            }
            desc="مخطط تفاعلي مبسّط لخطوط النقل في القاهرة الكبرى — مرّر على أي خط لتتابع مساره، أو افتح شاشته الكاملة."
          />
          <div className="card-flat mt-10 grid overflow-hidden rounded-3xl lg:grid-cols-[1fr_320px]">
            <div className="relative bg-mist p-4 md:p-8">
              <MapTeaser
                active={activeLine}
                onActiveChange={setActiveLine}
                onLineSelect={(id) => {
                  const line = LINES.find((l) => l.id === id);
                  if (line) navigate(line.screen);
                }}
              />
              <div className="pointer-events-none absolute bottom-3 start-4">
                <span className="mono-tag !text-[8.5px]">
                  CAIRO TRANSIT SCHEMATIC · NOT TO SCALE
                </span>
              </div>
            </div>
            <aside className="border-t border-bone lg:border-s lg:border-t-0">
              <div className="border-b border-bone px-5 py-4">
                <p className="font-head text-[14px] font-black text-ink">خطوط الشبكة</p>
                <p className="mt-0.5 text-[11.5px] text-ash">
                  اختر خطاً لاستكشاف تفاصيله كاملة
                </p>
              </div>
              <div className="max-h-[380px] overflow-y-auto p-2 lg:max-h-[460px]">
                {LINES.map((line) => (
                  <button
                    key={line.id}
                    type="button"
                    onMouseEnter={() => setActiveLine(line.id)}
                    onMouseLeave={() => setActiveLine(null)}
                    onClick={() => navigate(line.screen)}
                    className={cn(
                      "settle-fast flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-interactive/40",
                      activeLine === line.id ? "bg-mist" : "hover:bg-mist/60"
                    )}
                  >
                    <LineBadge code={line.code} color={line.color} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-carbon">
                      {line.nameAr}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-ash">
                      {line.stationsCount > 0 ? (
                        <>
                          <span className="num">{line.stationsCount}</span> محطة
                        </>
                      ) : (
                        "شبكة وطنية"
                      )}
                    </span>
                    <ChevronLeft className="size-3.5 shrink-0 text-fog" />
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ------------------------------ modes row --------------------------- */}
      <section className="section-gap border-t border-bone" aria-label="وسائل النقل">
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          <SectionHead
            tag="MULTIMODAL"
            title="كل وسيلة نقل… في تطبيق واحد"
            desc="ست شبكات رسمية تعمل تحت سقف واصل — اختر وسيلتك وواصل يتكفل بالباقي من الباب حتى المحطة."
          />
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
            {MODE_CARDS.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => navigate(mode.screen)}
                className="card-flat settle group rounded-2xl p-4 text-start outline-none hover:-translate-y-0.5 hover:border-cloud focus-visible:ring-2 focus-visible:ring-interactive/40"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${mode.color}14`, color: mode.color }}
                >
                  <ModeIcon mode={mode.icon} className="size-5" />
                </span>
                <span className="mt-3.5 flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: mode.color }}
                  />
                  <span className="font-head text-[15px] font-black text-ink">
                    {mode.label}
                  </span>
                </span>
                <span className="mt-1.5 block text-[11.5px] leading-5 text-slateink">
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- partner strip -------------------------- */}
      <section className="border-t border-bone py-14" aria-label="جهات رسمية">
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          <p className="mono-tag mb-9 text-center">IN PARTNERSHIP WITH THE AUTHORITIES</p>
          <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
            {PARTNERS.map((partner) => (
              <div key={partner.nameEn} className="text-center">
                <p className="font-head text-[16px] font-black text-carbon md:text-[17px]">
                  {partner.nameAr}
                </p>
                <p className="mono-tag mt-1.5">{partner.nameEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ own footer --------------------------- */}
      <footer className="dark-panel pb-[max(env(safe-area-inset-bottom),28px)]">
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-16 md:px-6 md:pt-20">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <h2 className="max-w-2xl font-head text-[30px] font-black leading-[1.3] text-white md:text-[42px]">
              القاهرة الكبرى تتحرك…
              <br />
              <span className="text-mint">وواصل معها</span> في كل محطة.
            </h2>
            <PillButton
              size="lg"
              className="bg-white text-ink hover:bg-mist"
              onClick={() => navigate("planner")}
            >
              ابدأ رحلتك الآن
              <ArrowLeft className="size-4" />
            </PillButton>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/10 pt-12 md:grid-cols-3 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <WaselLogoMark />
                <div>
                  <p className="font-head text-[16px] font-black text-white">واصل مصر</p>
                  <p className="mono-tag mt-1 !text-[9px] !text-white/50">WASEL EGYPT</p>
                </div>
              </div>
              <p className="mt-5 max-w-xs text-[12.5px] leading-6 text-white/55">
                منصة النقل العام متعدد الوسائط للقاهرة الكبرى — من حلوان إلى
                العاصمة الإدارية، رحلة واحدة واضحة في كل مرة.
              </p>
            </div>
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <p className="text-[13.5px] font-black text-white">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        onClick={() => navigate(link.screen)}
                        className="settle-fast text-start text-[12.5px] text-white/55 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-8 md:flex-row">
            <p className="text-[11.5px] text-white/50">
              © <span className="num">2025</span> واصل مصر — كل تفاصيل رحلتك في مكان واحد
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="mono-tag !text-white/50 rounded-full border border-white/15 px-2.5 py-1">
                GTFS-RT READY
              </span>
              <span className="mono-tag !text-white/50 rounded-full border border-white/15 px-2.5 py-1">
                OSM DATA
              </span>
              <span className="mono-tag !text-white/50 rounded-full border border-white/15 px-2.5 py-1">
                OFFICIAL FARES
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------ metric item ------------------------------- */

function MetricItem({
  metric,
  active,
  index,
}: {
  metric: { to: number; suffix: string; caption: string };
  active: boolean;
  index: number;
}) {
  const value = useCountUp(metric.to, active);
  return (
    <div
      className="rise-in text-center md:text-start"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="num font-latin text-[44px] font-extrabold leading-none tracking-tight text-onyx md:text-[62px]">
        {value}
        <span className="text-fog">{metric.suffix}</span>
      </div>
      <div className="mt-2.5 text-[13px] font-medium text-ash">{metric.caption}</div>
    </div>
  );
}
