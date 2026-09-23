/**
 * Wasel Egypt — Greater Cairo real station directory (planner-local).
 * Sources: Cairo Metro official station lists (L1 35, L2 20, L3 34),
 * Capital LRT (12 operational stations), East Nile Monorail (22 stations)
 * plus landmark POIs that resolve to their nearest access station.
 */

import type { TransitMode } from "@/lib/transit-data";

export interface WaselLocation {
  name: string;
  /** owning line codes, e.g. ["L1"] or ["L3","MNR"] for interchanges */
  lines: string[];
  mode: TransitMode;
  poi?: boolean;
}

/* ------------------------- Metro Line 1 (35) ------------------------- */
/* حلوان ← المرج الجديدة — official order, south to north */
export const L1_STATIONS: string[] = [
  "حلوان",
  "عين حلوان",
  "جامعة حلوان",
  "وادي حوف",
  "حدائق حلوان",
  "المعصرة",
  "طرة الأسمنت",
  "كوتسيكا",
  "طرة البلد",
  "ثكنات المعادي",
  "المعادي",
  "حدائق المعادي",
  "دار السلام",
  "الزهراء",
  "مار جرجس",
  "الملك الصالح",
  "السيدة زينب",
  "سعد زغلول",
  "السادات",
  "جمال عبد الناصر",
  "أحمد عرابي",
  "الشهداء",
  "غمرة",
  "الدمرداش",
  "منشية الصدر",
  "كوبري القبة",
  "حمامات القبة",
  "سراي القبة",
  "حدائق الزيتون",
  "حلمية الزيتون",
  "المطرية",
  "عين شمس",
  "عزبة النخل",
  "المرج",
  "المرج الجديدة",
];

/* ------------------------- Metro Line 2 (20) ------------------------- */
/* المنيب ← شبرا الخيمة — official order */
export const L2_STATIONS: string[] = [
  "المنيب",
  "ساقية مكي",
  "أم المصريين",
  "الجيزة",
  "فيصل",
  "جامعة القاهرة",
  "البحوث",
  "الدقي",
  "الأوبرا",
  "السادات",
  "محمد نجيب",
  "العتبة",
  "الشهداء",
  "مسرة",
  "روض الفرج",
  "سانتا تريزا",
  "الخلفاوي",
  "المظلات",
  "كلية الزراعة",
  "شبرا الخيمة",
];

/* ------------------------- Metro Line 3 (34) ------------------------- */
/* عدلي منصور ← جامعة القاهرة عبر الكيت كات — official order */
export const L3_STATIONS: string[] = [
  "عدلي منصور",
  "الهايكستب",
  "عمر بن الخطاب",
  "قباء",
  "هشام بركات",
  "النزهة",
  "نادي الشمس",
  "ألف مسكن",
  "هليوبوليس",
  "هارون",
  "الأهرام",
  "كلية البنات",
  "الاستاد",
  "أرض المعارض",
  "العباسية",
  "عبده باشا",
  "الجيش",
  "باب الشعرية",
  "العتبة",
  "جمال عبد الناصر",
  "ماسبيرو",
  "صفاء حجازي",
  "الكيت كات",
  "السودان",
  "إمبابة",
  "البوهي",
  "القومية",
  "الطريق الدائري",
  "محور روض الفرج",
  "التوفيقية",
  "وادي النيل",
  "جامعة الدول العربية",
  "بولاق الدكرور",
  "جامعة القاهرة",
];

/* --------------------- Capital LRT — قطار العاصمة (12) --------------------- */
/* عدلي منصور ← مدينة الفنون والثقافة */
export const LRT_STATIONS: string[] = [
  "عدلي منصور",
  "العبور",
  "المستقبل",
  "الشروق",
  "نيو هليوبوليس",
  "بدر",
  "الوفاء والأمل",
  "مدينة المعرفة",
  "المدينة الرياضية",
  "العاصمة المركزية",
  "مطار العاصمة",
  "مدينة الفنون والثقافة",
];

/* ------------------- East Nile Monorail — مونوريل شرق النيل (22) ------------------- */
/* إستاد القاهرة ← مدينة العدالة */
export const MNR_STATIONS: string[] = [
  "إستاد القاهرة",
  "هشام بركات",
  "جامعة الأزهر",
  "الحي السابع",
  "المشير أحمد إسماعيل",
  "جيهان السادات",
  "المشير طنطاوي",
  "وان ناينتي",
  "المستشفى الجوي",
  "النرجس",
  "المستثمرين",
  "اللوتس",
  "جولدن سكوير",
  "بيت الوطن",
  "مسجد الفتاح العليم",
  "حي R1",
  "حي R2",
  "حي المال والأعمال",
  "مدينة الفنون والثقافة",
  "الحي الحكومي",
  "مسجد مصر",
  "مدينة العدالة",
];

/* ------------------------------ POIs --------------------------------- */
/** landmark POIs → resolved to their nearest rail access station by the engine */
export const POI_LOCATIONS: { name: string; access: string }[] = [
  { name: "ميدان التحرير", access: "السادات" },
  { name: "المتحف المصري", access: "السادات" },
  { name: "مصر الجديدة", access: "هليوبوليس" },
  { name: "مدينة نصر", access: "الاستاد" },
  { name: "المعادي الجديدة", access: "المعادي" },
  { name: "الهرم", access: "فيصل" },
  { name: "مدينة السادس من أكتوبر", access: "فيصل" },
  { name: "العاصمة الإدارية الجديدة", access: "حي المال والأعمال" },
  { name: "التجمع الخامس", access: "الحي السابع" },
  { name: "الرحاب", access: "الحي السابع" },
  { name: "المهندسين", access: "البحوث" },
  { name: "وسط البلد", access: "محمد نجيب" },
  { name: "الدرب الأحمر", access: "سعد زغلول" },
  { name: "شبرا", access: "روض الفرج" },
  { name: "الزيتون", access: "حدائق الزيتون" },
  { name: "حي القبة", access: "كوبري القبة" },
  { name: "مدينة 15 مايو", access: "حلوان" },
  { name: "القاهرة الجديدة", access: "الحي السابع" },
  { name: "بولاق", access: "جامعة الدول العربية" },
  { name: "جامعة القاهرة الجديدة", access: "جامعة القاهرة" },
];

/* ------------------------- flattened directory ------------------------ */

function lineLocations(code: string, stations: string[], mode: TransitMode): WaselLocation[] {
  return stations.map((name) => ({ name, lines: [code], mode }));
}

export const LINE_STATION_MAP: Record<string, string[]> = {
  L1: L1_STATIONS,
  L2: L2_STATIONS,
  L3: L3_STATIONS,
  LRT: LRT_STATIONS,
  MNR: MNR_STATIONS,
};

/** Stations shared by more than one line (real interchanges) */
export const INTERCHANGES: string[] = [
  "السادات",
  "الشهداء",
  "العتبة",
  "جمال عبد الناصر",
  "عدلي منصور",
  "إستاد القاهرة",
  "مدينة الفنون والثقافة",
];

export const ALL_LOCATIONS: WaselLocation[] = [
  ...lineLocations("L1", L1_STATIONS, "metro"),
  ...lineLocations("L2", L2_STATIONS, "metro"),
  ...lineLocations("L3", L3_STATIONS, "metro"),
  ...lineLocations("LRT", LRT_STATIONS, "lrt"),
  ...lineLocations("MNR", MNR_STATIONS, "monorail"),
  ...POI_LOCATIONS.map((p) => ({
    name: p.name,
    lines: ["POI"],
    mode: "walk" as TransitMode,
    poi: true,
  })),
];

/** deterministic unique directory (POI names could collide with station names) */
export const UNIQUE_LOCATIONS: WaselLocation[] = (() => {
  const seen = new Set<string>();
  const out: WaselLocation[] = [];
  for (const loc of ALL_LOCATIONS) {
    if (seen.has(loc.name)) continue;
    seen.add(loc.name);
    out.push(loc);
  }
  return out;
})();

export function findLocation(name: string): WaselLocation | undefined {
  const q = name.trim();
  return UNIQUE_LOCATIONS.find((l) => l.name === q);
}

/** prefix/contains Arabic-aware search, longest real-name matches first */
export function searchLocations(query: string, limit = 7): WaselLocation[] {
  const q = query.trim();
  if (!q) return [];
  const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " ");
  const nq = norm(q);
  const scored: { loc: WaselLocation; score: number }[] = [];
  for (const loc of UNIQUE_LOCATIONS) {
    const nn = norm(loc.name);
    let score = -1;
    if (nn === nq) score = 0;
    else if (nn.startsWith(nq)) score = 1;
    else if (nn.includes(nq)) score = 2;
    if (score >= 0) scored.push({ loc, score });
  }
  scored.sort((a, b) => a.score - b.score || a.loc.name.length - b.loc.name.length);
  return scored.slice(0, limit).map((s) => s.loc);
}
