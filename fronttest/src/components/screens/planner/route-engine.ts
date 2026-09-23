/**
 * Wasel Egypt — deterministic multimodal route engine (planner-local).
 *
 * buildRoutes(from, to) ranks up to 3 plausible Greater Cairo itineraries
 * (fastest / cheapest / least-transfers) across Metro L1–L3, Capital LRT,
 * East Nile Monorail and walking connectors. Everything is derived from
 * `seeded()` so `journey-active` can rebuild the exact same route from
 * { from, to, route-index } params without any backend or storage.
 */

import { seeded, METRO_FARE_TIERS, type TransitMode } from "@/lib/transit-data";
import {
  LINE_STATION_MAP,
  findLocation,
} from "./stations-data";

/* ------------------------------- types -------------------------------- */

export type RankTag = "fastest" | "cheapest" | "least-transfers";

export interface RouteLeg {
  mode: TransitMode;
  /** L1 | L2 | L3 | LRT | MNR | WALK */
  lineCode: string;
  lineColor: string;
  fromAr: string;
  toAr: string;
  stationsCount: number;
  /** riding minutes (or walking minutes when mode === "walk") */
  minutes: number;
  /** official published fare in EGP — null when no fare data is published */
  fareEGP: number | null;
  /** boarding walk/transfer minutes attached before this leg */
  walkMinutes?: number;
}

export interface RouteScore {
  time: number; // 40%
  walk: number; // 20%
  transfers: number; // 20%
  fare: number; // 10%
  reliability: number; // 10%
}

export interface RouteOption {
  id: string;
  rank: number;
  rankTag: RankTag;
  rankLabelAr: string;
  /** door-to-door riding + waiting minutes */
  totalMinutes: number;
  /** combined platform/interchange waiting minutes */
  waitMinutes: number;
  /** official unified metro fare — null when not published */
  fareEGP: number | null;
  transfers: number;
  walkMinutes: number;
  distanceKm: number;
  legs: RouteLeg[];
  /** e.g. "تبديل في محطة العتبة للرصيف 2" */
  transferHintAr?: string;
  score: RouteScore;
}

/* ------------------------------ constants ------------------------------ */

export const LINE_COLORS: Record<string, string> = {
  L1: "#1d4ed8",
  L2: "#dc2626",
  L3: "#16a34a",
  LRT: "#0284c7",
  MNR: "#7c3aed",
  WALK: "#64748b",
};

export const LINE_MODE: Record<string, TransitMode> = {
  L1: "metro",
  L2: "metro",
  L3: "metro",
  LRT: "lrt",
  MNR: "monorail",
  WALK: "walk",
};

/** official line names for direction hints */
const LINE_TERMINALS: Record<string, [string, string]> = {
  L1: ["حلوان", "المرج الجديدة"],
  L2: ["المنيب", "شبرا الخيمة"],
  L3: ["عدلي منصور", "جامعة القاهرة"],
  LRT: ["عدلي منصور", "مدينة الفنون والثقافة"],
  MNR: ["إستاد القاهرة", "مدينة العدالة"],
};

/** minutes per station hop per line (realistic operating speeds) */
const MINUTES_PER_STATION: Record<string, number> = {
  L1: 2,
  L2: 2.2,
  L3: 1.9,
  LRT: 3.2,
  MNR: 2.4,
};

/** station alias normalization (L3 "الاستاد" == MNR "إستاد القاهرة") */
const ALIASES: Record<string, string> = {
  الاستاد: "إستاد القاهرة",
  "إستاد القاهرة": "إستاد القاهرة",
};

/** POI → nearest access rail station */
const POI_ACCESS: Record<string, string> = {
  "ميدان التحرير": "السادات",
  "المتحف المصري": "السادات",
  "مصر الجديدة": "هليوبوليس",
  "مدينة نصر": "إستاد القاهرة",
  "المعادي الجديدة": "المعادي",
  الهرم: "فيصل",
  "مدينة السادس من أكتوبر": "فيصل",
  "العاصمة الإدارية الجديدة": "حي المال والأعمال",
  "التجمع الخامس": "الحي السابع",
  الرحاب: "الحي السابع",
  المهندسين: "البحوث",
  "وسط البلد": "محمد نجيب",
  "الدرب الأحمر": "سعد زغلول",
  شبرا: "روض الفرج",
  الزيتون: "حدائق الزيتون",
  "حي القبة": "كوبري القبة",
  "مدينة 15 مايو": "حلوان",
  "القاهرة الجديدة": "الحي السابع",
  بولاق: "جامعة الدول العربية",
  "جامعة القاهرة الجديدة": "جامعة القاهرة",
};

/* ----------------------------- fare helpers ---------------------------- */

/** Official Cairo Metro fare tier (Oct-2024 matrix) by station count */
export function metroFare(stationsCount: number): number {
  const n = Math.max(1, stationsCount);
  if (n <= 9) return 8;
  if (n <= 16) return 10;
  if (n <= 23) return 15;
  return 20;
}

export const FARE_MATRIX_NOTE_AR = `تسعيرة المترو الرسمية المعتمدة (أكتوبر 2024): ${METRO_FARE_TIERS.map(
  (t) => `${t.stations} محطة — ${t.fare} ج.م`
).join(" · ")} — المصدر: وزارة النقل / الشركة المصرية لإدارة وتشغيل المترو.`;

/* ------------------------------ primitives ----------------------------- */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function normStation(name: string): string {
  return ALIASES[name] ?? name;
}

function indexOnLine(line: string, station: string): number {
  const arr = LINE_STATION_MAP[line] ?? [];
  return arr.indexOf(normStation(station));
}

/** stations actually traversed on a line between two of its stations (inclusive) */
export function stationsBetween(line: string, a: string, b: string): string[] {
  const arr = LINE_STATION_MAP[line] ?? [];
  const i = indexOnLine(line, a);
  const j = indexOnLine(line, b);
  if (i < 0 || j < 0) return [a, b];
  const [lo, hi] = i <= j ? [i, j] : [j, i];
  return arr.slice(lo, hi + 1);
}

/** direction hint: which terminal the rider is heading toward */
export function directionAr(line: string, fromAr: string, toAr: string): string {
  const terminals = LINE_TERMINALS[line];
  if (!terminals) return "";
  const [t1, t2] = terminals;
  return indexOnLine(line, toAr) >= indexOnLine(line, fromAr) ? t2 : t1;
}

/** deterministic door side hint for alighting at a station */
export function doorSideAr(station: string, seedBase: number): string {
  return seeded(seedBase + hashString(station)) > 0.5
    ? "الباب من الجهة اليسرى"
    : "الباب من الجهة اليمنى";
}

/* --------------------------- network topology --------------------------- */

/** real interchange stations between lines (normalized) */
const LINE_CONNECTIONS: { a: string; b: string; at: string }[] = [
  { a: "L1", b: "L2", at: "السادات" },
  { a: "L1", b: "L2", at: "الشهداء" },
  { a: "L1", b: "L3", at: "جمال عبد الناصر" },
  { a: "L2", b: "L3", at: "العتبة" },
  { a: "L2", b: "L3", at: "جامعة القاهرة" },
  { a: "L3", b: "LRT", at: "عدلي منصور" },
  { a: "L3", b: "MNR", at: "إستاد القاهرة" },
  { a: "LRT", b: "MNR", at: "مدينة الفنون والثقافة" },
];

/** which lines serve a station (normalized name) */
function linesServing(station: string): string[] {
  const target = normStation(station);
  const out: string[] = [];
  for (const [code, arr] of Object.entries(LINE_STATION_MAP)) {
    if (arr.some((s) => normStation(s) === target)) out.push(code);
  }
  return out;
}

/** resolve a free-text location to { accessStation, walkMinutes } */
function resolveAccess(name: string, seed: number): { access: string; walkMinutes: number; known: boolean } | null {
  const loc = findLocation(name);
  if (!loc) {
    // unknown free text — attach to a deterministic pseudo-corridor via L1 midpoint
    const s = seeded(seed);
    return { access: "السادات", walkMinutes: 4 + Math.round(s * 6), known: false };
  }
  if (loc.lines[0] === "POI") {
    const access = POI_ACCESS[loc.name] ?? "السادات";
    return { access, walkMinutes: 3 + Math.round(seeded(seed) * 5), known: true };
  }
  return { access: normStation(loc.name), walkMinutes: 0, known: true };
}

/* --------------------------- path generation ---------------------------- */

interface PathSpec {
  /** e.g. ["WALK","L1","LRT","WALK"] */
  lines: string[];
  /** board/alight pairs per rail line, aligned with rail entries of `lines` */
  hops: { from: string; to: string }[];
}

/** find candidate line sequences connecting fromAccess → toAccess (≤2 transfers) */
function candidatePaths(fromAccess: string, toAccess: string): string[][] {
  const fromLines = linesServing(fromAccess);
  const toLines = linesServing(toAccess);
  const out: string[][] = [];

  for (const a of fromLines) {
    for (const b of toLines) {
      if (a === b) {
        out.push([a]);
        continue;
      }
      // one transfer
      const direct = LINE_CONNECTIONS.find(
        (c) => (c.a === a && c.b === b) || (c.b === a && c.a === b)
      );
      if (direct) {
        out.push([a, b]);
        continue;
      }
      // two transfers via an intermediate line
      for (const mid of Object.keys(LINE_STATION_MAP)) {
        if (mid === a || mid === b) continue;
        const c1 = LINE_CONNECTIONS.find(
          (c) => (c.a === a && c.b === mid) || (c.b === a && c.a === mid)
        );
        const c2 = LINE_CONNECTIONS.find(
          (c) => (c.a === mid && c.b === b) || (c.b === mid && c.a === b)
        );
        if (c1 && c2) out.push([a, mid, b]);
      }
    }
  }
  // dedupe, keep stable order
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = p.join(">");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** build a PathSpec with concrete board/alight stations across a line sequence */
function pathSpec(fromAccess: string, toAccess: string, lines: string[]): PathSpec | null {
  const hops: { from: string; to: string }[] = [];
  let cursor = fromAccess;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;
    let alight: string;
    if (isLast) {
      alight = normStation(toAccess);
    } else {
      const next = lines[i + 1];
      const conn =
        LINE_CONNECTIONS.find((c) => c.a === line && c.b === next) ??
        LINE_CONNECTIONS.find((c) => c.b === line && c.a === next);
      if (!conn) return null;
      alight = conn.at;
    }
    if (indexOnLine(line, cursor) < 0 || indexOnLine(line, alight) < 0) return null;
    hops.push({ from: cursor, to: alight });
    cursor = alight;
  }
  return { lines, hops };
}

/* ----------------------------- leg building ----------------------------- */

function buildRailLeg(
  line: string,
  hop: { from: string; to: string },
  walkBefore: number,
  seedBase: number
): RouteLeg {
  const stations = stationsBetween(line, hop.from, hop.to);
  const stationsCount = stations.length;
  const per = MINUTES_PER_STATION[line] ?? 2;
  const jitter = seeded(seedBase) * 0.35 + 0.85; // 0.85x – 1.2x
  const minutes = Math.max(2, Math.round(stationsCount * per * jitter));
  const isMetro = line === "L1" || line === "L2" || line === "L3";
  return {
    mode: LINE_MODE[line] ?? "metro",
    lineCode: line,
    lineColor: LINE_COLORS[line],
    fromAr: hop.from,
    toAr: hop.to,
    stationsCount,
    minutes,
    fareEGP: isMetro ? metroFare(stationsCount) : null,
    walkMinutes: walkBefore,
  };
}

function buildWalkLeg(fromAr: string, toAr: string, minutes: number): RouteLeg {
  return {
    mode: "walk",
    lineCode: "WALK",
    lineColor: LINE_COLORS.WALK,
    fromAr,
    toAr,
    stationsCount: 0,
    minutes,
    fareEGP: 0,
  };
}

function assembleRoute(
  from: string,
  to: string,
  spec: PathSpec,
  fromWalk: number,
  toWalk: number,
  seed: number,
  waitBias: number
): RouteOption {
  const legs: RouteLeg[] = [];
  if (fromWalk > 0) {
    legs.push(buildWalkLeg(from, spec.hops[0].from, fromWalk));
  }
  for (let i = 0; i < spec.lines.length; i++) {
    const walkBefore = i === 0 ? 0 : 2 + Math.round(seeded(seed + i * 7) * 3);
    legs.push(buildRailLeg(spec.lines[i], spec.hops[i], walkBefore, seed + i * 13 + 3));
  }
  if (toWalk > 0) {
    legs.push(buildWalkLeg(spec.hops[spec.hops.length - 1].to, to, toWalk));
  }

  const railLegs = legs.filter((l) => l.mode !== "walk");
  const waitMinutes =
    Math.round(seeded(seed + 41) * 4) + waitBias + Math.max(0, railLegs.length - 1) * (3 + Math.round(seeded(seed + 55) * 3));
  const walkingLegs = legs.filter((l) => l.mode === "walk");
  const walkMinutes = walkingLegs.reduce((s, l) => s + l.minutes, 0);
  const riding = legs.reduce((s, l) => s + l.minutes, 0);
  const totalMinutes = riding + waitMinutes;
  const transfers = Math.max(0, railLegs.length - 1);
  const stationsTotal = legs.reduce((s, l) => s + l.stationsCount, 0);
  const fareEGP = railLegs.every((l) => l.fareEGP == null)
    ? null
    : railLegs.reduce((s, l) => s + (l.fareEGP ?? 0), 0);
  const distanceKm =
    Math.round((stationsTotal * 1.15 + walkMinutes * 0.08 + seed % 3) * 10) / 10;

  const transferHintAr =
    transfers > 0
      ? spec.hops
          .slice(0, -1)
          .map(
            (h, i) =>
              `تبديل في محطة ${h.to} إلى ${LINE_LABEL_AR[spec.lines[i + 1]]} للرصيف ${
                1 + Math.round(seeded(seed + 77 + i) * 3)
              }`
          )
          .join(" ثم ")
      : undefined;

  return {
    id: `WSL-${spec.lines.join("-")}-${stationsTotal}`,
    rank: 0,
    rankTag: "fastest",
    rankLabelAr: "",
    totalMinutes,
    waitMinutes,
    fareEGP,
    transfers,
    walkMinutes,
    distanceKm,
    legs,
    transferHintAr,
    score: scoreRoute({
      totalMinutes,
      walkMinutes,
      transfers,
      fareEGP,
      reliability: 90 + Math.round(seeded(seed + 91) * 9),
    }),
  };
}

export const LINE_LABEL_AR: Record<string, string> = {
  L1: "مترو الخط الأول",
  L2: "مترو الخط الثاني",
  L3: "مترو الخط الثالث",
  LRT: "قطار العاصمة الكهربائي الخفيف",
  MNR: "مونوريل شرق النيل",
  WALK: "مشي",
};

/* ----------------------------- scoring ------------------------------ */

function scoreRoute(input: {
  totalMinutes: number;
  walkMinutes: number;
  transfers: number;
  fareEGP: number | null;
  reliability: number;
}): RouteScore {
  // normalized 0–100 per criterion against plausible Cairo bounds
  const time = clamp100(100 - ((input.totalMinutes - 15) / 75) * 100);
  const walk = clamp100(100 - ((input.walkMinutes - 2) / 25) * 100);
  const transfers = clamp100(100 - input.transfers * 33);
  const fare = input.fareEGP == null ? 55 : clamp100(100 - ((input.fareEGP - 8) / 14) * 100);
  return {
    time: Math.round(time),
    walk: Math.round(walk),
    transfers: Math.round(transfers),
    fare: Math.round(fare),
    reliability: Math.round(input.reliability),
  };
}

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, v));
}

/* ------------------------------ buildRoutes ----------------------------- */

/**
 * Deterministic ranked itineraries. Same (from, to) always yields the exact
 * same routes — journey-active rebuilds option #N from params alone.
 * Returns [] when the two points are identical.
 */
export function buildRoutes(from: string, to: string): RouteOption[] {
  const f = from.trim();
  const t = to.trim();
  if (!f || !t) return [];
  if (f === t) return [];

  const seed = hashString(`${f}|${t}`);
  const fromAccess = resolveAccess(f, seed + 1);
  const toAccess = resolveAccess(t, seed + 2);
  if (!fromAccess || !toAccess) return [];

  const lineSeqs = candidatePaths(normStation(fromAccess.access), normStation(toAccess.access));
  if (lineSeqs.length === 0) return [];

  const specs: PathSpec[] = [];
  for (const seq of lineSeqs) {
    const spec = pathSpec(normStation(fromAccess.access), normStation(toAccess.access), seq);
    if (spec) specs.push(spec);
  }
  if (specs.length === 0) return [];

  // sort candidates: fewer transfers then fewer stations (stable ranking base)
  specs.sort((a, b) => {
    const ta = a.lines.length - 1;
    const tb = b.lines.length - 1;
    if (ta !== tb) return ta - tb;
    return stationSpan(a) - stationSpan(b);
  });

  const chosen = specs.slice(0, 3);
  const routes: RouteOption[] = chosen.map((spec, i) => {
    const fromWalk = fromAccess.walkMinutes > 0 ? fromAccess.walkMinutes : Math.round(seeded(seed + 101 + i) * 3);
    const toWalk = toAccess.walkMinutes > 0 ? toAccess.walkMinutes : Math.round(seeded(seed + 201 + i) * 3);
    // variation between candidate routes: walk shortcuts vs feeder connectors
    const walkAdj = i === 0 ? 0 : i === 1 ? -2 : 3;
    return assembleRoute(
      f,
      t,
      spec,
      Math.max(2, fromWalk + walkAdj),
      Math.max(2, toWalk + (i === 2 ? -walkAdj : 0)),
      seed + i * 317,
      i * 2
    );
  });

  // rank tags — deterministic by metric
  const fastest = routes.reduce((a, b) => (b.totalMinutes < a.totalMinutes ? b : a), routes[0]);
  const cheapest = routes.reduce(
    (a, b) => ((b.fareEGP ?? 99) < (a.fareEGP ?? 99) ? b : a),
    routes[0]
  );
  const least = routes.reduce((a, b) => (b.transfers < a.transfers ? b : a), routes[0]);
  const used = new Set<RouteOption>();
  const tag = (r: RouteOption | undefined, tagKey: RankTag, label: string) => {
    if (!r || used.has(r)) return;
    r.rankTag = tagKey;
    r.rankLabelAr = label;
    used.add(r);
  };
  tag(fastest, "fastest", "الأسرع وصولاً");
  tag(cheapest, "cheapest", "الأوفر في التكلفة");
  tag(least, "least-transfers", "الأقل تبديلاً");
  // remaining untagged (duplicate metric winners) get a neutral descriptive tag
  for (const r of routes) {
    if (!used.has(r)) {
      r.rankTag = "fastest";
      r.rankLabelAr = "مسار بديل متوازن";
    }
  }
  routes.forEach((r, i) => {
    r.rank = i + 1;
    r.id = `WSL-${r.rank}-${f.length}${t.length}-${stationsTotalOf(r)}`;
  });

  return routes.sort((a, b) => a.totalMinutes - b.totalMinutes);
}

function stationSpan(spec: PathSpec): number {
  let n = 0;
  for (let i = 0; i < spec.lines.length; i++) {
    n += stationsBetween(spec.lines[i], spec.hops[i].from, spec.hops[i].to).length;
  }
  return n;
}

function stationsTotalOf(r: RouteOption): number {
  return r.legs.reduce((s, l) => s + l.stationsCount, 0);
}

/* --------------------------- recovery (spec 05) -------------------------- */

export interface RecoveryPlan {
  /** remaining legs from the live position (first leg starts at `fromStation`) */
  legs: RouteLeg[];
  addedDelayMinutes: number;
  newEtaMinutes: number;
  hintAr: string;
}

/**
 * Deterministic recovery detour from a live position (spec 05): alight at the
 * next station, cross the platform, continue on the alternate corridor.
 */
export function buildRecovery(
  fromStation: string,
  to: string,
  remainingMinutes: number,
  seed: number
): RecoveryPlan {
  const toAccess = resolveAccess(to, seed + 2);
  const target = normStation(toAccess?.access ?? to);
  const currentLines = linesServing(normStation(fromStation));
  const targetLines = linesServing(target);

  // prefer an alternate line path with one transfer
  const seqs = candidatePaths(normStation(fromStation), target).filter((s) => {
    return !s.every((l) => currentLines.includes(l)) || s.length > 1;
  });
  const seq = seqs.length > 0 ? seqs[seqs.length - 1] : ["L1"];
  const spec =
    pathSpec(normStation(fromStation), target, seq) ??
    pathSpec(normStation(fromStation), target, [currentLines[0] ?? "L1"]) ?? { lines: ["L1"], hops: [{ from: normStation(fromStation), to: target }] };

  const addedDelayMinutes = 4 + Math.round(seeded(seed + 5) * 3); // +4..+6 min
  const legs: RouteLeg[] = [];
  for (let i = 0; i < spec.lines.length; i++) {
    legs.push(
      buildRailLeg(spec.lines[i], spec.hops[i], i === 0 ? 0 : 3, seed + i * 31 + 9)
    );
  }
  const toWalk = toAccess && toAccess.walkMinutes > 0 ? toAccess.walkMinutes : 4;
  if (toWalk > 0) legs.push(buildWalkLeg(spec.hops[spec.hops.length - 1].to, to.trim(), toWalk));
  const altLine = spec.lines[spec.lines.length - 1];
  return {
    legs,
    addedDelayMinutes,
    newEtaMinutes: remainingMinutes + addedDelayMinutes,
    hintAr: `انزل في المحطة القادمة واعبر إلى الرصيف المقابل لمواصلة السير على ${LINE_LABEL_AR[altLine] ?? "المسار البديل"}.`,
  };
}

/** deterministic ticket id for receipts */
export function ticketId(from: string, to: string): string {
  const h = hashString(`ticket|${from}|${to}`);
  const base = h.toString(36).toUpperCase().padStart(7, "0");
  return `WSL-${base.slice(0, 4)}-${base.slice(4, 7)}${Math.floor(seeded(h) * 90 + 10)}`;
}

/** deterministic CO2 saved in kg for a door-to-door transit distance */
export function carbonSavedKg(distanceKm: number): number {
  return Math.max(0.8, Math.round(distanceKm * 0.09 * 10) / 10);
}

/** traffic relief in road-km equivalent (green impact metric) */
export function trafficReliefKm(distanceKm: number): number {
  return Math.round(distanceKm * 1.2);
}
