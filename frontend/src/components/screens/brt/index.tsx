"use client";

/**
 * Wasel Egypt — BRT screen (Task 4-d).
 * الأتوبيس الترددي السريع — الطريق الدائري: 106 كم مسار معزول كهربائي
 * بالكامل، محطات مغلقة في الجزيرة الوسطى يصعد إليها عبر كباري المشاة.
 * Spec: 12_BRT_RING_ROAD.md
 */

import { useState } from "react";
import {
  DoorOpen,
  Footprints,
  ShieldCheck,
  Users,
  Waypoints,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import {
  AlertsBand,
  FactsBand,
  IntegrationBand,
  InterchangeBadge,
  NetworkCTA,
  NetworkHero,
  NetworkSection,
  RingDirectionLegend,
  RingRoadVisualizer,
  StationGrid,
  type DiagramInterchange,
  type IntegrationPoint,
  type NetworkAlert,
  type NetworkFact,
  type NetworkStop,
  type RingHub,
} from "@/components/screens/_network/network-parts";

const BRT = "#d97706";

/* --------------------------- Interchange tokens -------------------------- */

const IC_L1: DiagramInterchange = {
  code: "L1",
  color: "#1d4ed8",
  screen: "metro",
  label: "تبادل مع مترو الخط الأول",
};
const IC_L2: DiagramInterchange = {
  code: "L2",
  color: "#dc2626",
  screen: "metro",
  label: "تبادل مع مترو الخط الثاني",
};
const IC_L3: DiagramInterchange = {
  code: "L3",
  color: "#16a34a",
  screen: "metro",
  label: "تبادل مع مترو الخط الثالث",
};
const IC_L4: DiagramInterchange = {
  code: "L4",
  color: "#ea580c",
  screen: "metro",
  label: "اتصال مستقبلي مع مترو الخط الرابع",
};
const IC_LRT: DiagramInterchange = {
  code: "LRT",
  color: "#0284c7",
  screen: "lrt",
  label: "تبادل مع القطار الكهربائي الخفيف",
};
const IC_ENR: DiagramInterchange = {
  code: "ENR",
  color: "#991b1b",
  screen: "train",
  label: "تبادل مع السكك الحديدية المصرية",
};

/* ------------------------------- Ring hubs ------------------------------- */
/* Real multimodal hubs from spec 12 — angles: 0 = north, clockwise.        */

const RING_HUBS: RingHub[] = [
  {
    id: "marg",
    labelLines: ["المرج"],
    angle: 34,
    interchanges: [IC_L1],
    tip: "تبادل مباشر مع نهاية مترو الخط الأول شمال شرق القاهرة — بوابتك إلى العبور وحي المرج.",
    bridge: "كوبري مشاة شرقي بمصعد وسلم كهربائي",
  },
  {
    id: "adly",
    labelLines: ["عدلي منصور"],
    angle: 84,
    interchanges: [IC_L3, IC_LRT, IC_ENR],
    tip: "أكبر مجمع تبادل شرق القاهرة: مترو الخط الثالث والقطار الكهربائي الخفيف والسكك الحديدية في مبنى واحد.",
    bridge: "ممر مغطى داخل المجمع — بلا عبور شارع",
  },
  {
    id: "academy",
    labelLines: ["أكاديمية الشرطة", "والتجمع الخامس"],
    angle: 128,
    interchanges: [IC_L4],
    tip: "حزام شرق الحلقة يخدم الأكاديمية والتجمع الخامس — الاتصال بالخط الرابع قيد الإنشاء.",
    bridge: "كوبري مشاة بمصعد وسلم كهربائي",
  },
  {
    id: "carrefour",
    labelLines: ["كارفور المعادي"],
    angle: 200,
    tip: "نقطة الالتقاء جنوب القاهرة — مشاوير تغذية نحو المعادي الجديدة وحلوان عبر الممر المغلق.",
    bridge: "كوبري مشاة بمصعد وسلم كهربائي",
  },
  {
    id: "mounib",
    labelLines: ["المنيب"],
    angle: 232,
    interchanges: [IC_L2],
    tip: "نهاية مترو الخط الثاني جنوباً وساحة ميكروباصات صعيد مصر — أكمل رحلتك داخل المدينة بحافلات معزولة.",
    bridge: "كوبري مشاة بوصول مباشر لساحة الميكروباصات",
  },
  {
    id: "bahtim",
    labelLines: ["بهتيم", "شبرا الخيمة"],
    angle: 322,
    interchanges: [IC_L2],
    tip: "بوابة الحلقة الشمالية قرب رصيف نهاية مترو الخط الثاني بشبرا الخيمة — تخدم المدينة الصناعية.",
    bridge: "كوبري مشاة شمالي بمصعد وسلم كهربائي",
  },
];

/* --------------------------- Pedestrian stations ------------------------- */

const BRT_STOPS: NetworkStop[] = [
  {
    name: "السلام",
    sub: "EL-SALAM",
    tag: "جسر مشاة",
    note: "بوابة شمال شرق الحلقة عند طريق الإسكندرية الصحراوي",
    facilities: ["parking", "feeder"],
  },
  {
    name: "المرج",
    sub: "EL-MARG",
    interchanges: [IC_L1],
    tag: "مركز تبادل",
    note: "ممر مغطى إلى نهاية مترو الخط الأول",
    facilities: ["parking", "feeder", "access"],
  },
  {
    name: "عدلي منصور",
    sub: "ADLY MANSOUR",
    interchanges: [IC_L3, IC_LRT, IC_ENR],
    tag: "مركز تبادل رئيسي",
    note: "أكبر مجمع تبادل شرق القاهرة — مترو وسكك حديد وحافلات تحت سقف واحد",
    facilities: ["parking", "feeder", "access"],
  },
  {
    name: "أكاديمية الشرطة",
    sub: "POLICE ACADEMY",
    tag: "جسر مشاة",
    note: "تخدم الأكاديمية والمستشفيات الملحقة — اتصال مخطط مع الخط الرابع",
    facilities: ["parking", "access"],
  },
  {
    name: "التجمع الخامس",
    sub: "5TH SETTLEMENT",
    tag: "جسر مشاة",
    note: "بوابة شرق القاهرة الجديدة — مشاوير تغذية نحو الحي الأول والثاني",
    facilities: ["parking", "feeder"],
  },
  {
    name: "15 مايو",
    sub: "15 MAY",
    tag: "جسر مشاة",
    note: "عند كوبري 15 مايو — تخدم مناطق جنوب القاهرة الصناعية",
    facilities: ["feeder"],
  },
  {
    name: "كارفور المعادي",
    sub: "CARREFOUR MAADI",
    tag: "وجهات تسوق",
    note: "نقطة الالتقاء جنوب المدينة — مشاوير تغذية للمعادي الجديدة وحلوان",
    facilities: ["parking", "feeder"],
  },
  {
    name: "المنيب",
    sub: "EL-MOUNIB",
    interchanges: [IC_L2],
    tag: "مركز تبادل",
    note: "تبادل مترو الخط الثاني مع ساحة ميكروباصات صعيد مصر",
    facilities: ["feeder", "access"],
  },
  {
    name: "بهتيم / شبرا الخيمة",
    sub: "BAHTIM",
    interchanges: [IC_L2],
    tag: "جسر مشاة",
    note: "بوابة الحلقة الشمالية قرب نهاية الخط الثاني — تخدم المدينة الصناعية",
    facilities: ["parking", "feeder"],
  },
];

/* ------------------------------ Facts & meta ----------------------------- */

const BRT_FACTS: NetworkFact[] = [
  {
    icon: Zap,
    title: "كهرباء بالكامل",
    desc: "حافلات مركبة كهربائية صفرية الانبعاثات على امتداد الحلقة — تشغيل هادئ ونظيف",
  },
  {
    icon: ShieldCheck,
    title: "مسارات مخصصة",
    desc: "حارات معزولة في الجزيرة الوسطى للطريق الدائري — بلا اختلاط بالمرور العادي",
  },
  {
    icon: Footprints,
    title: "جسور مشاة",
    desc: "محطات مغلقة داخل الجزيرة الوسطى يصل إليها الركاب عبر كباري بمصاعد وسلالم كهربائية",
  },
  {
    icon: Waypoints,
    title: "تكامل مع المترو",
    desc: "نقاط تبادل مباشرة مع خطوط المترو والقطار الكهربائي الخفيف والسكك الحديدية",
  },
];

const BRT_INTEGRATION: IntegrationPoint[] = [
  {
    station: "عدلي منصور — مركز التبادل",
    badges: [IC_L3, IC_LRT, IC_ENR],
    tip: "المجمع الأكبر شرق القاهرة: منصات المترو والقطار الكهربائي الخفيف والسكك الحديدية وحافلات التغذية تحت سقف واحد",
  },
  {
    station: "المرج",
    badges: [IC_L1],
    tip: "نهاية مترو الخط الأول شمال شرق القاهرة — حافلات الدائري تكمل رحلتك نحو التجمع والعاصمة الإدارية",
  },
  {
    station: "المنيب",
    badges: [IC_L2],
    tip: "نهاية الخط الثاني جنوباً مع ساحة ميكروباصات صعيد مصر — أكمل تنقلك داخل المدينة على مسارات معزولة",
  },
  {
    station: "بهتيم / شبرا الخيمة",
    badges: [IC_L2],
    tip: "قرب الرصيف الشمالي للخط الثاني — بوابة الحلقة لمدينة شبرا الخيمة الصناعية ومراكز التسوق",
  },
  {
    station: "أكاديمية الشرطة والتجمع الخامس",
    badges: [IC_L4],
    tip: "حزام شرق الحلقة يخدم الأكاديمية والمستشفيات — الاتصال مع الخط الرابع نحو التجمع قيد الإنشاء",
  },
  {
    station: "كارفور المعادي",
    badges: [],
    tip: "نقطة الالتقاء جنوب القاهرة — مشاوير تغذية منتظمة إلى المعادي الجديدة وحلوان ومعاصل التراع",
  },
];

const BRT_ALERTS: NetworkAlert[] = [
  {
    tone: "ontime",
    title: "حافلة كل 3 دقائق في الذروة",
    desc: "أعلى ترددات التشغيل في ساعات الصباح والمساء، وكل 5 إلى 7 دقائق خارجها",
  },
  {
    tone: "info",
    title: "الصعود عبر كباري وأنفاق المشاة",
    desc: "لا عبور للطريق الدائري سيراً أبداً — المصاعد والسلالم الكهربائية تعمل طوال ساعات الخدمة",
  },
  {
    tone: "neutral",
    title: "تذاكر منطقية: 5 / 10 / 15 ج.م",
    desc: "تسعير بسيط بحسب نطاق الرحلة على الحلقة — الدفع كاش أو بكارت واصل الذكي",
  },
];

/* -------------------------------- Screen --------------------------------- */

export default function BrtScreen({ navigate }: ScreenProps) {
  const [selectedId, setSelectedId] = useState("adly");
  const selected = RING_HUBS.find((h) => h.id === selectedId) ?? RING_HUBS[1];

  return (
    <div className="pb-24 md:pb-8">
      {/* ============================== HERO ============================== */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 md:px-6 md:pt-10">
        <NetworkHero
          code="BRT"
          color={BRT}
          mode="brt"
          title="حافلات النقل السريع — الطريق الدائري"
          tagline="حافلات كهربائية مركبة صفرية الانبعاثات تدور على مسار معزول بمحاذاة 106 كم من الطريق الدائري — محطات مغلقة في الجزيرة الوسطى يصعد إليها عبر كباري المشاة، وحافلة كل 3 دقائق في ساعات الذروة."
          status="تداول طبيعي"
          stats={[
            { value: "106", unit: "كم", label: "حلقة مخصصة معزولة" },
            { value: "42", unit: "+", label: "محطة جسر مشاة" },
            { value: "90", unit: "كم/س", label: "أقصى سرعة تشغيل" },
            { value: "350", unit: "ألف", label: "راكب يومياً — الطاقة المستهدفة" },
          ]}
        />
      </div>

      {/* =========================== RING LOCATOR ========================= */}
      <NetworkSection
        tag="RING LOCATOR"
        title="مخطط الحلقة — اتجاهان دورانيان"
        desc="الحافلات تدور على الحلقة مع عقارب الساعة وعكسها على نفس المسار المعزول — اختر محطة الربط لعرض تفاصيل الوصول ووسائل التبادل."
        toolbar={<RingDirectionLegend color={BRT} />}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-center">
          <div className="card-flat rounded-3xl p-4 sm:p-8">
            <div className="mx-auto w-full max-w-[380px]">
              <RingRoadVisualizer
                color={BRT}
                hubs={RING_HUBS}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <article
              className={cn(
                "card-flat rounded-3xl p-6 settle",
                selected.interchanges?.length ? "hover:border-cloud" : "bg-mist"
              )}
            >
              <span className="mono-tag block">SELECTED HUB</span>
              <h3 className="mt-2 font-head text-[20px] font-black text-ink">
                {selected.labelLines.join(" ")}
              </h3>
              <p className="mt-2 text-[13px] leading-7 text-slateink">{selected.tip}</p>
              <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-mist px-3.5 py-3 text-[12px] font-bold text-carbon">
                <DoorOpen className="size-4 shrink-0" style={{ color: BRT }} />
                {selected.bridge}
              </div>
              {selected.interchanges?.length ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-bone pt-4">
                  <span className="text-[12px] font-bold text-slateink">تبادل مباشر:</span>
                  {selected.interchanges.map((ic) => (
                    <InterchangeBadge key={ic.code} ic={ic} navigate={navigate} size="md" />
                  ))}
                </div>
              ) : (
                <p className="mt-4 border-t border-bone pt-4 text-[12px] font-medium text-ash">
                  محطة تغذية — تكامل عبر مشاوير الحافلات المنتظمة
                </p>
              )}
            </article>

            <div className="flex flex-wrap gap-2">
              {RING_HUBS.map((hub) => (
                <FilterChip
                  key={hub.id}
                  active={hub.id === selectedId}
                  onClick={() => setSelectedId(hub.id)}
                  aria-pressed={hub.id === selectedId}
                >
                  {hub.labelLines.join(" ")}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </NetworkSection>

      {/* ============================ STATIONS ============================ */}
      <NetworkSection
        tag="STATIONS"
        title="محطات كباري المشاة"
        desc="محطات مغلقة في الجزيرة الوسطى للطريق الدائري — الصعود من كلا اتجاهي الطريق عبر كباري مجهزة بمصاعد وسلالم كهربائية."
      >
        <StationGrid color={BRT} stops={BRT_STOPS} navigate={navigate} initial={6} />
      </NetworkSection>

      {/* ============================= FACTS ============================== */}
      <NetworkSection
        tint
        tag="OPERATIONS"
        title="مزايا النظام السريع"
        desc="لماذا تسبق الحافلات الكهربائية بقية وسائل الطريق الدائري المزدحم؟"
      >
        <FactsBand color={BRT} facts={BRT_FACTS} />
      </NetworkSection>

      {/* ========================== INTEGRATION =========================== */}
      <NetworkSection
        tag="INTERCHANGES"
        title="نقاط التكامل"
        desc="أين تلتقي حافلات الدائري بشبكات واصل الأخرى — اضغط شارة الخط للانتقال إلى شاشته."
      >
        <IntegrationBand points={BRT_INTEGRATION} navigate={navigate} />
      </NetworkSection>

      {/* ============================= ALERTS ============================= */}
      <NetworkSection
        tag="SERVICE NOTES"
        title="تنبيهات الخدمة"
        desc="ملاحظات التشغيل الحالية على الحلقة قبل انطلاق رحلتك."
      >
        <AlertsBand alerts={BRT_ALERTS} />
      </NetworkSection>

      {/* =============================== CTA ============================== */}
      <NetworkCTA
        code="BRT"
        color={BRT}
        mode="brt"
        modeLabel="حافلات الطريق الدائري"
        navigate={navigate}
      />
    </div>
  );
}
