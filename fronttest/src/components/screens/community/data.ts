/**
 * Community screen — incident radar mock domain.
 * Deterministic values via seeded(); real Cairo stations.
 */

import {
  Users,
  Wrench,
  Clock,
  Siren,
  Droplets,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { seeded } from "@/lib/transit-data";

/* ------------------------------ Report kinds ------------------------------- */

export type ReportKind = "crowd" | "breakdown" | "delay" | "security" | "cleanliness" | "pollution";

export const REPORT_KINDS: Array<{
  kind: ReportKind;
  labelAr: string;
  icon: LucideIcon;
}> = [
  { kind: "crowd", labelAr: "ازدحام", icon: Users },
  { kind: "breakdown", labelAr: "عطل", icon: Wrench },
  { kind: "delay", labelAr: "تأخير", icon: Clock },
  { kind: "security", labelAr: "حادث أمني", icon: Siren },
  { kind: "cleanliness", labelAr: "نظافة", icon: Droplets },
  { kind: "pollution", labelAr: "تلوث", icon: Wind },
];

export const kindMeta = (k: ReportKind) => REPORT_KINDS.find((r) => r.kind === k)!;

/* -------------------------------- Severity --------------------------------- */

export type Severity = "high" | "mid" | "low";

export const SEVERITY_META: Record<Severity, { labelAr: string; color: string }> = {
  high: { labelAr: "عالي", color: "#dc2626" }, // l2 red
  mid: { labelAr: "متوسط", color: "#d97706" }, // amber gold
  low: { labelAr: "منخفض", color: "#0091ff" }, // interactive blue
};

/* -------------------------------- Status ----------------------------------- */

export type ReportStatus = "verified" | "pending" | "dismissed";

export const STATUS_META: Record<ReportStatus, { labelAr: string }> = {
  verified: { labelAr: "موثق" },
  pending: { labelAr: "قيد التحقق" },
  dismissed: { labelAr: "مهمل" },
};

/* -------------------------------- Incident --------------------------------- */

export interface Incident {
  id: string;
  kind: ReportKind;
  severity: Severity;
  titleAr: string;
  bodyAr: string;
  stationAr: string;
  lineId: string;
  minutesAgo: number;
  confirms: number;
  denies: number;
  status: ReportStatus;
  reporterNameAr: string;
  reporterTrust: number;
  mine?: boolean;
}

export const REPORT_LINES = [
  { id: "metro-l1", code: "L1", color: "#1d4ed8", nameAr: "الخط الأول" },
  { id: "metro-l2", code: "L2", color: "#dc2626", nameAr: "الخط الثاني" },
  { id: "metro-l3", code: "L3", color: "#16a34a", nameAr: "الخط الثالث" },
  { id: "lrt", code: "LRT", color: "#0284c7", nameAr: "قطار الخفيف" },
  { id: "brt", code: "BRT", color: "#d97706", nameAr: "الحافلات السريعة" },
];

export const lineMeta = (id: string) => REPORT_LINES.find((l) => l.id === id)!;

export const REPORT_STATIONS = [
  "الشهداء",
  "السادات",
  "عتبة",
  "محمد نجيب",
  "المعادي",
  "حلوان",
  "شبرا الخيمة",
  "عدلي منصور",
  "كت كات",
  "التحرير",
  "المنيب",
  "المرج الجديدة",
];

interface SeedRow {
  kind: ReportKind;
  titleAr: string;
  bodyAr: string;
  stationAr: string;
  lineId: string;
  severity: Severity;
  status: ReportStatus;
  minutesAgo: number;
  reporterNameAr: string;
}

const ROWS: SeedRow[] = [
  {
    kind: "crowd",
    titleAr: "ازدحام شديد على رصيف المحطة",
    bodyAr: "زحام مكثف على رصيف اتجاه المنيب بعد تفويت قطارين متتاليين — الانتظار يتجاوز 10 دقائق.",
    stationAr: "الشهداء",
    lineId: "metro-l2",
    severity: "high",
    status: "verified",
    minutesAgo: 4,
    reporterNameAr: "محمود سعيد",
  },
  {
    kind: "breakdown",
    titleAr: "السلم الكهربائي خارج الخدمة",
    bodyAr: "السلم الكهربائي الصاعد نحو مخرج شارع الأزهر متوقف والصيانة جارية على السلم المجاور.",
    stationAr: "عتبة",
    lineId: "metro-l2",
    severity: "mid",
    status: "verified",
    minutesAgo: 18,
    reporterNameAr: "هدى الشاذلي",
  },
  {
    kind: "delay",
    titleAr: "تأخير القطار عن المواعيد المعلنة",
    bodyAr: "فارق انتظار وصل لـ 7 دقائق بين القطارات القادمة من كت كات بلا إعلان رسمي داخل المحطة.",
    stationAr: "العباسية",
    lineId: "metro-l3",
    severity: "mid",
    status: "pending",
    minutesAgo: 26,
    reporterNameAr: "كريم عبد الحليم",
  },
  {
    kind: "security",
    titleAr: "تواجد أمني مكثف عند المدخل الرئيسي",
    bodyAr: "حملة تفتيش موسعة أعادت تنظيم الدخول — الطابور يتحرك ببطء لكن الوضع آمن ومنظم.",
    stationAr: "السادات",
    lineId: "metro-l2",
    severity: "mid",
    status: "verified",
    minutesAgo: 41,
    reporterNameAr: "سارة الجندي",
  },
  {
    kind: "crowd",
    titleAr: "ضغط عالٍ عند بوابات الطوارئ",
    bodyAr: "تكدس عند بوابات الخروج صباحاً مع بطء في البوابات اللاصقة — استخدم المخرج الشرقي.",
    stationAr: "المعادي",
    lineId: "metro-l1",
    severity: "low",
    status: "verified",
    minutesAgo: 55,
    reporterNameAr: "أنس مطاوع",
  },
  {
    kind: "cleanliness",
    titleAr: "تراكم مخلفات في ممر التحويل",
    bodyAr: "ممر التحويل نحو الخط الأول يحتاج تنظيفاً عاجلاً — روائح مزعجة قرب سلة المهملات.",
    stationAr: "المرج الجديدة",
    lineId: "metro-l1",
    severity: "low",
    status: "pending",
    minutesAgo: 72,
    reporterNameAr: "فريد الغندور",
  },
  {
    kind: "delay",
    titleAr: "توقف قصير بين المحطتين",
    bodyAr: "القطر توقف 5 دقائق تقريباً بين المحطتين ثم استمر بشكل طبيعي — بلا إعلان من القيادة.",
    stationAr: "حلوان",
    lineId: "metro-l1",
    severity: "mid",
    status: "dismissed",
    minutesAgo: 95,
    reporterNameAr: "ريم عبد الله",
  },
  {
    kind: "pollution",
    titleAr: "دخان كثيف قرب نفق المخرج",
    bodyAr: "رائحة عادم قوية داخل نفق المخرج الغربي — التهوية تحتاج مراجعة من فريق المحطة.",
    stationAr: "شبرا الخيمة",
    lineId: "metro-l2",
    severity: "high",
    status: "pending",
    minutesAgo: 120,
    reporterNameAr: "زياد الشريف",
  },
  {
    kind: "breakdown",
    titleAr: "بوابة لاصقة معطلة في المدخل",
    bodyAr: "أحد بوابات الدخول لا يستجيب للكارت ويوجه الركاب للبوابات المجاورة — طابور صغير.",
    stationAr: "عدلي منصور",
    lineId: "metro-l3",
    severity: "low",
    status: "verified",
    minutesAgo: 150,
    reporterNameAr: "نورهان فهمي",
  },
];

const INITIALS = ["م س", "ه ش", "ك ع", "س ج", "أ م", "ف غ", "ر ع", "ز ش", "ن ف"];

export function buildIncidents(): Incident[] {
  return ROWS.map((row, i) => {
    const r1 = seeded(i * 7 + 3);
    const r2 = seeded(i * 11 + 8);
    const base =
      row.severity === "high" ? 14 + Math.floor(r1 * 26) : row.severity === "mid" ? 6 + Math.floor(r1 * 18) : 2 + Math.floor(r1 * 10);
    return {
      id: `inc-${i + 1}`,
      kind: row.kind,
      severity: row.severity,
      titleAr: row.titleAr,
      bodyAr: row.bodyAr,
      stationAr: row.stationAr,
      lineId: row.lineId,
      minutesAgo: row.minutesAgo,
      confirms: base,
      denies: Math.floor(r2 * 4),
      status: row.status,
      reporterNameAr: row.reporterNameAr,
      reporterTrust: 82 + Math.floor(r2 * 17),
    };
  });
}

/* ------------------------------ Contributors ------------------------------- */

export interface Contributor {
  id: string;
  nameAr: string;
  initialsAr: string;
  points: number;
  badgeAr: string;
}

export const TOP_CONTRIBUTORS: Contributor[] = [
  { id: "c1", nameAr: "منة الله رشاد", initialsAr: "م ر", points: 1240, badgeAr: "أموثّق راكب" },
  { id: "c2", nameAr: "طارق الديب", initialsAr: "ط د", points: 986, badgeAr: "عين الشبكة" },
  { id: "c3", nameAr: "أميرة خطاب", initialsAr: "أ خ", points: 753, badgeAr: "راكب أول" },
];

/* ------------------------------ Time helpers ------------------------------- */

export function timeAgoAr(minutes: number): string {
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

/** User's fixed trust identity (spec 15: Verified Commuter 98/100) */
export const MY_TRUST = { levelAr: "راكب موثق", score: 98 };
