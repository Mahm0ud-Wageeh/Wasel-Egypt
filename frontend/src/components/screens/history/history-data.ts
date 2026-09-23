/**
 * History screen — deterministic mock data.
 * Real Greater Cairo station names only; all randomness via seeded().
 */

import { LINES, seeded } from "@/lib/transit-data";

/* ------------------------------- Line refs -------------------------------- */

export interface LegRef {
  code: string;
  color: string;
  nameAr: string;
}

export function legByCode(code: string): LegRef {
  const line = LINES.find((l) => l.code === code);
  return {
    code,
    color: line?.color ?? "#64748b",
    nameAr: line?.nameAr ?? code,
  };
}

export function legsOf(codes: string[]): LegRef[] {
  return codes.map(legByCode);
}

/* --------------------------------- Trips ---------------------------------- */

export interface Trip {
  id: string;
  daysAgo: number; // 0 = today, 1 = yesterday, 2+ = earlier
  time: string; // 24h, rendered with .num
  from: string;
  to: string;
  legCodes: string[];
  durationMin: number;
  fare: number;
  favorite: boolean;
}

export const TRIPS: Trip[] = [
  {
    id: "t-01",
    daysAgo: 0,
    time: "08:24",
    from: "المعادي",
    to: "الدقي",
    legCodes: ["L1", "L2"],
    durationMin: 26,
    fare: 8,
    favorite: true,
  },
  {
    id: "t-02",
    daysAgo: 0,
    time: "09:10",
    from: "كت كات",
    to: "جمال عبد الناصر",
    legCodes: ["L3"],
    durationMin: 19,
    fare: 8,
    favorite: false,
  },
  {
    id: "t-03",
    daysAgo: 0,
    time: "18:42",
    from: "الدقي",
    to: "المعادي",
    legCodes: ["L2", "L1"],
    durationMin: 27,
    fare: 8,
    favorite: false,
  },
  {
    id: "t-04",
    daysAgo: 1,
    time: "07:55",
    from: "الجيزة",
    to: "مصر الجديدة",
    legCodes: ["L2", "L3"],
    durationMin: 38,
    fare: 10,
    favorite: false,
  },
  {
    id: "t-05",
    daysAgo: 1,
    time: "13:20",
    from: "عدلي منصور",
    to: "مدينة الفنون والثقافة",
    legCodes: ["LRT"],
    durationMin: 31,
    fare: 10,
    favorite: false,
  },
  {
    id: "t-06",
    daysAgo: 1,
    time: "21:05",
    from: "محمد نجيب",
    to: "المنيب",
    legCodes: ["L2"],
    durationMin: 24,
    fare: 8,
    favorite: true,
  },
  {
    id: "t-07",
    daysAgo: 2,
    time: "08:30",
    from: "حلوان",
    to: "السادات",
    legCodes: ["L1"],
    durationMin: 34,
    fare: 10,
    favorite: false,
  },
  {
    id: "t-08",
    daysAgo: 3,
    time: "16:15",
    from: "مصر الجديدة",
    to: "مدينة الفنون والثقافة",
    legCodes: ["L3", "LRT"],
    durationMin: 52,
    fare: 15,
    favorite: false,
  },
  {
    id: "t-09",
    daysAgo: 4,
    time: "09:00",
    from: "شبرا الخيمة",
    to: "جامعة القاهرة",
    legCodes: ["L2"],
    durationMin: 29,
    fare: 8,
    favorite: false,
  },
  {
    id: "t-10",
    daysAgo: 5,
    time: "14:48",
    from: "محور محمد نجيب",
    to: "العاصمة الإدارية",
    legCodes: ["MNR"],
    durationMin: 45,
    fare: 15,
    favorite: false,
  },
  {
    id: "t-11",
    daysAgo: 6,
    time: "07:40",
    from: "المرج",
    to: "جمال عبد الناصر",
    legCodes: ["L1"],
    durationMin: 41,
    fare: 10,
    favorite: false,
  },
  {
    id: "t-12",
    daysAgo: 9,
    time: "11:32",
    from: "رمسيس",
    to: "طنطا",
    legCodes: ["ENR"],
    durationMin: 95,
    fare: 65,
    favorite: false,
  },
];

/* ----------------------------- Saved routes ------------------------------- */

export interface SavedRoute {
  id: string;
  label: string;
  from: string;
  to: string;
  legCodes: string[];
}

export const SAVED_ROUTES: SavedRoute[] = [
  {
    id: "saved-home",
    label: "المنزل",
    from: "المعادي",
    to: "الدقي",
    legCodes: ["L1", "L2"],
  },
  {
    id: "saved-work",
    label: "العمل",
    from: "الدقي",
    to: "مصر الجديدة",
    legCodes: ["L2", "L3"],
  },
];

/* ------------------------- Monthly aggregate stats ------------------------ */

export interface HistoryStats {
  trips: number;
  km: number;
  co2Kg: number;
  totalFare: number;
}

export function buildStats(): HistoryStats {
  const base = 28;
  const trips = base + Math.round(seeded(101) * 14); // ~28-42 رحلة
  const km = Math.round((trips * (8 + seeded(207) * 4)) * 10) / 10; // ~10-12 كم لكل رحلة
  const co2Kg = Math.round(km * 0.129 * 10) / 10; // متوسط توفير السيارة
  const totalFare = TRIPS.reduce((sum, t) => sum + t.fare, 0) + trips * 5;
  return { trips, km, co2Kg, totalFare };
}

/* ------------------------------- Grouping --------------------------------- */

export type TripGroupKey = "today" | "yesterday" | "earlier";

export const GROUP_LABEL_AR: Record<TripGroupKey, string> = {
  today: "اليوم",
  yesterday: "أمس",
  earlier: "سابقًا",
};

export function groupOf(trip: Trip): TripGroupKey {
  if (trip.daysAgo <= 0) return "today";
  if (trip.daysAgo === 1) return "yesterday";
  return "earlier";
}

const AR_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Fixed-format Arabic date for a trip (deterministic, no Intl drift). */
export function tripDateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${AR_WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}
