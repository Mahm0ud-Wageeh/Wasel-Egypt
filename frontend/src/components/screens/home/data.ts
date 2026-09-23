"use client";

/**
 * Home screen — local mock data.
 * Real Greater Cairo stations / lines only, all values deterministic.
 */

import type { LineStatus } from "@/lib/transit-data";

/* --------------------------------- Stations -------------------------------- */

export interface StationLine {
  code: string;
  color: string;
}

export interface Station {
  id: string;
  name: string;
  info: string;
  lines: StationLine[];
}

export const STATIONS: Station[] = [
  {
    id: "sadat",
    name: "السادات",
    info: "الخط الأول والثاني — ميدان التحرير",
    lines: [
      { code: "L1", color: "#1d4ed8" },
      { code: "L2", color: "#dc2626" },
    ],
  },
  {
    id: "tahrir",
    name: "التحرير",
    info: "الخط الأول — وسط البلد",
    lines: [{ code: "L1", color: "#1d4ed8" }],
  },
  {
    id: "giza",
    name: "جيزة",
    info: "الخط الثاني — شارع الجيزة",
    lines: [{ code: "L2", color: "#dc2626" }],
  },
  {
    id: "adly-mansour",
    name: "عدلي منصور",
    info: "الخط الثالث + القطار الكهربائي الخفيف",
    lines: [
      { code: "L3", color: "#16a34a" },
      { code: "LRT", color: "#0284c7" },
    ],
  },
  {
    id: "kitkat",
    name: "كت كات",
    info: "الخط الثالث — إمبابة",
    lines: [{ code: "L3", color: "#16a34a" }],
  },
  {
    id: "shubra",
    name: "شبرا الخيمة",
    info: "الخط الثاني — شمال القاهرة",
    lines: [{ code: "L2", color: "#dc2626" }],
  },
  {
    id: "mounib",
    name: "المونيب",
    info: "الخط الثاني — الطريق الزراعي",
    lines: [{ code: "L2", color: "#dc2626" }],
  },
  {
    id: "haram",
    name: "الحرام",
    info: "الخط الرابع — الهرم",
    lines: [{ code: "L4", color: "#ea580c" }],
  },
  {
    id: "cairo-uni",
    name: "جامعة القاهرة",
    info: "الخط الثاني والثالث — الجيزة",
    lines: [
      { code: "L2", color: "#dc2626" },
      { code: "L3", color: "#16a34a" },
    ],
  },
  {
    id: "new-capital",
    name: "العاصمة الإدارية",
    info: "المونوريل — محور محمد نجيب",
    lines: [{ code: "MNR", color: "#7c3aed" }],
  },
  {
    id: "helwan",
    name: "حلوان",
    info: "الخط الأول — جنوب القاهرة",
    lines: [{ code: "L1", color: "#1d4ed8" }],
  },
  {
    id: "el-marg",
    name: "المرج الجديدة",
    info: "الخط الأول — شمال شرق القاهرة",
    lines: [{ code: "L1", color: "#1d4ed8" }],
  },
  {
    id: "masr-gedida",
    name: "مصر الجديدة",
    info: "الخط الثالث — الهليوبوليس",
    lines: [{ code: "L3", color: "#16a34a" }],
  },
  {
    id: "arts-city",
    name: "مدينة الفنون والثقافة",
    info: "القطار الكهربائي الخفيف — العاصمة الإدارية",
    lines: [{ code: "LRT", color: "#0284c7" }],
  },
  {
    id: "nagib-axis",
    name: "محور محمد نجيب",
    info: "المونوريل — النيل الشرقي",
    lines: [{ code: "MNR", color: "#7c3aed" }],
  },
  {
    id: "tagamoe",
    name: "التجمع الخامس",
    info: "الخط الرابع — القاهرة الجديدة",
    lines: [{ code: "L4", color: "#ea580c" }],
  },
];

/* ------------------------------- Saved trips ------------------------------- */

export interface SavedTrip {
  id: string;
  title: string;
  from: string;
  to: string;
  via: string;
  icon: "home" | "work" | "university" | "station";
}

export const SAVED_TRIPS: SavedTrip[] = [
  {
    id: "home-work",
    title: "المنزل → العمل",
    from: "الدقي",
    to: "التجمع الخامس",
    via: "مترو L2 ثم L4",
    icon: "work",
  },
  {
    id: "university",
    title: "الجامعة",
    from: "التحرير",
    to: "جامعة القاهرة",
    via: "مترو L1 ثم L2 مباشر",
    icon: "university",
  },
  {
    id: "station",
    title: "المحطة",
    from: "التحرير",
    to: "الشهداء",
    via: "مترو L1 — سكة حديد رمسيس",
    icon: "station",
  },
  {
    id: "back-home",
    title: "العودة للمنزل",
    from: "القرية الذكية",
    to: "الدقي",
    via: "أتوبيس ثم مترو L2",
    icon: "home",
  },
];

/* ------------------------------ Departure board ---------------------------- */

export interface DepartureRow {
  id: string;
  code: string;
  color: string;
  dest: string;
  /** initial countdown seconds (deterministic) */
  offsetSec: number;
  /** headway to wrap to after reaching zero */
  headwaySec: number;
}

export const DEPARTURES: DepartureRow[] = [
  {
    id: "d1",
    code: "L2",
    color: "#dc2626",
    dest: "نحو المونيب",
    offsetSec: 72,
    headwaySec: 300,
  },
  {
    id: "d2",
    code: "L1",
    color: "#1d4ed8",
    dest: "نحو حلوان",
    offsetSec: 148,
    headwaySec: 240,
  },
  {
    id: "d3",
    code: "L2",
    color: "#dc2626",
    dest: "نحو شبرا الخيمة",
    offsetSec: 217,
    headwaySec: 300,
  },
  {
    id: "d4",
    code: "L1",
    color: "#1d4ed8",
    dest: "نحو المرج الجديدة",
    offsetSec: 263,
    headwaySec: 240,
  },
];

/* ------------------------------- Quick access ------------------------------ */

export interface QuickAccess {
  id: string;
  label: string;
  desc: string;
  icon: "fares" | "history" | "map" | "community";
  screen: "fares" | "history" | "map" | "community";
}

export const QUICK_ACCESS: QuickAccess[] = [
  {
    id: "fares",
    label: "الأجور",
    desc: "جدول الأجور الرسمية لكل وسيلة",
    icon: "fares",
    screen: "fares",
  },
  {
    id: "history",
    label: "رحلاتي",
    desc: "سجل رحلاتك السابقة والمحفوظة",
    icon: "history",
    screen: "history",
  },
  {
    id: "map",
    label: "الخريطة",
    desc: "الخريطة الكاملة لشبكة القاهرة",
    icon: "map",
    screen: "map",
  },
  {
    id: "community",
    label: "المجتمع",
    desc: "أسئلة الراكبين وتنبيهاتهم الحية",
    icon: "community",
    screen: "community",
  },
];

/* ------------------------------ Radar helpers ------------------------------ */

export interface RadarLine {
  id: string;
  code: string;
  color: string;
  nameAr: string;
  status: LineStatus;
  baseHeadway: number;
}

/** Stable per-line operational profile (statuses stay honest to reality) */
export const RADAR_LINES: RadarLine[] = [
  {
    id: "metro-l1",
    code: "L1",
    color: "#1d4ed8",
    nameAr: "المترو — الخط الأول",
    status: "normal",
    baseHeadway: 3,
  },
  {
    id: "metro-l2",
    code: "L2",
    color: "#dc2626",
    nameAr: "المترو — الخط الثاني",
    status: "busy",
    baseHeadway: 5,
  },
  {
    id: "metro-l3",
    code: "L3",
    color: "#16a34a",
    nameAr: "المترو — الخط الثالث",
    status: "normal",
    baseHeadway: 4,
  },
  {
    id: "metro-l4",
    code: "L4",
    color: "#ea580c",
    nameAr: "المترو — الخط الرابع",
    status: "maintenance",
    baseHeadway: 9,
  },
  {
    id: "lrt",
    code: "LRT",
    color: "#0284c7",
    nameAr: "القطار الكهربائي الخفيف",
    status: "normal",
    baseHeadway: 10,
  },
  {
    id: "monorail-east",
    code: "MNR",
    color: "#7c3aed",
    nameAr: "المونوريل الشرقي",
    status: "normal",
    baseHeadway: 8,
  },
  {
    id: "brt",
    code: "BRT",
    color: "#d97706",
    nameAr: "الحافلات السريعة",
    status: "normal",
    baseHeadway: 6,
  },
];
