"use client";

/**
 * Welcome screen — local mock data.
 * Real Greater Cairo network figures and official entities only.
 */

import type { ScreenKey } from "@/lib/navigation";

/* ------------------------------ Hero checklist ---------------------------- */

export interface HeroPoint {
  lead: string;
  desc: string;
}

export const HERO_POINTS: HeroPoint[] = [
  {
    lead: "وصول لحظي",
    desc: "مواعيد حية لكل خطوط الشبكة بتحديث مستمر من مستشعرات التداول",
  },
  {
    lead: "أرخص مسار",
    desc: "مقارنة الأجور الرسمية بين المترو والقطار الخفيف والحافلات السريعة",
  },
  {
    lead: "بدون انتظار",
    desc: "تنبيه قبل وصول مواصلتك، وخطة بديلة فورية عند أي تأخير",
  },
];

/* ----------------------------- Quick destinations -------------------------- */

export interface QuickDest {
  label: string;
  to: string;
}

export const QUICK_DESTINATIONS: QuickDest[] = [
  { label: "مطار القاهرة الدولي", to: "مطار القاهرة الدولي" },
  { label: "ميدان التحرير", to: "التحرير" },
  { label: "العاصمة الإدارية", to: "العاصمة الإدارية" },
  { label: "القرية الذكية", to: "القرية الذكية" },
];

/* --------------------------- Verified metric strip ------------------------- */

export interface Metric {
  to: number;
  suffix: string;
  caption: string;
}

export const NETWORK_METRICS: Metric[] = [
  { to: 8, suffix: "+", caption: "خطوط نقل حديثة" },
  { to: 190, suffix: "+", caption: "محطة عبر المحافظة" },
  { to: 106, suffix: "", caption: "كم مسارات الدائري BRT" },
  { to: 4, suffix: "M+", caption: "راكب يومياً على الشبكة" },
];

/* --------------------------------- Modes row ------------------------------- */

export interface ModeCard {
  id: string;
  label: string;
  desc: string;
  color: string;
  screen: ScreenKey;
  icon: "metro" | "lrt" | "monorail" | "brt" | "train" | "bus";
}

export const MODE_CARDS: ModeCard[] = [
  {
    id: "metro",
    label: "المترو",
    desc: "شبكة الأنفاق الأقدم في أفريقيا تربط حلوان بالمرج",
    color: "#1d4ed8",
    screen: "metro",
    icon: "metro",
  },
  {
    id: "lrt",
    label: "القطار الخفيف",
    desc: "يصل عدلي منصور بمدينة الفنون في العاصمة الإدارية",
    color: "#0284c7",
    screen: "lrt",
    icon: "lrt",
  },
  {
    id: "monorail",
    label: "المونوريل",
    desc: "أطول خط مونوريل في العالم فوق شرق النيل",
    color: "#7c3aed",
    screen: "monorail",
    icon: "monorail",
  },
  {
    id: "brt",
    label: "BRT",
    desc: "مسارات سريعة مخصصة على الطريق الدائري بـ106 كم",
    color: "#d97706",
    screen: "brt",
    icon: "brt",
  },
  {
    id: "train",
    label: "سكة حديد",
    desc: "ربط القاهرة الكبرى بالمحافظات من محطة رمسيس",
    color: "#991b1b",
    screen: "train",
    icon: "train",
  },
  {
    id: "bus",
    label: "أتوبيس",
    desc: "شبكة النقل الحضري التي تخترق كل حي من أحياء المدينة",
    color: "#0d9488",
    screen: "map",
    icon: "bus",
  },
];

/* ------------------------------- Partner strip ----------------------------- */

export interface Partner {
  nameAr: string;
  nameEn: string;
}

export const PARTNERS: Partner[] = [
  { nameAr: "الهيئة القومية للأنفاق", nameEn: "NAT" },
  { nameAr: "مصر للنقل الحضري", nameEn: "CTA" },
  { nameAr: "السكك الحديدية المصرية", nameEn: "ENR" },
  { nameAr: "جهاز تنمية القاهرة", nameEn: "UDP" },
];

/* -------------------------------- Own footer ------------------------------- */

export interface FooterCol {
  title: string;
  links: { label: string; screen: ScreenKey }[];
}

export const FOOTER_COLS: FooterCol[] = [
  {
    title: "الشبكات",
    links: [
      { label: "مترو الأنفاق", screen: "metro" },
      { label: "القطار الكهربائي الخفيف", screen: "lrt" },
      { label: "المونوريل", screen: "monorail" },
      { label: "الحافلات السريعة BRT", screen: "brt" },
      { label: "السكك الحديدية", screen: "train" },
    ],
  },
  {
    title: "الأجور",
    links: [
      { label: "أجور المترو الرسمية", screen: "fares" },
      { label: "أجور القطار الخفيف", screen: "fares" },
      { label: "تذاكر BRT", screen: "brt" },
      { label: "بطاقات واصل", screen: "fares" },
    ],
  },
  {
    title: "المجتمع",
    links: [
      { label: "أسئلة المسافرين", screen: "community" },
      { label: "أبلغ عن مشكلة", screen: "community" },
      { label: "إرشادات السفر", screen: "community" },
      { label: "آراء الراكب", screen: "community" },
    ],
  },
  {
    title: "عن واصل",
    links: [
      { label: "الخريطة الكاملة", screen: "map" },
      { label: "مخطط الرحلات", screen: "planner" },
      { label: "الإشعارات", screen: "notifications" },
      { label: "تسجيل الدخول", screen: "auth" },
    ],
  },
];
