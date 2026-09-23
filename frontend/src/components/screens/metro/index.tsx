"use client";

/**
 * Screen: metro network (spec 09 — Cairo Metro Lines 1-4).
 * Schematic tube diagrams, real station sequences, transfer
 * interchange hubs, service window/headways and alerts.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  Coins,
  Gauge,
  LayoutGrid,
  TrainFront,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import { LineBadge, PillButton, ScreenShell, SectionHead, Stat, StatusPill } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { LINE_STATUS_LABEL, seeded } from "@/lib/transit-data";
import {
  INTERCHANGES,
  L1_STATIONS,
  L2_STATIONS,
  L3_STATIONS,
} from "@/components/screens/planner/stations-data";

/* --------------------------- metro line registry -------------------------- */

interface MetroLine {
  code: string;
  nameAr: string;
  color: string;
  stations: string[];
  /** terminal pair + mid landmark for the diagram */
  openedAr: string;
  lengthKm: number;
  headwayPeak: number;
  headwayOff: number;
  dailyRidersM: number;
  status: "normal" | "busy" | "maintenance";
  noteAr: string;
}

const METRO_LINES: MetroLine[] = [
  {
    code: "L1",
    nameAr: "الخط الأول — المرج ↔ حلوان",
    color: "#1d4ed8",
    stations: L1_STATIONS,
    openedAr: "1987 — أول مترو في أفريقيا والشرق الأوسط",
    lengthKm: 44.3,
    headwayPeak: 3,
    headwayOff: 6,
    dailyRidersM: 1.9,
    status: "normal",
    noteAr: "أطول خطوط الشبكة ويعبر القاهرة من الشمال للجنوب شرق النيل.",
  },
  {
    code: "L2",
    nameAr: "الخط الثاني — شبرا الخيمة ↔ المنيب",
    color: "#dc2626",
    stations: L2_STATIONS,
    openedAr: "1996 — أول خط يعبر نهر النيل تحت الأرض",
    lengthKm: 21.6,
    headwayPeak: 4,
    headwayOff: 7,
    dailyRidersM: 1.5,
    status: "busy",
    noteAr: "يربط الجيزة بغرب ووسط القاهرة ويخدم جامعة القاهرة والأوبرا.",
  },
  {
    code: "L3",
    nameAr: "الخط الثالث — عدلي منصور ↔ جامعة القاهرة",
    color: "#16a34a",
    stations: L3_STATIONS,
    openedAr: "2012 — أحدث خطوط الشبكة وامتدادها الغربي",
    lengthKm: 41.2,
    headwayPeak: 4,
    headwayOff: 8,
    dailyRidersM: 1.1,
    status: "normal",
    noteAr: "يخدم مطار العاصمة القديم ومصر الجديدة ويصل العاصمة الإدارية عبر LRT.",
  },
  {
    code: "L4",
    nameAr: "الخط الرابع — الحرام ↔ التجمع",
    color: "#ea580c",
    stations: [],
    openedAr: "قيد التنفيذ — المرحلة الأولى حرّك الرصيف حتى الحرام",
    lengthKm: 16.5,
    headwayPeak: 0,
    headwayOff: 0,
    dailyRidersM: 0,
    status: "maintenance",
    noteAr: "سيربط الهرام والجيزة بالتجمع الخامس ومدينة العاصمة الإدارية مستقبلاً.",
  },
];

/** fare bands per station count (official Oct-2024) */
const FARE_BANDS_AR = [
  "1 – 9 محطات: 8 ج.م",
  "10 – 16 محطة: 10 ج.م",
  "17 – 23 محطة: 15 ج.م",
  "24 محطة وأكثر: 20 ج.م",
];

/* ------------------------------ tube diagram ------------------------------ */

function TubeDiagram({ line }: { line: MetroLine }) {
  // L4 under construction — schematic placeholder band instead of stations
  if (line.stations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cloud bg-mist px-6 py-10 text-center">
        <Wrench className="mx-auto size-6 text-brt" />
        <p className="mt-3 font-head text-[15px] font-black text-ink">
          الخط الرابع قيد الإنشاء — لا يوجد مخطط محطات نهائي بعد
        </p>
        <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-6 text-slateink">{line.noteAr}</p>
      </div>
    );
  }

  const n = line.stations.length;
  const W = Math.max(760, n * 34);
  const H = 150;
  const padX = 30;
  const step = (W - padX * 2) / (n - 1);
  const y = 75;

  return (
    <div dir="ltr" className="no-scrollbar overflow-x-auto rounded-2xl border border-bone bg-white p-2">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`مخطط ${line.nameAr}`}>
        {/* trunk */}
        <line x1={padX} y1={y} x2={W - padX} y2={y} stroke={line.color} strokeWidth={7} strokeLinecap="round" />
        {/* stations */}
        {line.stations.map((s, i) => {
          const x = padX + i * step;
          const isInterchange = INTERCHANGES.includes(s);
          const isTerminal = i === 0 || i === n - 1;
          const above = i % 2 === 0;
          return (
            <g key={`${s}-${i}`}>
              {isInterchange ? (
                <>
                  <circle cx={x} cy={y} r={8} fill="#ffffff" stroke={line.color} strokeWidth={3} />
                  <circle cx={x} cy={y} r={3} fill="#202020" />
                </>
              ) : (
                <circle cx={x} cy={y} r={isTerminal ? 6 : 4.5} fill={isTerminal ? line.color : "#ffffff"} stroke={line.color} strokeWidth={isTerminal ? 0 : 2.5} />
              )}
              <text
                x={x}
                y={above ? y - 22 : y + 26}
                textAnchor="middle"
                fontSize={11.5}
                fontWeight={isInterchange || isTerminal ? 800 : 600}
                fill={isInterchange || isTerminal ? "#202020" : "#646464"}
                fontFamily="Cairo, sans-serif"
              >
                {s}
              </text>
              {/* interchange tick connecting label to node */}
              {isInterchange ? (
                <line
                  x1={x}
                  y1={above ? y - 12 : y + 12}
                  x2={x}
                  y2={above ? y - 8 : y + 8}
                  stroke="#d4d4d4"
                  strokeWidth={1.5}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* --------------------------------- screen --------------------------------- */

export default function MetroScreen({ navigate }: ScreenProps) {
  const [activeCode, setActiveCode] = useState("L1");
  const active = METRO_LINES.find((l) => l.code === activeCode) ?? METRO_LINES[0];

  const lineAlerts = useMemo(
    () =>
      [
        {
          code: "L2",
          tone: "delay" as const,
          icon: TriangleAlert,
          title: "ازدحام مرتفع بين السادات والعتبة",
          body: "متوسط الانتظار زاد 4 دقائق في الاتجاهين حتى نهاية الذروة المسائية.",
        },
        {
          code: "L4",
          tone: "closed" as const,
          icon: Wrench,
          title: "أعمال إنشاء المرحلة الأولى جارية",
          body: "المحطات بين محور حرّك الرصيف والحرام تحت التجهيز — الافتتاح المرحلي قريباً.",
        },
        {
          code: "L1",
          tone: "ontime" as const,
          icon: Clock,
          title: "تداول طبيعي على كامل الخط",
          body: "الرؤوس الآلية تعمل وفق الجدول — لا إشعارات صيانة هذا الأسبوع.",
        },
      ].filter((a) => a.code === activeCode || activeCode === "L1"),
    [activeCode]
  );

  return (
    <ScreenShell className="pb-28 pt-6 md:pt-10">
      <SectionHead
        tag="CAIRO METRO NETWORK"
        title="شبكة مترو القاهرة الكبرى"
        desc="أول شبكة مترو أنفاق في أفريقيا — أربعة خطوط تخدم أكثر من 4 ملايين راكب يومياً عبر 100+ محطة عاملة."
      />

      {/* verified stats strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card-flat p-4 md:p-5">
          <Stat value="4" label="خطوط عاملة وقيد التنفيذ" />
        </div>
        <div className="card-flat p-4 md:p-5">
          <Stat value="100+" label="محطة عاملة" />
        </div>
        <div className="card-flat p-4 md:p-5">
          <Stat value="1987" label="أول تشغيل في أفريقيا" />
        </div>
        <div className="card-flat p-4 md:p-5">
          <Stat value="+4M" label="راكب يومياً" tone="brand" />
        </div>
      </div>

      {/* line selector */}
      <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist" aria-label="اختيار الخط">
        {METRO_LINES.map((l) => (
          <button
            key={l.code}
            role="tab"
            aria-selected={activeCode === l.code}
            onClick={() => setActiveCode(l.code)}
            className={cn(
              "settle-fast inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-interactive/40",
              activeCode === l.code
                ? "text-white shadow-[0_8px_20px_-6px_rgba(9,12,29,0.35)]"
                : "border border-bone bg-white text-carbon hover:bg-mist"
            )}
            style={activeCode === l.code ? { backgroundColor: l.color } : undefined}
          >
            <span className="num font-mono">{l.code}</span>
            {l.code === "L1" ? "المرج ↔ حلوان" : l.code === "L2" ? "شبرا ↔ المنيب" : l.code === "L3" ? "عدلي منصور ↔ الجيزة" : "الحرام ↔ التجمع"}
          </button>
        ))}
      </div>

      {/* active line panel */}
      <section className="mt-5" aria-label={active.nameAr}>
        <div
          className="rounded-3xl border p-5 md:p-7"
          style={{ borderColor: `${active.color}30`, backgroundColor: `${active.color}08` }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <LineBadge code={active.code} color={active.color} size="lg" />
                <StatusPill tone={active.status === "normal" ? "ontime" : active.status === "busy" ? "delay" : "closed"}>
                  {LINE_STATUS_LABEL[active.status]}
                </StatusPill>
              </div>
              <h2 className="mt-3 font-head text-[22px] font-black leading-tight text-ink md:text-[26px]">
                {active.nameAr}
              </h2>
              <p className="mt-1.5 text-[12.5px] font-semibold text-slateink">{active.openedAr}</p>
              <p className="mt-2 max-w-xl text-[13px] leading-6 text-carbon">{active.noteAr}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              <div className="text-center">
                <div className="num text-[24px] font-extrabold text-onyx">{active.lengthKm}</div>
                <div className="mono-tag mt-1">KM</div>
              </div>
              <div className="text-center">
                <div className="num text-[24px] font-extrabold text-onyx">
                  {active.stations.length > 0 ? active.stations.length : "—"}
                </div>
                <div className="mono-tag mt-1">STATIONS</div>
              </div>
              <div className="text-center">
                <div className="num text-[24px] font-extrabold text-onyx">
                  {active.headwayPeak > 0 ? `~${active.headwayPeak}` : "—"}
                </div>
                <div className="mono-tag mt-1">PEAK MIN</div>
              </div>
              <div className="text-center">
                <div className="num text-[24px] font-extrabold text-onyx">
                  {active.dailyRidersM > 0 ? `${active.dailyRidersM}M` : "—"}
                </div>
                <div className="mono-tag mt-1">DAILY</div>
              </div>
            </div>
          </div>
        </div>

        {/* tube diagram */}
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <LayoutGrid className="size-4 text-ash" />
            <h3 className="font-head text-[15px] font-black text-ink">المخطط الشبكي للخط</h3>
            <span className="mono-tag ms-auto hidden sm:block">SCHEMATIC · NOT TO SCALE</span>
          </div>
          <TubeDiagram line={active} />
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ash">
            <span className="inline-block size-2.5 rounded-full border-2 border-current" />
            الحلقة المزدوجة = محطة تبديل مع خط آخر — اسحب أفقيًا لعرض كل المحطات.
          </p>
        </div>

        {/* stations grid */}
        {active.stations.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-3 font-head text-[15px] font-black text-ink">
              محطات الخط — <span className="num text-ash">{active.stations.length}</span> محطة
            </h3>
            <ol className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {active.stations.map((s, i) => {
                const interchange = INTERCHANGES.includes(s);
                return (
                  <li
                    key={`${s}-${i}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold",
                      interchange ? "bg-brand/[0.05] text-ink ring-1 ring-brand/15" : "text-carbon"
                    )}
                  >
                    <span className="num w-6 shrink-0 text-end text-[10px] font-bold text-fog">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: interchange ? "#6647f0" : active.color }}
                    />
                    <span className="truncate">{s}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* service + fare bands */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="card-mist p-5">
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="size-4 text-ash" />
              <h3 className="font-head text-[14px] font-black text-ink">الخدمة والتردد</h3>
            </div>
            <ul className="space-y-2 text-[12.5px] font-semibold text-carbon">
              <li className="flex items-center justify-between">
                <span>ساعات العمل</span>
                <span className="num text-ink">06:00 – 00:30</span>
              </li>
              <li className="flex items-center justify-between">
                <span>تردد الذروة</span>
                <span className="num text-ink">{active.headwayPeak > 0 ? `كل ${active.headwayPeak} دقائق` : "يُعلن عند الافتتاح"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>تردد ما بعد الذروة</span>
                <span className="num text-ink">{active.headwayOff > 0 ? `كل ${active.headwayOff} دقائق` : "—"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>طاقة استيعابية/قطار</span>
                <span className="num text-ink">1,200 راكب</span>
              </li>
            </ul>
          </div>
          <div className="card-mist p-5">
            <div className="mb-3 flex items-center gap-2">
              <Coins className="size-4 text-ash" />
              <h3 className="font-head text-[14px] font-black text-ink">شرائح الأجرة الرسمية</h3>
            </div>
            <ul className="space-y-2 text-[12.5px] font-semibold text-carbon">
              {FARE_BANDS_AR.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: active.color }} />
                  {b}
                </li>
              ))}
            </ul>
            <PillButton variant="mist" size="sm" className="mt-4" onClick={() => navigate("fares")}>
              حاسبة الأجرة الكاملة
              <ArrowLeft className="size-3.5" />
            </PillButton>
          </div>
        </div>
      </section>

      {/* transfer hubs */}
      <section className="mt-10">
        <SectionHead
          tag="INTERCHANGE HUBS"
          title="محطات التبديل الرئيسية"
          desc="نقاط الالتقاء بين الخطوط — اعبر من رصيف لآخر خلال دقائق دون مغادرة البوابة."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { at: "السادات", lines: ["L1", "L2"], note: "أكبر محطة تبديل — تخدم ميدان التحرير والمتحف المصري." },
            { at: "الشهداء", lines: ["L1", "L2"], note: "تبديل شمالي يخدم شارع الترعة وحي شبرا." },
            { at: "جمال عبد الناصر", lines: ["L1", "L3"], note: "تربط وسط البلد بمصر الجديدة وشرق القاهرة." },
            { at: "العتبة", lines: ["L2", "L3"], note: "قلب التجاري القديم — قريب من خان الخليلي." },
            { at: "جامعة القاهرة", lines: ["L2", "L3"], note: "تخدم الجامعة والجيزة غرب النيل." },
            { at: "عدلي منصور", lines: ["L3", "LRT"], note: "بوابة شرق الدلتا — تبديل لقطار العاصمة الخفيف." },
          ].map((h) => (
            <div key={h.at} className="card-flat settle-fast p-4 hover:border-cloud">
              <div className="flex items-center gap-2">
                <TrainFront className="size-4 text-ash" />
                <h3 className="font-head text-[15px] font-black text-ink">{h.at}</h3>
              </div>
              <div className="mt-2.5 flex gap-1.5">
                {h.lines.map((c, i) => {
                  const line = METRO_LINES.find((l) => l.code === c) ?? METRO_LINES[0];
                  return <LineBadge key={`${c}-${i}`} code={c} color={line.color} size="sm" />;
                })}
              </div>
              <p className="mt-2.5 text-[11.5px] leading-5 text-slateink">{h.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* alerts */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <TriangleAlert className="size-4 text-brt" />
          <h2 className="font-head text-[17px] font-black text-ink">تنبيهات الخدمة</h2>
        </div>
        <ul className="space-y-2.5">
          {lineAlerts.map((a) => (
            <li key={a.title} className="card-flat flex items-start gap-3 p-4">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  a.tone === "ontime" && "bg-emerald/10 text-emerald",
                  a.tone === "delay" && "bg-l2/10 text-l2",
                  a.tone === "closed" && "bg-mercury text-slateink"
                )}
              >
                <a.icon className="size-4" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13.5px] font-black text-ink">{a.title}</h3>
                  <LineBadge
                    code={a.code}
                    color={METRO_LINES.find((l) => l.code === a.code)?.color ?? "#64748b"}
                    size="sm"
                  />
                </div>
                <p className="mt-1 text-[12px] leading-5 text-slateink">{a.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="dark-panel mt-10 flex flex-col items-center gap-4 rounded-3xl px-6 py-12 text-center">
        <Users className="size-7 text-white/70" />
        <h2 className="max-w-lg font-head text-[24px] font-black leading-snug text-white md:text-[30px]">
          جاهز لركوب المترو؟ احسب أجرتك ومسارك خلال ثوانٍ
        </h2>
        <p className="max-w-md text-[13px] leading-6 text-white/60">
          محرك التخطيط يرتب أسرع وأوفر المسارات عبر الخطوط الأربعة مع أوقات الانتظار الحية.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5">
          <PillButton size="lg" onClick={() => navigate("planner")}>
            خطط رحلتك عبر المترو
          </PillButton>
          <PillButton
            size="lg"
            variant="outline"
            className="!border-white/25 !text-white hover:!bg-white/10"
            onClick={() => navigate("map")}
          >
            شاهد الشبكة على الخريطة
          </PillButton>
        </div>
      </section>
    </ScreenShell>
  );
}
