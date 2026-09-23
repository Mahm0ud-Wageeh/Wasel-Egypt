"use client";

/**
 * Wasel Egypt — Train screen (Task 4-d).
 * السكك الحديدية المصرية (ENR): قطبا رمسيس وبشتيل، لوحة مغادرات،
 * وبندي تالجو الفاخر — جداول محاور الدلتا والصعيد.
 * Spec: 13_TRAIN_RAILWAYS_ENR.md
 */

import { useState } from "react";
import {
  Armchair,
  Building2,
  CarFront,
  Clock,
  ConciergeBell,
  Crown,
  DoorOpen,
  Landmark,
  Luggage,
  MapPin,
  Route as RouteIcon,
  Signpost,
  Ticket,
  Users,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterChip, LineBadge, StatusPill } from "@/components/kit";
import { toast } from "@/hooks/use-toast";
import type { ScreenProps } from "@/lib/navigation";
import {
  AlertsBand,
  IntegrationBand,
  InterchangeBadge,
  NetworkHero,
  NetworkSection,
  RouteDiagram,
  type DiagramInterchange,
  type IntegrationPoint,
  type NetworkAlert,
  type NetworkStop,
} from "@/components/screens/_network/network-parts";

const ENR = "#991b1b";

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
const IC_MNR: DiagramInterchange = {
  code: "MNR",
  color: "#7c3aed",
  screen: "monorail",
  label: "تبادل مع مونوريل غرب النيل",
};

/* ------------------------------- Terminals ------------------------------- */

type Terminal = {
  id: string;
  mono: string;
  name: string;
  sub: string;
  desc: string;
  badges: DiagramInterchange[];
  facilities: { icon: typeof Clock; label: string }[];
  guideTitle: string;
  steps: string[];
};

const TERMINALS: Terminal[] = [
  {
    id: "ramsis",
    mono: "TERMINAL 01",
    name: "محطة رمسيس (مصر)",
    sub: "RAMSIS — MISR STATION",
    desc: "أكبر محطات القاهرة وبوابة الدلتا والإسكندرية وقناة السويس — ربط مباشر بأنفاق محطة الشهداء دون مغادرة المبنى.",
    badges: [IC_L1, IC_L2],
    facilities: [
      { icon: DoorOpen, label: "أنفاق الشهداء" },
      { icon: Clock, label: "صالات انتظار مكيفة" },
      { icon: Ticket, label: "بوابة تذاكر رسمية" },
      { icon: CarFront, label: "مواقف متعددة الطوابق" },
    ],
    guideTitle: "الوصول للمترو دون الخروج للشارع",
    steps: [
      "انزل من الرصيف إلى الصالة الرئيسية للمحطة",
      "اتبع لافتات أنفاق الشهداء على امتداد الممر المغلق",
      "اعبر البوابة مباشرة إلى رصيفي الخط الأول والثاني",
    ],
  },
  {
    id: "bashteel",
    mono: "TERMINAL 02",
    name: "محطة بشتيل — قطارات صعيد مصر",
    sub: "BAShteel — UPPER EGYPT TERMINAL",
    desc: "المحطة الذكية الجديدة لرحلات الصعيد على محور كمال عامر — اتصال مغلق بمونوريل غرب النيل وتخدم أسيوط وسوهاج وقنا وأسوان.",
    badges: [IC_MNR],
    facilities: [
      { icon: DoorOpen, label: "اتصال المونوريل" },
      { icon: Ticket, label: "بوابات إلكترونية" },
      { icon: Luggage, label: "صالة أمتعة" },
      { icon: CarFront, label: "مواقف ذكية" },
    ],
    guideTitle: "الوصول للمونوريل دون الخروج للشارع",
    steps: [
      "اتبع لافتات محور كمال عامر من صالة الوصول",
      "اعبر الممر المغلق إلى مدخل جسر المونوريل",
      "اصعد إلى رصيف مونوريل غرب النيل نحو المهندسين",
    ],
  },
];

/* ---------------------------- Departure board ---------------------------- */

type TrainClass = "talgo" | "premium" | "regular";
type BoardFilter = "all" | TrainClass;

interface Departure {
  no: string;
  name: string;
  cls: TrainClass;
  dest: string;
  destEn: string;
  time: string;
  platform: string;
  status: "ontime" | "delay";
  delayMin?: number;
}

const CLASS_META: Record<TrainClass, { label: string; chip: string }> = {
  talgo: {
    label: "تالجو",
    chip: "border-[#fbbf24]/50 bg-[#fbbf24]/15 text-[#b45309]",
  },
  premium: {
    label: "مميز مكيف",
    chip: "border-enr/25 bg-enr/10 text-enr",
  },
  regular: {
    label: "عادي",
    chip: "border-bone bg-mist text-carbon",
  },
};

const BOARD_FILTERS: { key: BoardFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "talgo", label: "تالجو" },
  { key: "premium", label: "مميز" },
  { key: "regular", label: "عادي" },
];

const DEPARTURES: Departure[] = [
  { no: "941", name: "تالجو", cls: "talgo", dest: "الإسكندرية", destEn: "ALEXANDRIA", time: "07:15", platform: "5", status: "ontime" },
  { no: "112", name: "مميز مكيف", cls: "premium", dest: "طنطا", destEn: "TANTA", time: "07:40", platform: "2", status: "delay", delayMin: 10 },
  { no: "943", name: "تالجو", cls: "talgo", dest: "الإسكندرية", destEn: "ALEXANDRIA", time: "09:30", platform: "5", status: "ontime" },
  { no: "204", name: "مميز مكيف", cls: "premium", dest: "المنصورة", destEn: "MANSOURA", time: "10:05", platform: "3", status: "ontime" },
  { no: "317", name: "عادي", cls: "regular", dest: "الزقازيق", destEn: "ZAGAZIG", time: "10:50", platform: "1", status: "ontime" },
  { no: "86", name: "مميز مكيف", cls: "premium", dest: "أسيوط", destEn: "ASSIUT", time: "11:20", platform: "7", status: "delay", delayMin: 15 },
  { no: "945", name: "تالجو", cls: "talgo", dest: "الإسكندرية", destEn: "ALEXANDRIA", time: "13:00", platform: "5", status: "ontime" },
  { no: "452", name: "عادي", cls: "regular", dest: "طنطا", destEn: "TANTA", time: "14:10", platform: "2", status: "delay", delayMin: 5 },
  { no: "88", name: "مميز مكيف", cls: "premium", dest: "أسيوط", destEn: "ASSIUT", time: "15:35", platform: "7", status: "ontime" },
];

const FARE_TIERS = [
  { label: "درجة VIP — تالجو", chip: "border-[#fbbf24]/50 bg-[#fbbf24]/15 text-[#b45309]" },
  { label: "درجة أولى", chip: "border-enr/25 bg-enr/10 text-enr" },
  { label: "درجة ثانية", chip: "border-bone bg-mist text-carbon" },
  { label: "الروسية — مكيفة", chip: "border-bone bg-mist text-carbon" },
];

/* ------------------------------- Corridors ------------------------------- */

type Corridor = "delta" | "upper";

const DELTA_LINE: NetworkStop[] = [
  {
    name: "رمسيس (مصر)",
    sub: "RAMSIS",
    terminal: "start",
    interchanges: [IC_L1, IC_L2],
    note: "المحطة الأولى — اتصال أنفاق الشهداء بالخط الأول والثاني",
  },
  {},
  {},
  {
    name: "طنطا",
    sub: "TANTA",
    junction: "من هنا يتفرع خط المنصورة والمحلة الكبرى",
  },
  {},
  {},
  { name: "كفر الزيات", sub: "KAFFR EL-ZAYAT" },
  {},
  { name: "دمنهور", sub: "DAMANHOUR" },
  {},
  {
    name: "الإسكندرية (مصر)",
    sub: "ALEXANDRIA",
    terminal: "end",
    note: "محطة مصر بالإسكندرية — ساحة الركاب وربط ترام المدينة",
  },
];

const UPPER_LINE: NetworkStop[] = [
  {
    name: "بشتيل",
    sub: "BAShteel",
    terminal: "start",
    interchanges: [IC_MNR],
    note: "محطة صعيد مصر — ممر مغلق إلى مونوريل محور كمال عامر",
  },
  {},
  {},
  { name: "بني سويف", sub: "BENI SUEF" },
  {},
  {},
  { name: "المنيا", sub: "MINYA" },
  {},
  {},
  { name: "أسيوط", sub: "ASSIUT", note: "قلب الصعيد — تبادل قطارات الوجه القبلي" },
  {},
  {},
  { name: "سوهاج", sub: "SOHAG" },
  {},
  {},
  {
    name: "قنا",
    sub: "QENA",
    junction: "من هنا يتفرع خط الغردقة والسفاجا",
  },
  {},
  {},
  { name: "الأقصر", sub: "LUXOR" },
  {},
  {
    name: "أسوان",
    sub: "ASWAN",
    terminal: "end",
    note: "الطرف الجنوبي للشبكة — قطارات النوم وتالجو الفاخر",
  },
];

/* ------------------------------ Facts & meta ----------------------------- */

const TALGO_FEATURES = [
  {
    icon: Armchair,
    title: "مقاعد قابلة للطفو",
    desc: "مقاعد واسعة تميل للخلف بمساند أرجل قابلة للتعديل طوال الرحلة",
  },
  {
    icon: ConciergeBell,
    title: "خدمة ضيافة",
    desc: "وجبات ومشروبات تقدم على مقعدك في درجة VIP طوال السفر",
  },
  {
    icon: Wifi,
    title: "إنترنت وشاشات",
    desc: "واي فاي على متن القطار مع شاشات وسائط متعددة أمام كل مقعد",
  },
  {
    icon: Users,
    title: "مقاعد عائلية",
    desc: "عربات عائلية ومقصورات خاصة للمجموعات الصغيرة والعائلات",
  },
];

const TALGO_STATS = [
  { value: "160", unit: "كم/س", label: "سرعة تشغيل تالجو" },
  { value: "2:15", unit: "س", label: "سجل القاهرة–الإسكندرية" },
  { value: "900", unit: "كم", label: "مدى خط النوم الليلي" },
];

const ENR_INTEGRATION: IntegrationPoint[] = [
  {
    station: "رمسيس ↔ الشهداء",
    badges: [IC_L1, IC_L2],
    tip: "ممر أنفاق مغطى يوصلك من صالة رمسيس مباشرة إلى رصيفي مترو الخط الأول والثاني في محطة الشهداء — نزولاً عبر المصاعد من الصالة الرئيسية",
  },
  {
    station: "بشتيل ↔ المونوريل",
    badges: [IC_MNR],
    tip: "محطة بشتيل متكاملة مع محور كمال عامر — اعبر الممر المغلق إلى رصيف مونوريل غرب النيل نحو المهندسين و6 أكتوبر",
  },
];

const ENR_ALERTS: NetworkAlert[] = [
  {
    tone: "delay",
    title: "صيانة دورية على مسارات الدلتا",
    desc: "بعض رحلات طنطا والمنصورة تتأخر دقائق معدودة خلال فترة الصيانة الليلية",
  },
  {
    tone: "info",
    title: "تحديث الجداول الموسمي",
    desc: "تُحدَّث مواعيد المغادرة مع بداية كل فصل — راجع القطار قبل السفر بأيام",
  },
  {
    tone: "info",
    title: "الحجز الرسمي على الشبكة",
    desc: "التذاكر متاحة عبر موقع سكك حديد مصر ومكاتب المحطات — الربط داخل واصل قريباً",
  },
  {
    tone: "neutral",
    title: "درجات التذاكر على الشبكة",
    desc: "VIP بتالجو في القمة، ثم الدرجات المميزة المكيفة والثانية والروسية الاقتصادية",
  },
];

/* -------------------------------- Screen --------------------------------- */

function ClassChip({ cls }: { cls: TrainClass }) {
  const meta = CLASS_META[cls];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold leading-4",
        meta.chip
      )}
    >
      {cls === "talgo" ? <Crown className="size-3" /> : null}
      {meta.label}
    </span>
  );
}

function StatusCell({ d, className }: { d: Departure; className?: string }) {
  return (
    <StatusPill tone={d.status} className={className}>
      {d.status === "ontime" ? (
        "في الموعد"
      ) : (
        <>
          متأخر <span className="num">{d.delayMin}</span> د
        </>
      )}
    </StatusPill>
  );
}

export default function TrainScreen({ navigate }: ScreenProps) {
  const [cls, setCls] = useState<BoardFilter>("all");
  const [corridor, setCorridor] = useState<Corridor>("delta");
  const rows = cls === "all" ? DEPARTURES : DEPARTURES.filter((d) => d.cls === cls);

  return (
    <div className="pb-24 md:pb-8">
      {/* ============================== HERO ============================== */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 md:px-6 md:pt-10">
        <NetworkHero
          code="ENR"
          color={ENR}
          mode="train"
          title="السكك الحديدية المصرية — رحلات وطنية فاخرة"
          tagline="تالجو وقطارات مميزة تربط القاهرة بالوجهات والمحافظات — قطبا رمسيس وبشتيل يحملانك إلى الدلتا والقناة والصعيد مباشرة من قلب العاصمة، بتبادل مغلق مع مترو القاهرة ومونوريلها."
          status="تداول طبيعي"
          stats={[
            { value: "5000+", unit: "كم", label: "شبكة السكك الوطنية" },
            { value: "700", unit: "+", label: "محطة على مستوى الجمهورية" },
            { value: "160", unit: "كم/س", label: "أقصى سرعة لتالجو" },
            { value: "1000", unit: "+", label: "رحلة قطار يومياً" },
          ]}
        />
      </div>

      {/* ============================ TERMINALS =========================== */}
      <NetworkSection
        tag="CAIRO TERMINALS"
        title="قطبا القاهرة الكبرى"
        desc="محطتان رئيسيتان توزعان رحلات الوطن: رمسيس شمالاً للدلتا والقناة، وبشتيل للمحافظات الصعيدية — كلاهما متصل بشبكة العاصمة دون الخروج إلى الشارع."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {TERMINALS.map((t) => (
            <article key={t.id} className="card-flat settle rounded-3xl p-6 hover:border-cloud">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="mono-tag block">{t.mono}</span>
                  <h3 className="mt-2 font-head text-[17px] font-black leading-snug text-ink">
                    {t.name}
                  </h3>
                  <span className="mono-tag mt-1 block !text-[9px]">{t.sub}</span>
                </div>
                <div className="flex flex-wrap [&>*+*]:-ms-1.5">
                  {t.badges.map((ic) => (
                    <InterchangeBadge key={ic.code} ic={ic} navigate={navigate} size="md" />
                  ))}
                </div>
              </div>

              <p className="mt-3 text-[12.5px] leading-7 text-slateink">{t.desc}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.facilities.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-bone bg-mist px-3 py-1.5 text-[11.5px] font-bold text-carbon"
                  >
                    <f.icon className="size-3.5" style={{ color: ENR }} />
                    {f.label}
                  </span>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-mist p-4">
                <span className="flex items-center gap-1.5 text-[12px] font-black text-ink">
                  <Signpost className="size-3.5" style={{ color: ENR }} />
                  {t.guideTitle}
                </span>
                <ol className="mt-3 grid gap-2">
                  {t.steps.map((step, i) => (
                    <li
                      key={step}
                      className="flex items-center gap-2.5 text-[12px] leading-6 text-slateink"
                    >
                      <span className="num grid size-5 shrink-0 place-items-center rounded-full border border-bone bg-white text-[10px] font-bold text-carbon">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </NetworkSection>

      {/* =========================== DEPARTURES =========================== */}
      <NetworkSection
        tag="DEPARTURES · RAMSIS STATION"
        title="لوحة المغادرات — محطة رمسيس"
        desc="جدول مغادرات اليوم من محطة مصر — للحظة بلحظة راجع التطبيق الرسمي لسكك حديد مصر."
        toolbar={
          <div className="flex flex-wrap gap-2">
            {BOARD_FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                active={cls === f.key}
                onClick={() => setCls(f.key)}
                aria-pressed={cls === f.key}
              >
                {f.label}
              </FilterChip>
            ))}
          </div>
        }
      >
        <div className="glass overflow-hidden rounded-3xl">
          {/* board header (md+) */}
          <div className="hidden border-b border-bone bg-white/70 px-5 py-3 md:grid md:grid-cols-[minmax(0,1.9fr)_minmax(0,1.4fr)_88px_76px_132px] md:items-center md:gap-4">
            {["TRAIN", "DESTINATION", "DEP", "PLAT", "STATUS"].map((h) => (
              <span key={h} className="mono-tag">
                {h}
              </span>
            ))}
          </div>

          {/* rows */}
          <div role="table" aria-label="مغادرات قطارات اليوم من محطة رمسيس">
            {rows.map((d) => (
              <div
                key={d.no + d.time}
                className="flex flex-col gap-2.5 border-b border-bone/80 px-4 py-4 last:border-b-0 sm:px-5 md:grid md:grid-cols-[minmax(0,1.9fr)_minmax(0,1.4fr)_88px_76px_132px] md:items-center md:gap-4"
              >
                <div className="flex items-center justify-between gap-3 md:contents">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-head text-[14.5px] font-bold text-ink">{d.name}</span>
                    <ClassChip cls={d.cls} />
                    <span className="num text-[11px] font-bold text-fog">#{d.no}</span>
                  </div>
                  <StatusCell d={d} className="md:hidden" />
                </div>

                <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-carbon">
                  <MapPin className="size-3.5 shrink-0 text-ash" />
                  <span className="min-w-0">
                    {d.dest}
                    <span className="mono-tag mt-0.5 block !text-[9px]">{d.destEn}</span>
                  </span>
                </div>

                <div className="flex items-center gap-6 md:contents">
                  <div>
                    <span className="mono-tag block !text-[9px]">DEP</span>
                    <span className="num mt-1 block text-[19px] font-extrabold leading-none text-ink">
                      {d.time}
                    </span>
                  </div>
                  <div>
                    <span className="mono-tag block !text-[9px]">PLAT</span>
                    <span className="num mt-1 block text-[19px] font-extrabold leading-none text-carbon">
                      {d.platform}
                    </span>
                  </div>
                </div>

                <div className="hidden md:block">
                  <StatusCell d={d} />
                </div>
              </div>
            ))}
          </div>

          {/* fare tiers footer */}
          <div className="flex flex-wrap items-center gap-2 border-t border-bone bg-white/70 px-4 py-4 sm:px-5">
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-carbon">
              <Ticket className="size-3.5" style={{ color: ENR }} />
              درجات التذاكر:
            </span>
            {FARE_TIERS.map((tier) => (
              <span
                key={tier.label}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[11.5px] font-bold",
                  tier.chip
                )}
              >
                {tier.label}
              </span>
            ))}
          </div>
        </div>
      </NetworkSection>

      {/* ============================= TALGO BAND ========================== */}
      <section className="dark-panel relative overflow-hidden" aria-label="قطار تالجو الفاخر">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full bg-[#fbbf24] opacity-[0.06]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -start-24 size-80 rounded-full bg-white opacity-[0.03]"
        />
        <div className="relative mx-auto w-full max-w-[1200px] px-4 py-14 md:px-6 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            <div>
              <span className="mono-tag block !text-[#fbbf24]/80">SPANISH TALGO EXPRESS</span>
              <h2 className="mt-4 font-head text-[26px] font-black leading-[1.3] text-white md:text-[36px]">
                تالجو — القطارات الفاخرة الإسبانية
              </h2>
              <p className="mt-3 max-w-xl text-[13.5px] leading-7 text-white/65">
                أعلى درجات الراحة على السكك المصرية: قطارات تالجو تسجل رحلة القاهرة–الإسكندرية في
                ساعتين و15 دقيقة، مع خطوط نوم فاخرة للرحلات الليلية نحو الأقصر وأسوان.
              </p>
              <div className="mt-8 flex flex-wrap gap-x-10 gap-y-6 border-t border-white/10 pt-6">
                {TALGO_STATS.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="num text-[28px] font-extrabold leading-none text-white">
                        {s.value}
                      </span>
                      <span className="text-[12px] font-bold text-white/60">{s.unit}</span>
                    </div>
                    <div className="mt-1.5 text-[12px] font-medium text-white/55">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {TALGO_FEATURES.map((f) => (
                <article
                  key={f.title}
                  className="settle rounded-2xl border border-white/10 bg-white/[0.05] p-5 hover:border-[#fbbf24]/40"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[#fbbf24]/15 text-[#fbbf24]">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-3 font-head text-[14.5px] font-bold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-white/60">{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CORRIDORS =========================== */}
      <NetworkSection
        tag="CORRIDORS"
        title="المحاور الوطنية الرئيسية"
        desc="حدد المحور لاستعراض أهم محطاته — انطلاقاً من رمسيس أو بشتيل في قلب القاهرة."
        toolbar={
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={corridor === "delta"}
              onClick={() => setCorridor("delta")}
              aria-pressed={corridor === "delta"}
            >
              <Building2 />
              خط الدلتا — الإسكندرية
            </FilterChip>
            <FilterChip
              active={corridor === "upper"}
              onClick={() => setCorridor("upper")}
              aria-pressed={corridor === "upper"}
            >
              <Landmark />
              خط الصعيد — أسيوط وأسوان
            </FilterChip>
          </div>
        }
      >
        <RouteDiagram
          color={ENR}
          stops={corridor === "delta" ? DELTA_LINE : UPPER_LINE}
          navigate={navigate}
        />
      </NetworkSection>

      {/* ========================== INTEGRATION =========================== */}
      <NetworkSection
        tag="METRO LINKS"
        title="التبادل مع شبكة العاصمة"
        desc="انتقالات مغلقة من رحلتك الوطنية إلى مترو القاهرة ومونوريلها — لا حاجة للخروج إلى الشارع."
      >
        <IntegrationBand points={ENR_INTEGRATION} navigate={navigate} />
      </NetworkSection>

      {/* ============================= ALERTS ============================= */}
      <NetworkSection
        tag="SERVICE NOTES"
        title="تنبيهات الخدمة"
        desc="آخر ملاحظات التشغيل على الشبكة الوطنية قبل حجز رحلتك."
      >
        <AlertsBand alerts={ENR_ALERTS} />
      </NetworkSection>

      {/* =============================== CTA ============================== */}
      <section
        className="mx-auto w-full max-w-[1200px] px-4 md:px-6"
        aria-label="حجز رحلة قطار"
      >
        <div className="dark-panel relative overflow-hidden rounded-3xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -start-20 size-64 rounded-full opacity-[0.14]"
            style={{ backgroundColor: ENR }}
          />
          <div className="relative flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-xl">
              <span className="mono-tag block !text-white/45">ENR BOOKING</span>
              <div className="mt-4 flex items-center gap-3">
                <LineBadge code="ENR" color={ENR} size="lg" />
                <span
                  className="grid size-9 place-items-center rounded-xl"
                  style={{ backgroundColor: `${ENR}2E`, color: "#ffffff" }}
                >
                  <Crown className="size-4" />
                </span>
              </div>
              <h2 className="mt-4 font-head text-[24px] font-black leading-[1.35] text-white md:text-[30px]">
                احجز رحلتك على السكك الحديدية
              </h2>
              <p className="mt-2 text-[13.5px] leading-7 text-white/65">
                تالجو ومميز مكيف وكل درجات التذاكر — جدول المغادرة الكامل وتأكيد الحجز داخل واصل
                قريباً.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <button
                type="button"
                onClick={() =>
                  toast({
                    title: "الخدمة قادمة",
                    description: "الحجز متاح قريبًا عبر التطبيق الرسمي لسكك حديد مصر.",
                  })
                }
                className="settle-fast inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-7 font-head text-[14px] font-bold text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Ticket className="size-4" />
                احجز رحلتك
              </button>
              <button
                type="button"
                onClick={() => navigate("planner")}
                className="settle-fast inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 px-7 font-head text-[14px] font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <RouteIcon className="size-4" />
                خطط رحلتك
              </button>
              <button
                type="button"
                onClick={() => navigate("map")}
                className="settle-fast inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 px-7 font-head text-[14px] font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <MapPin className="size-4" />
                على الخريطة
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
