"use client";

/**
 * Wasel Egypt — shared network-screen template (owned by Task 3-d).
 * One anatomy for LRT / Monorail / BRT / ENR screens, differentiated
 * by the official line color and mode facts:
 *   NetworkHero · RouteDiagram · StationGrid · FactsBand ·
 *   IntegrationBand · AlertsBand · NetworkCTA · RingRoadVisualizer
 *
 * Style contract: white canvas, ink text, bone hairlines, flat cards.
 * Official color appears ONLY as mode identity (badges, trunk, tint).
 */

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Accessibility,
  ArrowUpFromDot,
  ChevronsUpDown,
  CircleParking,
  Footprints,
  MapPin,
  Milestone,
  RotateCcw,
  RotateCw,
  Route as RouteIcon,
  Split,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineBadge,
  ModeIcon,
  SectionHead,
  StatusPill,
  MODE_LABEL_AR,
  type StatusTone,
} from "@/components/kit";
import type { TransitMode } from "@/lib/transit-data";
import type { NavigateFn, ScreenKey } from "@/lib/navigation";

/* ================================ Types ================================== */

export interface DiagramInterchange {
  code: string; // L1, L2, L3, LRT, MNR, BRT, ENR
  color: string;
  screen?: ScreenKey;
  label?: string; // Arabic tooltip
}

export interface NetworkStop {
  /** Arabic station name — undefined renders an unnamed minor tick */
  name?: string;
  /** Latin secondary label (mono, LTR) */
  sub?: string;
  interchanges?: DiagramInterchange[];
  terminal?: "start" | "end";
  /** branch note, e.g. "من هنا يتفرع خط العاشر من رمضان" */
  junction?: string;
  note?: string;
  /* grid-only fields */
  facilities?: StationFacility[];
  tag?: string;
}

export interface HeroStat {
  value: string;
  unit?: string;
  label: string;
}

export interface NetworkFact {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface IntegrationPoint {
  station: string;
  badges: DiagramInterchange[];
  tip: string;
}

export interface NetworkAlert {
  tone: StatusTone;
  title: string;
  desc?: string;
}

export interface RingHub {
  id: string;
  labelLines: string[];
  angle: number; // degrees — 0 = top, clockwise
  interchanges?: DiagramInterchange[];
  tip: string;
  bridge?: string;
}

/* ----------------------------- Facilities map ---------------------------- */

export type StationFacility = "parking" | "feeder" | "access";

const FACILITY_META: Record<StationFacility, { icon: LucideIcon; label: string }> = {
  parking: { icon: CircleParking, label: "مواقف سيارات" },
  feeder: { icon: Footprints, label: "مشاوير وتغذية" },
  access: { icon: Accessibility, label: "خدمات ذوي الهمم" },
};

/* -------------------------- Interchange badge ---------------------------- */

export function InterchangeBadge({
  ic,
  navigate,
  size = "sm",
  className,
}: {
  ic: DiagramInterchange;
  navigate: NavigateFn;
  size?: "sm" | "md";
  className?: string;
}) {
  const badge = <LineBadge code={ic.code} color={ic.color} size={size} className={className} />;
  if (!ic.screen) return badge;
  return (
    <button
      type="button"
      title={ic.label ?? `الانتقال إلى شبكة ${ic.code}`}
      onClick={() => navigate(ic.screen as ScreenKey)}
      className="settle-fast rounded-full cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/50"
    >
      {badge}
    </button>
  );
}

/* ============================== Hero band ================================ */

export function NetworkHero({
  code,
  color,
  mode,
  title,
  tagline,
  stats,
  status,
  statusTone = "ontime",
  className,
}: {
  code: string;
  color: string;
  mode: TransitMode;
  title: string;
  tagline: string;
  stats: HeroStat[];
  status?: string;
  statusTone?: StatusTone;
  className?: string;
}) {
  return (
    <section
      className={cn("relative overflow-hidden rounded-3xl border p-6 md:p-10", className)}
      style={{ backgroundColor: `${color}0D`, borderColor: `${color}38` }}
    >
      {/* restrained watermark — flat, no gradient */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -end-8 opacity-[0.06]"
        style={{ color }}
      >
        <ModeIcon mode={mode} className="size-48 rotate-12" strokeWidth={1} />
      </span>

      <div className="relative flex flex-wrap items-center gap-2">
        <span
          className="num inline-flex h-8 items-center rounded-full border px-3.5 font-mono text-[12px] font-bold"
          style={{ backgroundColor: `${color}14`, color, borderColor: `${color}45` }}
        >
          {code}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-bone bg-white/85 px-3.5 text-[12px] font-bold text-carbon">
          <ModeIcon mode={mode} className="size-3.5" />
          {MODE_LABEL_AR[mode]}
        </span>
        {status ? (
          <StatusPill tone={statusTone} className="bg-white/85">
            {status}
          </StatusPill>
        ) : null}
      </div>

      <h1 className="relative mt-5 max-w-3xl font-head text-[26px] font-black leading-[1.3] text-ink md:text-[38px]">
        {title}
      </h1>
      <p className="relative mt-3 max-w-2xl text-[14px] leading-7 text-slateink">{tagline}</p>

      <div
        className="relative mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t pt-6 md:grid-cols-4"
        style={{ borderColor: `${color}2E` }}
      >
        {stats.map((st) => (
          <div key={st.label}>
            <div className="flex items-baseline gap-1.5">
              <span className="num text-[28px] font-extrabold leading-none tracking-tight text-ink md:text-[34px]">
                {st.value}
              </span>
              {st.unit ? (
                <span className="text-[12px] font-bold text-slateink">{st.unit}</span>
              ) : null}
            </div>
            <div className="mt-1.5 text-[12px] font-medium text-slateink">{st.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================= Section shell ============================= */

export function NetworkSection({
  tag,
  title,
  desc,
  tint = false,
  toolbar,
  className,
  children,
}: {
  tag?: string;
  title: string;
  desc?: string;
  /** tint: full-width mist band for rhythm change */
  tint?: boolean;
  /** controls row rendered under the head (switchers, chips…) */
  toolbar?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("py-12 md:py-16", tint && "border-y border-bone bg-mist", className)}
      aria-label={title}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
        <SectionHead tag={tag} title={title} desc={desc} />
        {toolbar ? <div className="mt-6">{toolbar}</div> : null}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/* ============================ Route diagram ============================== */
/* Vertical spine on mobile, horizontal alternating schematic on md+.       */
/* Minor ticks = unnamed intermediate stations (schematic convention).      */

function StopMarker({ stop, color }: { stop: NetworkStop; color: string }) {
  const lift = { boxShadow: "0 0 0 4px #ffffff" };
  if (!stop.name) {
    return (
      <span
        className="z-10 block size-2.5 rounded-full bg-white"
        style={{ border: `2px solid ${color}`, ...lift }}
      />
    );
  }
  if (stop.terminal) {
    return (
      <span
        className="z-10 block size-4 rounded-[5px]"
        style={{ backgroundColor: color, ...lift }}
      />
    );
  }
  if (stop.junction) {
    return (
      <span
        className="z-10 grid size-5 place-items-center rounded-full bg-white"
        style={{ border: `2px dashed ${color}`, ...lift }}
      >
        <Split className="size-2.5" style={{ color }} />
      </span>
    );
  }
  if (stop.interchanges?.length) {
    return (
      <span
        className="z-10 grid size-5 place-items-center rounded-full bg-white"
        style={{ border: `2px solid ${color}`, ...lift }}
      >
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      </span>
    );
  }
  return (
    <span
      className="z-10 block size-3.5 rounded-full bg-white"
      style={{ border: `3px solid ${color}`, ...lift }}
    />
  );
}

function TerminalChip({ kind, color }: { kind: "start" | "end"; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-4"
      style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}30` }}
    >
      {kind === "start" ? "المحطة الأولى" : "نهاية الخط"}
    </span>
  );
}

function StopLabels({
  stop,
  color,
  navigate,
  align,
}: {
  stop: NetworkStop;
  color: string;
  navigate: NavigateFn;
  align: "start" | "center";
}) {
  if (!stop.name) return null;
  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          align === "center" ? "justify-center" : "justify-start"
        )}
      >
        {stop.terminal ? <TerminalChip kind={stop.terminal} color={color} /> : null}
        {stop.junction && align === "center" ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold leading-4"
            style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}30` }}
          >
            <Split className="size-2.5" />
            تفرع
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "font-head font-bold leading-[1.35] text-ink",
          stop.terminal ? "text-[13px] md:text-[14px]" : "text-[12px] md:text-[12.5px]",
          align === "center" ? "line-clamp-2 max-w-[96px] text-center" : ""
        )}
      >
        {stop.name}
      </span>
      {align === "start" && stop.sub ? (
        <span className="mono-tag !text-[9px]">{stop.sub}</span>
      ) : null}
      {stop.interchanges?.length ? (
        <div
          className={cn(
            "flex flex-wrap gap-1",
            align === "center" ? "justify-center" : "justify-start"
          )}
        >
          {stop.interchanges.map((ic) => (
            <InterchangeBadge key={ic.code} ic={ic} navigate={navigate} />
          ))}
        </div>
      ) : null}
      {align === "start" && stop.junction ? (
        <span
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold"
          style={{ color }}
        >
          <Split className="size-3.5" />
          {stop.junction}
        </span>
      ) : null}
      {align === "start" && stop.note ? (
        <span className="text-[12px] leading-6 text-slateink">{stop.note}</span>
      ) : null}
    </>
  );
}

export function RouteDiagram({
  color,
  stops,
  navigate,
  className,
}: {
  color: string;
  stops: NetworkStop[];
  navigate: NavigateFn;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* ---------- vertical (mobile) ---------- */}
      <div className="md:hidden">
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 w-[3px] rounded-full"
            style={{ backgroundColor: color, insetInlineStart: 6.5 }}
          />
          <ul>
            {stops.map((stop, i) => (
              <li key={i} className="relative flex gap-3.5 py-3 first:pt-0 last:pb-0">
                <span className="relative z-10 flex w-4 shrink-0 justify-center pt-1">
                  <StopMarker stop={stop} color={color} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1 pt-0.5">
                  {stop.name ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-[10px] font-bold text-fog">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "font-head font-bold text-ink",
                          stop.terminal ? "text-[15px]" : "text-[13.5px]"
                        )}
                      >
                        {stop.name}
                      </span>
                      {stop.terminal ? <TerminalChip kind={stop.terminal} color={color} /> : null}
                    </div>
                  ) : null}
                  <StopLabels stop={stop} color={color} navigate={navigate} align="start" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------- horizontal (md+) ---------- */}
      <div className="hidden md:block">
        <div className="overflow-x-auto pb-2">
          <div className="relative min-w-max">
            <span
              aria-hidden="true"
              className="absolute top-[102px] h-[3px] rounded-full start-[52px] end-[52px]"
              style={{ backgroundColor: color }}
            />
            <div className="flex">
              {stops.map((stop, i) => {
                const above = i % 2 === 0;
                return (
                  <div key={i} className="flex w-[104px] shrink-0 flex-col items-center">
                    <div
                      className={cn(
                        "flex h-24 w-full flex-col items-center gap-1.5 pb-3",
                        above ? "justify-end" : "justify-start"
                      )}
                    >
                      {above ? (
                        <StopLabels stop={stop} color={color} navigate={navigate} align="center" />
                      ) : null}
                    </div>
                    <div className="flex h-4 w-full items-center justify-center">
                      <StopMarker stop={stop} color={color} />
                    </div>
                    <div
                      className={cn(
                        "flex h-24 w-full flex-col items-center gap-1.5 pt-3",
                        above ? "justify-start" : "justify-end"
                      )}
                    >
                      {!above ? (
                        <StopLabels stop={stop} color={color} navigate={navigate} align="center" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-medium text-ash">
          <Milestone className="size-3.5" />
          اسحب أفقياً لاستعراض كامل المسار — الحلقات المزدوجة نقاط تبادل
        </p>
      </div>
    </div>
  );
}

/* ============================= Stations grid ============================= */

export function StationGrid({
  color,
  stops,
  navigate,
  initial = 8,
  className,
}: {
  color: string;
  stops: NetworkStop[];
  navigate: NavigateFn;
  initial?: number;
  className?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const named = stops.filter((s) => s.name);
  const visible = showAll ? named : named.slice(0, initial);

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((stop) => (
          <article key={stop.name} className="card-flat settle rounded-2xl p-4 hover:border-cloud">
            <div className="flex items-center justify-between gap-2">
              <span className="num text-[11px] font-bold text-fog">
                {String(named.indexOf(stop) + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {stop.interchanges?.map((ic) => (
                  <InterchangeBadge key={ic.code} ic={ic} navigate={navigate} />
                ))}
              </div>
            </div>
            <h3 className="mt-2 font-head text-[14.5px] font-bold text-ink">{stop.name}</h3>
            {stop.sub ? <span className="mono-tag mt-1 block">{stop.sub}</span> : null}
            {stop.tag ? (
              <span
                className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}30` }}
              >
                {stop.tag}
              </span>
            ) : null}
            {stop.note ? (
              <p className="mt-2 line-clamp-2 text-[12px] leading-6 text-slateink">{stop.note}</p>
            ) : null}
            {stop.facilities?.length ? (
              <div className="mt-3 flex items-center gap-1.5 border-t border-bone pt-3">
                {stop.facilities.map((f) => {
                  const meta = FACILITY_META[f];
                  const Icon = meta.icon;
                  return (
                    <span
                      key={f}
                      title={meta.label}
                      className="grid size-7 place-items-center rounded-full border border-bone bg-mist text-slateink"
                    >
                      <Icon className="size-3.5" />
                      <span className="sr-only">{meta.label}</span>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {named.length > initial ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="settle-fast inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-bone bg-white px-5 text-[13px] font-bold text-carbon hover:border-cloud hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/50"
            aria-expanded={showAll}
          >
            <ChevronsUpDown className={cn("size-4", showAll && "rotate-180")} />
            {showAll ? "عرض أقل" : `عرض كل المحطات (${named.length})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* =============================== Facts band ============================== */

export function FactsBand({
  color,
  facts,
  className,
}: {
  color: string;
  facts: NetworkFact[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {facts.map((f) => {
        const Icon = f.icon;
        return (
          <article key={f.title} className="card-flat rounded-2xl p-5">
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ backgroundColor: `${color}14`, color }}
            >
              <Icon className="size-5" />
            </span>
            <h3 className="mt-3 font-head text-[14.5px] font-bold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-6 text-slateink">{f.desc}</p>
          </article>
        );
      })}
    </div>
  );
}

/* ============================ Integration band =========================== */

export function IntegrationBand({
  points,
  navigate,
  className,
}: {
  points: IntegrationPoint[];
  navigate: NavigateFn;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      {points.map((p) => (
        <article key={p.station} className="card-flat rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-head text-[14.5px] font-bold text-ink">
              <MapPin className="size-4 text-ash" />
              {p.station}
            </h3>
            <div className="flex flex-wrap [&>*+*]:-ms-1.5">
              {p.badges.map((ic) => (
                <InterchangeBadge key={ic.code} ic={ic} navigate={navigate} size="md" />
              ))}
            </div>
          </div>
          <p className="mt-2.5 text-[12.5px] leading-6 text-slateink">{p.tip}</p>
        </article>
      ))}
    </div>
  );
}

/* =============================== Alerts band ============================= */

const ALERT_TONE_LABEL: Record<StatusTone, string> = {
  ontime: "منتظم",
  delay: "تنبيه",
  info: "معلومة",
  closed: "متوقف",
  neutral: "ملاحظة",
};

export function AlertsBand({
  alerts,
  className,
}: {
  alerts: NetworkAlert[];
  className?: string;
}) {
  return (
    <div className={cn("card-mist divide-y divide-bone rounded-3xl", className)}>
      {alerts.map((a) => (
        <div key={a.title} className="flex items-start gap-3 p-4 md:px-5">
          <StatusPill tone={a.tone} className="mt-0.5 shrink-0 bg-white/70">
            {ALERT_TONE_LABEL[a.tone]}
          </StatusPill>
          <div className="min-w-0">
            <h3 className="text-[13.5px] font-bold text-ink">{a.title}</h3>
            {a.desc ? (
              <p className="mt-0.5 text-[12.5px] leading-6 text-slateink">{a.desc}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================ CTA ==================================== */

export function NetworkCTA({
  code,
  color,
  mode,
  modeLabel,
  navigate,
  className,
}: {
  code: string;
  color: string;
  mode: TransitMode;
  modeLabel: string;
  navigate: NavigateFn;
  className?: string;
}) {
  return (
    <section
      className={cn("mx-auto w-full max-w-[1200px] px-4 md:px-6", className)}
      aria-label="دعوة للتخطيط"
    >
      <div className="dark-panel relative overflow-hidden rounded-3xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -start-20 size-64 rounded-full opacity-[0.08]"
          style={{ backgroundColor: color }}
        />
        <div className="relative flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-xl">
            <span className="mono-tag block !text-white/45">WASEL PLANNER</span>
            <div className="mt-4 flex items-center gap-3">
              <LineBadge code={code} color={color} size="lg" />
              <span
                className="grid size-9 place-items-center rounded-xl"
                style={{ backgroundColor: `${color}2E`, color: "#ffffff" }}
              >
                <ModeIcon mode={mode} className="size-4" />
              </span>
            </div>
            <h2 className="mt-4 font-head text-[24px] font-black leading-[1.35] text-white md:text-[30px]">
              خطط رحلتك عبر {modeLabel}
            </h2>
            <p className="mt-2 text-[13.5px] leading-7 text-white/65">
              أوقات المغادرة، الأسعار، ونقاط التبادل — مُحسّنة لحظياً داخل مخطط الرحلات.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <button
              type="button"
              onClick={() => navigate("planner")}
              className="settle-fast inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-7 font-head text-[14px] font-bold text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <RouteIcon className="size-4" />
              خطط رحلتك عبر {modeLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate("map")}
              className="settle-fast inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 px-7 font-head text-[14px] font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <MapPin className="size-4" />
              شاهد الشبكة على الخريطة
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================= Ring road visualizer ========================== */
/* BRT-only: circular locator with clockwise/counter-clockwise tracks,      */
/* major interchange hubs + minor stop ticks (deterministic layout).        */

const RING_VB = 380;
const RING_C = RING_VB / 2;
const RING_R = 118;
const RING_LABEL_R = 152;

function polar(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: RING_C + r * Math.cos(rad), y: RING_C + r * Math.sin(rad) };
}

export function RingRoadVisualizer({
  color,
  hubs,
  selectedId,
  onSelect,
  className,
}: {
  color: string;
  hubs: RingHub[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const sorted = [...hubs].sort((a, b) => a.angle - b.angle);
  const minorTicks: { x: number; y: number }[] = [];
  sorted.forEach((hub, i) => {
    const next = sorted[(i + 1) % sorted.length];
    let span = next.angle - hub.angle;
    if (span <= 0) span += 360;
    for (let k = 1; k <= 6; k++) {
      const a = hub.angle + (span * k) / 7;
      minorTicks.push(polar(a, RING_R));
    }
  });

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${RING_VB} ${RING_VB}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="مخطط دائري للطريق الدائري ومحطاته"
      >
        {/* highway band */}
        <circle cx={RING_C} cy={RING_C} r={RING_R} fill="none" stroke="#eeeeee" strokeWidth={20} />
        {/* counter-clockwise dashed track */}
        <circle
          cx={RING_C}
          cy={RING_C}
          r={RING_R}
          fill="none"
          stroke={color}
          strokeOpacity={0.28}
          strokeWidth={3}
          strokeDasharray="3 9"
          className="dash-flow"
          style={{ animationDirection: "reverse" }}
        />
        {/* dedicated lane */}
        <circle
          cx={RING_C}
          cy={RING_C}
          r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          className="dash-flow"
        />
        {/* minor stop ticks */}
        {minorTicks.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} opacity={0.5} />
        ))}
        {/* hub labels */}
        {hubs.map((hub) => {
          const rad = ((hub.angle - 90) * Math.PI) / 180;
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          const pos = polar(hub.angle, RING_LABEL_R);
          const anchor = Math.abs(c) < 0.42 ? "middle" : c > 0 ? "start" : "end";
          const dy = s < -0.5 ? -2 : s > 0.5 ? (hub.labelLines.length > 1 ? 10 : 12) : 4;
          return (
            <text
              key={hub.id}
              x={pos.x}
              y={pos.y + dy}
              textAnchor={anchor}
              fontSize={11}
              fontWeight={700}
              fill="#202020"
              style={{ fontFamily: "var(--font-head)" }}
            >
              {hub.labelLines.map((line, li) => (
                <tspan key={li} x={pos.x} dy={li === 0 ? 0 : 13}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
        {/* hub rings */}
        {hubs.map((hub) => {
          const pos = polar(hub.angle, RING_R);
          const selected = hub.id === selectedId;
          return (
            <g key={hub.id} pointerEvents="none">
              {hub.interchanges?.length ? (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={selected ? 13 : 12}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.45}
                  strokeWidth={1.5}
                />
              ) : null}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={selected ? 8 : 7}
                fill={selected ? color : "#ffffff"}
                stroke={color}
                strokeWidth={3}
              />
            </g>
          );
        })}
      </svg>

      {/* accessible hub buttons overlayed on the SVG geometry */}
      {hubs.map((hub) => {
        const pos = polar(hub.angle, RING_R);
        return (
          <button
            key={hub.id}
            type="button"
            onClick={() => onSelect(hub.id)}
            title={hub.labelLines.join(" — ")}
            aria-label={hub.labelLines.join(" — ")}
            aria-pressed={hub.id === selectedId}
            className="absolute z-10 grid size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive/60"
            style={{ left: `${(pos.x / RING_VB) * 100}%`, top: `${(pos.y / RING_VB) * 100}%` }}
          >
            <span
              className={cn(
                "settle-fast block size-4 rounded-full",
                hub.id === selectedId ? "scale-110" : "bg-white"
              )}
              style={
                hub.id === selectedId
                  ? { backgroundColor: color }
                  : { border: `2.5px solid ${color}` }
              }
            />
          </button>
        );
      })}

      {/* center readout */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <span className="mono-tag block">RING ROAD BRT</span>
          <span className="num mt-1 block text-[42px] font-extrabold leading-none text-ink">
            106
          </span>
          <span className="mt-1 block text-[12px] font-bold text-slateink">
            كم مسار مخصص معزول
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Ring direction legend ------------------------- */

export function RingDirectionLegend({ color }: { color: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-bone bg-white px-3 py-1.5 text-[11.5px] font-bold text-carbon">
        <RotateCw className="size-3.5" style={{ color }} />
        مع عقارب الساعة
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-bone bg-white px-3 py-1.5 text-[11.5px] font-bold text-carbon">
        <RotateCcw className="size-3.5" style={{ color }} />
        عكس عقارب الساعة
      </span>
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ash">
        <ArrowUpFromDot className="size-3.5" />
        اتجاهان دورانيان على نفس المسار المعزول
      </span>
    </div>
  );
}
