"use client";

/**
 * Wasel Egypt — Monorail screen (Task 3-d).
 * المونوريل المعلق — خط شرق النيل (العاصمة الإدارية) وخط غرب النيل (6 أكتوبر).
 * Spec: 11_MONORAIL_NETWORK.md — elevated driverless straddle monorail.
 */

import { useState } from "react";
import {
  Building2,
  CableCar,
  Sparkles,
  Snowflake,
  Waypoints,
  Wifi,
} from "lucide-react";
import { FilterChip } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import {
  AlertsBand,
  FactsBand,
  IntegrationBand,
  NetworkCTA,
  NetworkHero,
  NetworkSection,
  RouteDiagram,
  StationGrid,
  type DiagramInterchange,
  type HeroStat,
  type IntegrationPoint,
  type NetworkAlert,
  type NetworkFact,
  type NetworkStop,
} from "@/components/screens/_network/network-parts";

const MNR = "#7c3aed";

/* --------------------------- Interchange tokens -------------------------- */

const IC_L3: DiagramInterchange = {
  code: "L3",
  color: "#16a34a",
  screen: "metro",
  label: "تبادل مع مترو الخط الثالث",
};
const IC_LRT: DiagramInterchange = {
  code: "LRT",
  color: "#0284c7",
  screen: "lrt",
  label: "تبادل مع القطار الكهربائي الخفيف",
};

/* ------------------------------ Station data ----------------------------- */
/* Named anchors from the official spec; unnamed ticks are intermediate
   elevated stations shown schematically (schematic convention).            */

const EAST_LINE: NetworkStop[] = [
  {
    name: "محور محمد نجيب",
    sub: "MOHAMED NAGIB AXIS",
    terminal: "start",
    interchanges: [IC_L3],
    note: "ستاد النزهة — تبادل مباشر مع منصات مترو الخط الثالث",
    facilities: ["parking", "feeder", "access"],
  },
  {},
  {},
  {},
  {},
  { name: "مستشفى القوات الجوية", sub: "AIR FORCE HOSPITAL", facilities: ["feeder"] },
  {},
  {},
  {},
  { name: "القاهرة للمال والأعمال", sub: "CFC", tag: "منطقة أعمال", facilities: ["feeder", "access"] },
  {},
  {},
  {},
  {},
  { name: "التجمع الخامس", sub: "5TH SETTLEMENT", facilities: ["parking", "feeder"] },
  {},
  {},
  { name: "الحي الحكومي", sub: "GOVERNMENT DISTRICT", facilities: ["parking"] },
  {},
  {},
  {
    name: "مدينة الفنون والثقافة",
    sub: "ARTS & CULTURE CITY",
    terminal: "end",
    interchanges: [IC_LRT],
    note: "قلب العاصمة الإدارية — تبادل مع القطار الكهربائي الخفيف",
    facilities: ["parking", "access"],
  },
];

const WEST_LINE: NetworkStop[] = [
  {
    name: "وادي النيل",
    sub: "WADI EL-NILE",
    terminal: "start",
    interchanges: [IC_L3],
    note: "المهندسين — بوابة الخط الغربي وتبادل مترو الخط الثالث",
    facilities: ["parking", "feeder", "access"],
  },
  {},
  {},
  { name: "محور 26 يوليو", sub: "26 JULY CORRIDOR", facilities: ["feeder"] },
  {},
  { name: "هايبر ون", sub: "HYPER ONE", facilities: ["parking"] },
  {},
  { name: "الشيخ زايد", sub: "SHEIKH ZAYED", facilities: ["parking", "feeder"] },
  {},
  {},
  { name: "مول مصر", sub: "MALL OF EGYPT", tag: "وجهات تسوق", facilities: ["parking", "access"] },
  {},
  {
    name: "المنطقة الصناعية بأكتوبر",
    sub: "OCTOBER INDUSTRIAL ZONE",
    terminal: "end",
    note: "يخدم المصانع والمجتمعات الصناعية بمدينة 6 أكتوبر",
    facilities: ["parking", "feeder"],
  },
];

/* ------------------------------- Sector meta ----------------------------- */

type Sector = "east" | "west";

const SECTOR_META: Record<
  Sector,
  { label: string; stops: NetworkStop[]; stats: HeroStat[]; boardNote: string }
> = {
  east: {
    label: "خط شرق النيل — العاصمة الإدارية",
    stops: EAST_LINE,
    stats: [
      { value: "22", label: "محطة معلقة" },
      { value: "56.5", unit: "كم", label: "طول المحور" },
      { value: "80", unit: "كم/س", label: "أقصى سرعة تشغيل" },
      { value: "~55", unit: "دقيقة", label: "زمن الرحلة الكاملة" },
    ],
    boardNote: "أطول خط مونوريل معلق منفرد في العالم حتى اليوم",
  },
  west: {
    label: "خط غرب النيل — 6 أكتوبر",
    stops: WEST_LINE,
    stats: [
      { value: "13", label: "محطة معلقة" },
      { value: "42", unit: "كم", label: "طول المحور" },
      { value: "80", unit: "كم/س", label: "أقصى سرعة تشغيل" },
      { value: "~40", unit: "دقيقة", label: "زمن الرحلة الكاملة" },
    ],
    boardNote: "يربط المهندسين بمدينة 6 أكتوبر عبر محور 26 يوليو",
  },
};

/* ------------------------------ Facts & meta ----------------------------- */

const MNR_FACTS: NetworkFact[] = [
  {
    icon: Sparkles,
    title: "قيادة ذاتية بلا سائق",
    desc: "نظام تشغيل أوتوماتيكي كامل بمحاذاة دقيقة على الجسر المعلق — دقائق الفارق لا تتراكم",
  },
  {
    icon: Snowflake,
    title: "منصات مرتفعة مكيفة",
    desc: "محطات علوية مغلقة بتكييف مركزي وبوابات أمان زجاجية على الرصيف",
  },
  {
    icon: Wifi,
    title: "واي فاي ونوافذ بانورامية",
    desc: "إنترنت على متن القطار مع إطلالة بانورامية على القاهرة من ارتفاع الطيران العلوي",
  },
  {
    icon: Waypoints,
    title: "أطول شبكة معلقة عالمياً",
    desc: "خط شرق النيل وحده يمتد 56.5 كم — رقم قياسي لنظم المونوريل المعلقة",
  },
];

const MNR_INTEGRATION: IntegrationPoint[] = [
  {
    station: "محور محمد نجيب (النزهة)",
    badges: [IC_L3],
    tip: "انزل عند ستاد النزهة وانتقل مباشرة بين منصات المونوريل ومنصات الخط الثالث العميقة عبر المصاعد",
  },
  {
    station: "وادي النيل (المهندسين)",
    badges: [IC_L3],
    tip: "بوابة الغرب — تبادل سريع مع مترو الخط الثالث للوصول إلى وسط البلد والدقي",
  },
  {
    station: "مدينة الفنون والثقافة",
    badges: [IC_LRT],
    tip: "نفس المحطة تخدم المونوريل والقطار الكهربائي الخفيف — أكمل رحلتك إلى العبور أو العاصمة",
  },
];

const MNR_ALERTS: NetworkAlert[] = [
  {
    tone: "ontime",
    title: "تشغيل منتظم على خط شرق النيل",
    desc: "قطارات كل 10 دقائق تقريباً في وقت الذروة على امتداد المحور المعلق",
  },
  {
    tone: "info",
    title: "كل المحطات مرتفعة",
    desc: "الوصول إلى الأرصفة عبر مصاعد وسلالم كهربائية — الخدمة مجانية لذوي الهمم",
  },
  {
    tone: "neutral",
    title: "تذاكر موحدة بالكارت الذكي",
    desc: "ادفع بنفس كارت واصل المستخدم في المترو والحافلات السريعة",
  },
];

/* -------------------------------- Screen --------------------------------- */

export default function MonorailScreen({ navigate }: ScreenProps) {
  const [sector, setSector] = useState<Sector>("east");
  const meta = SECTOR_META[sector];

  return (
    <div className="pb-24 md:pb-8">
      {/* ============================== HERO ============================== */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 md:px-6 md:pt-10">
        <NetworkHero
          code="MNR"
          color={MNR}
          mode="monorail"
          title="المونوريل المعلق — شرق وغرب النيل"
          tagline="أطول شبكة مونوريل أوتوماتيكية معلقة في العالم: من محور محمد نجيب بالنزهة إلى العاصمة الإدارية، ومن وادي النيل بالمهندسين إلى مدينة 6 أكتوبر."
          status="تداول طبيعي"
          stats={meta.stats}
        />
      </div>

      {/* ============================ DIAGRAM ============================= */}
      <NetworkSection
        tag="ROUTE DIAGRAM"
        title="مخطط الخطوط المعلقة"
        desc="محطات مرتفعة على جسر مخصص — الحلقات المزدوجة نقاط التبادل مع بقية الشبكة."
        toolbar={
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={sector === "east"}
              onClick={() => setSector("east")}
              aria-pressed={sector === "east"}
            >
              <Building2 />
              شرق النيل — العاصمة
            </FilterChip>
            <FilterChip
              active={sector === "west"}
              onClick={() => setSector("west")}
              aria-pressed={sector === "west"}
            >
              <CableCar />
              غرب النيل — أكتوبر
            </FilterChip>
          </div>
        }
      >
        <p className="mb-6 flex items-center gap-2 rounded-2xl border border-bone bg-mist px-4 py-3 text-[12.5px] font-medium text-carbon">
          <Waypoints className="size-4 shrink-0" style={{ color: MNR }} />
          {meta.boardNote}
        </p>
        <RouteDiagram color={MNR} stops={meta.stops} navigate={navigate} />
      </NetworkSection>

      {/* ============================ STATIONS ============================ */}
      <NetworkSection
        tag="STATIONS"
        title={sector === "east" ? "محطات رئيسية على خط الشرق" : "محطات رئيسية على خط الغرب"}
        desc="أبرز المحطات المرتفعة بخدماتها — يتبقى محطات وسيطة موزعة على امتداد المحور."
      >
        <StationGrid color={MNR} stops={meta.stops} navigate={navigate} initial={6} />
      </NetworkSection>

      {/* ============================= FACTS ============================== */}
      <NetworkSection
        tint
        tag="OPERATIONS"
        title="مزايا النظام المعلق"
        desc="تقنيات المونوريل المعلق الذي يشق طريقه فوق ازدحام القاهرة دون لمس الأرض."
      >
        <FactsBand color={MNR} facts={MNR_FACTS} />
      </NetworkSection>

      {/* ========================== INTEGRATION =========================== */}
      <NetworkSection
        tag="INTERCHANGES"
        title="نقاط التكامل"
        desc="ربط مباشر مع مترو الخط الثالث شرقاً وغرباً، ومع القطار الكهربائي الخفيف في العاصمة."
      >
        <IntegrationBand points={MNR_INTEGRATION} navigate={navigate} />
      </NetworkSection>

      {/* ============================= ALERTS ============================= */}
      <NetworkSection
        tag="SERVICE NOTES"
        title="تنبيهات الخدمة"
        desc="ملاحظات التشغيل الحالية على المحورين قبل رحلتك المعلقة."
      >
        <AlertsBand alerts={MNR_ALERTS} />
      </NetworkSection>

      {/* =============================== CTA ============================== */}
      <NetworkCTA
        code="MNR"
        color={MNR}
        mode="monorail"
        modeLabel="المونوريل المعلق"
        navigate={navigate}
      />
    </div>
  );
}
