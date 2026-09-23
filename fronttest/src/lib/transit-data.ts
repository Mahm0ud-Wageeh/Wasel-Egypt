/**
 * Wasel Egypt — shared transit domain data.
 * Official Egyptian Ministry of Transport line tokens.
 * Screens may extend with their own local data from spec files.
 */

import type { ScreenKey } from "./navigation";

export type TransitMode =
  | "metro"
  | "lrt"
  | "monorail"
  | "brt"
  | "train"
  | "bus"
  | "microbus"
  | "walk";

export type LineStatus = "normal" | "busy" | "maintenance";

export interface TransitLine {
  id: string;
  code: string;          // L1, L2, LRT, MNR...
  nameAr: string;
  nameEn: string;
  color: string;         // official hex
  mode: TransitMode;
  status: LineStatus;
  terminalsAr: [string, string];
  stationsCount: number;
  screen: ScreenKey;     // dedicated network screen
}

export const LINES: TransitLine[] = [
  {
    id: "metro-l1",
    code: "L1",
    nameAr: "الخط الأول — المترو",
    nameEn: "Cairo Metro Line 1",
    color: "#1d4ed8",
    mode: "metro",
    status: "normal",
    terminalsAr: ["حلوان", "المرج الجديدة"],
    stationsCount: 35,
    screen: "metro",
  },
  {
    id: "metro-l2",
    code: "L2",
    nameAr: "الخط الثاني — المترو",
    nameEn: "Cairo Metro Line 2",
    color: "#dc2626",
    mode: "metro",
    status: "busy",
    terminalsAr: ["شبرا الخيمة", "المنيب"],
    stationsCount: 20,
    screen: "metro",
  },
  {
    id: "metro-l3",
    code: "L3",
    nameAr: "الخط الثالث — المترو",
    nameEn: "Cairo Metro Line 3",
    color: "#16a34a",
    mode: "metro",
    status: "normal",
    terminalsAr: ["عدلي منصور", "كت كات"],
    stationsCount: 34,
    screen: "metro",
  },
  {
    id: "metro-l4",
    code: "L4",
    nameAr: "الخط الرابع — المترو",
    nameEn: "Cairo Metro Line 4",
    color: "#ea580c",
    mode: "metro",
    status: "maintenance",
    terminalsAr: ["الحرام", "التجمع الخامس"],
    stationsCount: 17,
    screen: "metro",
  },
  {
    id: "lrt",
    code: "LRT",
    nameAr: "القطار الكهربائي الخفيف",
    nameEn: "Light Rail Transit",
    color: "#0284c7",
    mode: "lrt",
    status: "normal",
    terminalsAr: ["عدلي منصور", "مدينة الفنون والثقافة"],
    stationsCount: 19,
    screen: "lrt",
  },
  {
    id: "monorail-east",
    code: "MNR",
    nameAr: "المونوريل — النيل الشرقي",
    nameEn: "East Nile Monorail",
    color: "#7c3aed",
    mode: "monorail",
    status: "normal",
    terminalsAr: ["محور محمد نجيب", "العاصمة الإدارية"],
    stationsCount: 22,
    screen: "monorail",
  },
  {
    id: "brt",
    code: "BRT",
    nameAr: "الحافلات السريعة — الدائري",
    nameEn: "Ring Road BRT",
    color: "#d97706",
    mode: "brt",
    status: "normal",
    terminalsAr: ["15 مايو", "السلام"],
    stationsCount: 42,
    screen: "brt",
  },
  {
    id: "enr",
    code: "ENR",
    nameAr: "السكك الحديدية المصرية",
    nameEn: "Egyptian National Railways",
    color: "#991b1b",
    mode: "train",
    status: "normal",
    terminalsAr: ["رمسيس", "طنطا / أسيوط"],
    stationsCount: 0,
    screen: "train",
  },
];

export const MODE_LABEL_AR: Record<TransitMode, string> = {
  metro: "مترو",
  lrt: "قطار كهربائي خفيف",
  monorail: "مونوريل",
  brt: "حافلات سريعة",
  train: "قطار وطني",
  bus: "أتوبيس",
  microbus: "ميكروباص",
  walk: "مشي",
};

export const LINE_STATUS_LABEL: Record<LineStatus, string> = {
  normal: "تداول طبيعي",
  busy: "ازدحام مرتفع",
  maintenance: "صيانة مجدولة",
};

/** Official Cairo Metro fare matrix (EGP) — distance based tiers */
export const METRO_FARE_TIERS = [
  { stations: "1 – 9", fare: 8 },
  { stations: "10 – 16", fare: 10 },
  { stations: "17 – 23", fare: 15 },
  { stations: "24+", fare: 20 },
];

export function formatEGP(value: number): string {
  return `${value} ج.م`;
}

/** Deterministic pseudo-random helper for stable mock values */
export function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
