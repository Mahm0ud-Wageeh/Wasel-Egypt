/**
 * Fares screen — official tariff data + station-count fare engine.
 * Matrix source: spec 14 (Official Cairo Metro fare matrix, Oct-2024):
 * 8 / 10 / 15 / 20 EGP across distance brackets — identical to
 * METRO_FARE_TIERS in @/lib/transit-data.
 */

import { seeded } from "@/lib/transit-data";

/* ------------------------------ Fare matrix ------------------------------- */

export interface FareTier {
  id: string;
  /** Arabic bracket label */
  labelAr: string;
  min: number;
  max: number; // Infinity for the last tier
  fare: number;
  /** Applicability note (Arabic) */
  scopeAr: string;
}

export const FARE_TIERS: FareTier[] = [
  {
    id: "t1",
    labelAr: "من 1 إلى 9 محطات",
    min: 1,
    max: 9,
    fare: 8,
    scopeAr: "رحلات قصيرة داخل الحي",
  },
  {
    id: "t2",
    labelAr: "من 10 إلى 16 محطة",
    min: 10,
    max: 16,
    fare: 10,
    scopeAr: "رحلات داخلية معتادة عبر الخطوط",
  },
  {
    id: "t3",
    labelAr: "من 17 إلى 23 محطة",
    min: 17,
    max: 23,
    fare: 15,
    scopeAr: "رحلات طويلة بتبادلات متعددة",
  },
  {
    id: "t4",
    labelAr: "أكثر من 23 محطة",
    min: 24,
    max: Number.POSITIVE_INFINITY,
    fare: 20,
    scopeAr: "قطع الشبكة بين الأطراف",
  },
];

export function tierForStations(n: number): FareTier {
  return FARE_TIERS.find((t) => n >= t.min && n <= t.max) ?? FARE_TIERS[FARE_TIERS.length - 1];
}

/* --------------------------- Metro station graph --------------------------- */

export interface FareStation {
  id: string;
  nameAr: string;
  lineId: "metro-l1" | "metro-l2" | "metro-l3";
}

const L1 = [
  "حلوان",
  "عين حلوان",
  "حلوان جامعة",
  "وادي حفص",
  "حدائق حلوان",
  "المعصرة",
  "طره البلد",
  "كوتسيكا",
  "المعادي",
  "دخان",
  "حدائق معادي",
  "دار السلام",
  "الزهرة",
  "مار جرجس",
  "الملك الصالح",
  "سيدة زينب",
  "الشهداء",
  "جمال عبد الناصر",
  "أحمد عرابي",
  "عزبة النخل",
  "عين شمس",
  "الخلفاوي",
  "مرج",
  "المرج الجديدة",
];

const L2 = [
  "شبرا الخيمة",
  "الخصب",
  "الإمبرة",
  "شبرا عمرة",
  "الترعة",
  "روض الفرج",
  "مسرة",
  "الشهداء",
  "عتبة",
  "السادات",
  "مصر",
  "البحوث",
  "الجامعة",
  "ساقية مكي",
  "أم المصريين",
  "المنيب",
];

const L3 = [
  "عدلي منصور",
  "التبين",
  "المحور",
  "النخيل",
  "كرت الخبز",
  "الاستاد",
  "هشام بركات",
  "القصاصين",
  "العباسية",
  "محمد نجيب",
  "باب الشعرية",
  "كت كات",
  "إمبابة",
];

function buildStations(): FareStation[] {
  const out: FareStation[] = [];
  const push = (names: string[], lineId: FareStation["lineId"]) => {
    names.forEach((nameAr, i) => {
      out.push({ id: `${lineId}-${i}`, nameAr, lineId });
    });
  };
  push(L1, "metro-l1");
  push(L2, "metro-l2");
  push(L3, "metro-l3");
  return out;
}

export const FARE_STATIONS: FareStation[] = buildStations();

/** Interchange links: [stationNameLineA, stationNameLineB] (same physical hub) */
const INTERCHANGES: Array<[string, string]> = [
  ["الشهداء", "الشهداء"], // L1 × L2 — same name, different lines
  ["السادات", "محمد نجيب"], // L2 × L3 — linked interchange
];

/** Adjacency weight 1 per station hop, interchange hop costs 2 (transfer walk) */
export function stationsBetween(fromId: string, toId: string): number | null {
  if (!fromId || !toId || fromId === toId) return null;
  const byId = new Map(FARE_STATIONS.map((s) => [s.id, s]));
  const from = byId.get(fromId);
  const to = byId.get(toId);
  if (!from || !to) return null;

  const sameLineStations = (lineId: string) =>
    FARE_STATIONS.filter((s) => s.lineId === lineId);

  const neighborsOf = (s: FareStation): Array<{ node: FareStation; w: number }> => {
    const list = sameLineStations(s.lineId);
    const idx = list.findIndex((x) => x.id === s.id);
    const res: Array<{ node: FareStation; w: number }> = [];
    if (idx > 0) res.push({ node: list[idx - 1], w: 1 });
    if (idx < list.length - 1) res.push({ node: list[idx + 1], w: 1 });
    // interchange hops (weight 2 = platform transfer equivalent)
    for (const [a, b] of INTERCHANGES) {
      const other = s.nameAr === a ? b : s.nameAr === b ? a : null;
      if (!other) continue;
      const hub = FARE_STATIONS.find(
        (x) => x.nameAr === other && x.lineId !== s.lineId
      );
      if (hub) res.push({ node: hub, w: 2 });
    }
    return res;
  };

  // Dijkstra (tiny graph)
  const dist = new Map<string, number>();
  dist.set(from.id, 0);
  const visited = new Set<string>();
  while (true) {
    let cur: { id: string; d: number } | null = null;
    for (const [id, d] of dist) {
      if (!visited.has(id) && (cur === null || d < cur.d)) cur = { id, d };
    }
    if (cur === null) break;
    if (cur.id === to.id) return cur.d;
    visited.add(cur.id);
    const node = byId.get(cur.id);
    if (!node) continue;
    for (const { node: nb, w } of neighborsOf(node)) {
      const nd = cur.d + w;
      if (!dist.has(nb.id) || nd < dist.get(nb.id)!) dist.set(nb.id, nd);
    }
  }
  return null;
}

/** Rough ride duration: ~2.2 min per station hop + 4 min per transfer */
export function rideMinutes(stations: number): number {
  const transfers = Math.max(0, Math.round((stations - 1) / 14));
  return Math.round(stations * 2.2 + transfers * 4);
}

/* ------------------------------- Passes grid ------------------------------- */

export interface PassProduct {
  id: string;
  nameAr: string;
  price: number;
  periodAr: string;
  perksAr: string[];
  badgeAr?: string;
}

export const PASS_PRODUCTS: PassProduct[] = [
  {
    id: "monthly",
    nameAr: "اشتراك شهري موحد",
    price: 230,
    periodAr: "30 يوماً — رحلات غير محدودة",
    perksAr: ["كل خطوط المترو بلا حدود", "صلاحية التبادل بين الخطوط", "قابل للشحن من كارت واصل"],
  },
  {
    id: "student",
    nameAr: "اشتراك طلابي",
    price: 115,
    periodAr: "30 يوماً — خصم 50%",
    perksAr: ["لطلاب المدارس والجامعات بإثبات قيد", "نصف قيمة الاشتراك الرسمي", "مرتبط بالبطاقة الجامعية"],
    badgeAr: "الأكثر توفيراً",
  },
  {
    id: "weekly",
    nameAr: "اشتراك أسبوعي",
    price: 70,
    periodAr: "7 أيام — رحلات غير محدودة",
    perksAr: ["مثالي لسكن العمل المؤقت", "يشمل المترو فقط", "يبدأ من تاريخ أول استخدام"],
  },
  {
    id: "tourist",
    nameAr: "تذكرة سياحية",
    price: 100,
    periodAr: "3 أيام — رحلات غير محدودة",
    perksAr: ["لغير المقيمين بجواز سفر ساري", "تشمل المترو وقطار الخفيف LRT", "دليل خطوط مطبوع بالمحطات"],
  },
];

/* ------------------------------ Payment rails ------------------------------ */

export const PAYMENT_METHODS = [
  { id: "wallet", labelAr: "محافظ إلكترونية", meta: "VODAFONE CASH · INSTAPAY" },
  { id: "cards", labelAr: "بطاقات الدفع", meta: "VISA · MASTERCARD · MEEZA" },
  { id: "cash", labelAr: "كاش في المحطات", meta: "FAWRY · TICKET BOOTHS" },
] as const;

/** Deterministic QR-style placeholder grid (21×21) */
export function qrPatternCells(seed: number, size = 21): boolean[] {
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) cells.push(seeded(seed * 97 + i * 13) > 0.52);
  return cells;
}

/** Deterministic barcode bar widths */
export function barcodeBars(count = 58): number[] {
  return Array.from({ length: count }, (_, i) => 1 + Math.floor(seeded(i * 29 + 5) * 3));
}
