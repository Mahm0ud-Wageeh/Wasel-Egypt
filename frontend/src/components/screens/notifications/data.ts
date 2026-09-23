/**
 * Notifications screen — mock inbox domain (deterministic).
 */

export type NotifKind = "line" | "journey" | "offer" | "system";

export type NotifTarget = "metro" | "journey-active" | "fares";

export interface Notif {
  id: string;
  kind: NotifKind;
  titleAr: string;
  bodyAr: string;
  minutesAgo: number;
  unread: boolean;
  lineCode?: string;
  lineColor?: string;
  navigateTo?: NotifTarget;
}

export const KIND_LABEL_AR: Record<NotifKind, string> = {
  line: "تنبيهات الخطوط",
  journey: "تحديثات الرحلات",
  offer: "العروض والاشتراكات",
  system: "النظام",
};

export const NOTIFS: Notif[] = [
  {
    id: "n1",
    kind: "line",
    titleAr: "تعطل مؤقت على الخط الثاني",
    bodyAr: "تأخير 8 دقائق في اتجاه المنيب بسبب عطل إشارات قرب محطة عتبة — فريق الصيانة بالداخل.",
    minutesAgo: 22,
    unread: true,
    lineCode: "L2",
    lineColor: "#dc2626",
    navigateTo: "metro",
  },
  {
    id: "n2",
    kind: "journey",
    titleAr: "انحراف عن مسار رحلتك",
    bodyAr: "انحرفت عن خطتك المعلنة على الخط الثالث — تم احتساب مسار بديل فوري وتحديث ملاحتك تلقائياً.",
    minutesAgo: 48,
    unread: true,
    navigateTo: "journey-active",
  },
  {
    id: "n3",
    kind: "system",
    titleAr: "تم توثيق بلاغك المجتمعي",
    bodyAr: "شكراً لك! بلاغك عن سلم كهربائي متوقف في العتبة وثّقه المشرفون — أضيفنا 5 نقاط لرصيد ثقتك.",
    minutesAgo: 95,
    unread: true,
  },
  {
    id: "n4",
    kind: "line",
    titleAr: "عودة الخدمة الطبيعية للخط الثالث",
    bodyAr: "اكتملت الصيانة في كت كات واستقر الفاصل الزمني على 4 دقائق عبر كل القطارات والفروع.",
    minutesAgo: 130,
    unread: true,
    lineCode: "L3",
    lineColor: "#16a34a",
    navigateTo: "metro",
  },
  {
    id: "n5",
    kind: "journey",
    titleAr: "رحلتك وصلت إلى المحطة التبادلية",
    bodyAr: "نزولك القادم للتبادل بين الخط الأول والثاني في محطة الشهداء — الرصيف المقابل هو الأسرع.",
    minutesAgo: 170,
    unread: true,
    navigateTo: "journey-active",
  },
  {
    id: "n6",
    kind: "offer",
    titleAr: "عرض الاشتراك الشهري الممتع",
    bodyAr: "اشتراك شهري موحد بخصم إضافي عند الشحن من المحفظة الإلكترونية حتى نهاية الأسبوع.",
    minutesAgo: 260,
    unread: true,
    navigateTo: "fares",
  },
  {
    id: "n7",
    kind: "line",
    titleAr: "ازدحام مرتفع قرب محطة الشهداء",
    bodyAr: "كثافة ركاب أعلى من المعتاد على الرصيف — وصلات الخط الأول تعمل بانتظام لكن الانتظار أطول.",
    minutesAgo: 320,
    unread: false,
    lineCode: "L1",
    lineColor: "#1d4ed8",
    navigateTo: "metro",
  },
  {
    id: "n8",
    kind: "journey",
    titleAr: "تذكير برحلة اليوم الموفرة",
    bodyAr: "رحلتك المعتادة 08:15 عبر مونوريل النيل الشرقي أرخص 15% هذا الأسبوع — راجع الخطة.",
    minutesAgo: 420,
    unread: false,
    navigateTo: "journey-active",
  },
  {
    id: "n9",
    kind: "system",
    titleAr: "تحديث سياسات الأجور",
    bodyAr: "دخلت مصفوفة أكتوبر 2024 الرسمية حيز التنفيذ بالكامل — راجع شرائح المحطات المحدثة.",
    minutesAgo: 600,
    unread: false,
    navigateTo: "fares",
  },
  {
    id: "n10",
    kind: "line",
    titleAr: "صيانة مجدولة على القطار الكهربائي الخفيف",
    bodyAr: "تخفيض الرحلات غداً بين 10ص و2م لأعمال الصيانة الدورية على مسار عدلي منصور.",
    minutesAgo: 1490,
    unread: false,
    lineCode: "LRT",
    lineColor: "#0284c7",
    navigateTo: "metro",
  },
  {
    id: "n11",
    kind: "journey",
    titleAr: "اكتملت رحلة الأمس بنجاح",
    bodyAr: "سجّلنا رحلتك من حلوان إلى المرج الجديدة بزمن 68 دقيقة — شارك تقييم الازدحام.",
    minutesAgo: 1560,
    unread: false,
    navigateTo: "journey-active",
  },
  {
    id: "n12",
    kind: "offer",
    titleAr: "نقاط ثقة قابلة للاستبدال",
    bodyAr: "رصيدك من نقاط الثقة يكفي لتذكرة رحلة مجانية — استبدلها من صفحة الأجور قبل انتهاء الصلاحية.",
    minutesAgo: 1650,
    unread: false,
    navigateTo: "fares",
  },
  {
    id: "n13",
    kind: "line",
    titleAr: "استئناف كامل لحركة المونوريل",
    bodyAr: "انتهت أعمال التشغيل التجريبي وعادت الرحلات بانتظام بين محور محمد نجيب والعاصمة الإدارية.",
    minutesAgo: 2600,
    unread: false,
    lineCode: "MNR",
    lineColor: "#7c3aed",
    navigateTo: "metro",
  },
  {
    id: "n14",
    kind: "system",
    titleAr: "نسخة احتياطية لتفضيلاتك",
    bodyAr: "حفظنا خطوطك المفضلة وتنبيهاتك تلقائياً — لا حاجة لأي إجراء من طرفك.",
    minutesAgo: 4300,
    unread: false,
  },
];

export function groupLabelAr(minutesAgo: number): "اليوم" | "أمس" | "سابقًا" {
  if (minutesAgo < 1440) return "اليوم";
  if (minutesAgo < 2880) return "أمس";
  return "سابقًا";
}

export const GROUP_ORDER: Array<"اليوم" | "أمس" | "سابقًا"> = ["اليوم", "أمس", "سابقًا"];

export function timeLabelAr(minutesAgo: number): string {
  if (minutesAgo < 60) return `منذ ${minutesAgo} د`;
  const h = Math.floor(minutesAgo / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}
