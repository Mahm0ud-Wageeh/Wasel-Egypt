"use client";

/**
 * Wasel Egypt — LRT screen (Task 3-d).
 * قطار العاصمة الكهربائي الخفيف — عدلي منصور ↔ مدينة الفنون والثقافة
 * + فرع العاشر من رمضان. Spec: 10_LRT_CAPITAL_TRAIN.md
 */

import { useMemo, useState } from "react";
import {
  BatteryCharging,
  Building2,
  Factory,
  Gauge,
  Snowflake,
  Split,
  TicketPercent,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  type IntegrationPoint,
  type NetworkAlert,
  type NetworkFact,
  type NetworkStop,
} from "@/components/screens/_network/network-parts";

const LRT = "#0284c7";

/* --------------------------- Interchange tokens -------------------------- */

const IC_L3: DiagramInterchange = {
  code: "L3",
  color: "#16a34a",
  screen: "metro",
  label: "تبادل مع مترو الخط الثالث",
};
const IC_ENR: DiagramInterchange = {
  code: "ENR",
  color: "#991b1b",
  screen: "train",
  label: "تبادل مع السكك الحديدية المصرية",
};
const IC_BRT: DiagramInterchange = {
  code: "BRT",
  color: "#d97706",
  screen: "brt",
  label: "تبادل مع حافلات الطريق الدائري السريعة",
};
const IC_MNR: DiagramInterchange = {
  code: "MNR",
  color: "#7c3aed",
  screen: "monorail",
  label: "تبادل مع مونوريل شرق النيل",
};

/* ------------------------------ Station data ----------------------------- */

const CAPITAL_BRANCH: NetworkStop[] = [
  {
    name: "عدلي منصور",
    sub: "ADLY MANSOUR",
    terminal: "start",
    interchanges: [IC_L3, IC_ENR, IC_BRT],
    note: "مركز التبادل الأكبر شرق القاهرة — مترو الخط الثالث، سكك حديد، وحافلات سوبر جيت",
    facilities: ["parking", "feeder", "access"],
  },
  { name: "العبور", sub: "EL-OBOUR", facilities: ["parking", "feeder"] },
  { name: "المستقبل", sub: "EL-MOSTAQBAL", facilities: ["feeder"] },
  { name: "الشروق", sub: "EL-SHOROUK", facilities: ["parking", "feeder", "access"] },
  { name: "هليوبوليس الجديدة", sub: "NEW HELIOPOLIS", facilities: ["feeder"] },
  {
    name: "بدر",
    sub: "BADR",
    junction: "من هنا يتفرع خط العاشر من رمضان",
    tag: "نقطة التفرع",
    facilities: ["parking", "feeder"],
  },
  { name: "الروبيكي", sub: "EL-ROUBIKY", facilities: ["feeder"] },
  { name: "حدائق العاصمة", sub: "CAPITAL GARDENS", facilities: ["parking", "feeder"] },
  {
    name: "مطار العاصمة",
    sub: "CAPITAL AIRPORT",
    tag: "مطار دولي",
    facilities: ["parking", "access"],
  },
  {
    name: "مدينة الفنون والثقافة",
    sub: "ARTS & CULTURE CITY",
    terminal: "end",
    interchanges: [IC_MNR],
    note: "تبادل مباشر مع مونوريل شرق النيل داخل العاصمة الإدارية",
    facilities: ["parking", "access"],
  },
];

const RAMADAN_BRANCH: NetworkStop[] = [
  {
    name: "بدر",
    sub: "BADR",
    terminal: "start",
    junction: "نقطة الانفصال عن الفرع الرئيسي",
    interchanges: [],
    facilities: ["parking", "feeder"],
  },
  {},
  {},
  {},
  {
    name: "العاشر من رمضان",
    sub: "10TH OF RAMADAN",
    terminal: "end",
    note: "يخدم المدينة والمنطقة الصناعية — تشغيل تدريجي للمراحل",
    facilities: ["feeder"],
  },
];

/* ------------------------------ Facts & meta ----------------------------- */

const LRT_FACTS: NetworkFact[] = [
  {
    icon: BatteryCharging,
    title: "بطارية احتياطية",
    desc: "عربات كهربائية ببطارية طوارئ تُكمل الرحلة عند انقطاع التيار المفاجئ",
  },
  {
    icon: Snowflake,
    title: "تكييف كامل",
    desc: "أنظمة تكييف مركزية في جميع العربات والمحطات على امتداد الفرعين",
  },
  {
    icon: Users,
    title: "طاقة استيعابية عالية",
    desc: "تصميم الشبكة يستوعب نحو 300 ألف راكب يومياً مع اكتمال المراحل",
  },
  {
    icon: Gauge,
    title: "سرعة تصميمية 120 كم/س",
    desc: "أسرع من المترو بأنفاقه — رحلة العاصمة كاملة في 45 دقيقة فقط",
  },
];

const LRT_INTEGRATION: IntegrationPoint[] = [
  {
    station: "عدلي منصور — مركز التبادل",
    badges: [IC_L3, IC_ENR, IC_BRT],
    tip: "ابدأ من منصة LRT العلوية بعد النزول من مترو الخط الثالث — السكك الحديدية والحافلات السريعة في نفس المجمع",
  },
  {
    station: "بدر — نقطة التفرع",
    badges: [],
    tip: "تفرع خط العاشر من رمضان — تأكد من لافتة وجهة القطار قبل الصعود إلى الرصيف",
  },
  {
    station: "مدينة الفنون والثقافة",
    badges: [IC_MNR],
    tip: "تبادل داخلي مع مونوريل شرق النيل للوصول إلى النزهة أو حيّي العاصمة السكنية",
  },
];

const LRT_ALERTS: NetworkAlert[] = [
  {
    tone: "ontime",
    title: "تداول منتظم على الفرعين",
    desc: "قطار كل 15 دقيقة على فرعي العاصمة الإدارية والعاشر من رمضان",
  },
  {
    tone: "info",
    title: "محطة بدر نقطة التفرع",
    desc: "القطارات تنقسم بعد بدر — راقب شاشة الوجهة قبل الصعود",
  },
  {
    tone: "neutral",
    title: "تذاكر 10 / 15 / 20 ج.م",
    desc: "نظام مناطق بسيط بحسب عدد المحطات المقطوعة — كاش أو كارت ذكي",
  },
];

/* --------------------------- Fare zone helper ---------------------------- */

type FareZone = { fare: number; label: string; zone: string };

function fareFor(stops: number): FareZone {
  if (stops <= 3) return { fare: 10, label: "حتى 3 محطات", zone: "المنطقة الأولى" };
  if (stops <= 7) return { fare: 15, label: "من 4 إلى 7 محطات", zone: "المنطقة الثانية" };
  return { fare: 20, label: "أكثر من 7 محطات", zone: "المنطقة الثالثة" };
}

/* -------------------------------- Screen --------------------------------- */

export default function LrtScreen({ navigate }: ScreenProps) {
  const [branch, setBranch] = useState<"capital" | "ramadan">("capital");
  const stops = branch === "capital" ? CAPITAL_BRANCH : RAMADAN_BRANCH;
  const named = useMemo(() => stops.filter((s) => s.name) as { name: string }[], [stops]);

  const [from, setFrom] = useState("عدلي منصور");
  const [to, setTo] = useState("مدينة الفنون والثقافة");

  const dist = Math.abs(named.findIndex((s) => s.name === to) - named.findIndex((s) => s.name === from));
  const zone = fareFor(dist);

  return (
    <div className="pb-24 md:pb-8">
      {/* ============================== HERO ============================== */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 md:px-6 md:pt-10">
        <NetworkHero
          code="LRT"
          color={LRT}
          mode="lrt"
          title="القطار الكهربائي الخفيف — عاصمة الإدارة"
          tagline="من عدلي منصور مركز التبادل إلى مدينة الفنون والثقافة بالعاصمة الإدارية الجديدة، وفرع صناعي للعاشر من رمضان — عربات مكيفة بسرعة 120 كم/س."
          status="تداول طبيعي"
          stats={[
            { value: "19", label: "محطة على الشبكة" },
            { value: "90", unit: "كم", label: "إجمالي طول المسار" },
            { value: "120", unit: "كم/س", label: "أقصى سرعة تشغيل" },
            { value: "45", unit: "دقيقة", label: "زمن الرحلة الكاملة" },
          ]}
        />
      </div>

      {/* ============================ DIAGRAM ============================= */}
      <NetworkSection
        tag="ROUTE DIAGRAM"
        title="مخطط الخط وتفرعاته"
        desc="تسلسل المحطات من عدلي منصور حتى العاصمة الإدارية — بدءاً من نقطة التفرع عند بدر ينطلق فرع العاشر من رمضان."
        toolbar={
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={branch === "capital"}
              onClick={() => setBranch("capital")}
              aria-pressed={branch === "capital"}
            >
              <Building2 />
              فرع العاصمة الإدارية
            </FilterChip>
            <FilterChip
              active={branch === "ramadan"}
              onClick={() => setBranch("ramadan")}
              aria-pressed={branch === "ramadan"}
            >
              <Factory />
              فرع العاشر من رمضان
            </FilterChip>
          </div>
        }
      >
        {branch === "ramadan" ? (
          <p className="mb-6 flex items-center gap-2 rounded-2xl border border-bone bg-mist px-4 py-3 text-[12.5px] font-medium text-carbon">
            <Split className="size-4 shrink-0" style={{ color: LRT }} />
            يبدأ هذا الفرع من محطة بدر على الفرع الرئيسي — محطاته الوسيطة قيد التجهيز
          </p>
        ) : null}
        <RouteDiagram color={LRT} stops={stops} navigate={navigate} />
      </NetworkSection>

      {/* ============================= FARES ============================== */}
      <NetworkSection
        tint
        tag="FARE ZONES"
        title="أسعار التذاكر — نظام المناطق"
        desc="التسعير بمناطق ثابتة بحسب عدد المحطات المقطوعة، بنفس البطاقة الذكية المستخدمة في المترو."
      >
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          {/* calculator */}
          <div className="card-flat rounded-3xl p-6">
            <h3 className="flex items-center gap-2 font-head text-[15px] font-bold text-ink">
              <TicketPercent className="size-4" style={{ color: LRT }} />
              احسب تذكرتك فوراً
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-[12px] font-bold text-slateink">من محطة</span>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {named.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <span className="text-[12px] font-bold text-slateink">إلى محطة</span>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {named.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-bone pt-5">
              <div>
                <span className="num block text-[40px] font-extrabold leading-none text-ink">
                  {zone.fare}
                </span>
                <span className="mt-1 block text-[12px] font-bold text-slateink">
                  جنيه مصري — {zone.zone}
                </span>
              </div>
              <div className="h-12 w-px bg-bone" aria-hidden="true" />
              <p className="text-[12.5px] leading-6 text-slateink">
                المسافة المقطوعة: <span className="num font-bold text-carbon">{dist}</span> محطة —{" "}
                {zone.label}
              </p>
            </div>
          </div>

          {/* zone table */}
          <div className="grid gap-3">
            {[10, 15, 20].map((fare, i) => (
              <div
                key={fare}
                className={cn(
                  "settle flex items-center justify-between rounded-2xl border border-bone bg-white px-5 py-4 hover:border-cloud"
                )}
              >
                <div>
                  <span className="font-head text-[14px] font-bold text-ink">
                    {["حتى 3 محطات", "من 4 إلى 7 محطات", "أكثر من 7 محطات"][i]}
                  </span>
                  <span className="mono-tag mt-1 block">
                    ZONE {["01", "02", "03"][i]}
                  </span>
                </div>
                <span
                  className="num inline-flex h-9 items-center rounded-full px-4 text-[14px] font-bold"
                  style={{ backgroundColor: `${LRT}14`, color: LRT, border: `1px solid ${LRT}30` }}
                >
                  {fare} EGP
                </span>
              </div>
            ))}
          </div>
        </div>
      </NetworkSection>

      {/* ============================ STATIONS ============================ */}
      <NetworkSection
        tag="STATIONS"
        title={branch === "capital" ? "محطات فرع العاصمة" : "محطات فرع العاشر من رمضان"}
        desc="كل محطة بمميزاتها: مواقف سيارات، مشاوير تغذية، وخدمات ذوي الهمم."
      >
        <StationGrid color={LRT} stops={stops} navigate={navigate} initial={6} />
      </NetworkSection>

      {/* ============================= FACTS ============================== */}
      <NetworkSection
        tint
        tag="OPERATIONS"
        title="مزايا التشغيل"
        desc="تقنيات القطار الكهربائي الخفيف التي تجعله أسرع جسر مواصلات شرقاً."
      >
        <FactsBand color={LRT} facts={LRT_FACTS} />
      </NetworkSection>

      {/* ========================== INTEGRATION =========================== */}
      <NetworkSection
        tag="INTERCHANGES"
        title="نقاط التكامل"
        desc="أين يلتقي القطار الكهربائي مع بقية شبكات واصل — اضغط شارة الخط للانتقال إلى شاشته."
      >
        <IntegrationBand points={LRT_INTEGRATION} navigate={navigate} />
      </NetworkSection>

      {/* ============================= ALERTS ============================= */}
      <NetworkSection
        tag="SERVICE NOTES"
        title="تنبيهات الخدمة"
        desc="آخر ملاحظات التشغيل على الفرعين قبل انطلاق رحلتك."
      >
        <AlertsBand alerts={LRT_ALERTS} />
      </NetworkSection>

      {/* =============================== CTA ============================== */}
      <NetworkCTA
        code="LRT"
        color={LRT}
        mode="lrt"
        modeLabel="القطار الكهربائي الخفيف"
        navigate={navigate}
      />
    </div>
  );
}
