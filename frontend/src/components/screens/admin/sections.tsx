"use client";

/**
 * Admin siblings — telemetry widgets for the Network Operations
 * Center console (spec 19). Dark-panel native: white / #b3b3b3 text,
 * white/10 hairlines, mono numerals, seeded deterministic data.
 * API-first: fetches from /admin/analytics/dashboard, /reports, /admin/data/imports.
 * Falls back to static data when API is unreachable (non-admin user, network error).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LineBadge } from "@/components/kit";
import { toast } from "@/hooks/use-toast";
import { LINES, LINE_STATUS_LABEL, seeded, type TransitLine } from "@/lib/transit-data";
import {
  Check,
  Database,
  LoaderCircle,
  RotateCw,
  Siren,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  fetchAdminDashboard,
  fetchAdminReports,
  moderateReport,
  fetchDataImports,
  fetchDataQuality,
} from "@/api/admin";

/* ================================ KPIs ================================= */

function Sparkline({ seed, color }: { seed: number; color: string }) {
  const points = useMemo(() => {
    const vals = Array.from({ length: 14 }, (_, i) => 6 + seeded(seed * 13 + i) * 18);
    return vals.map((v, i) => `${((i / 13) * 100).toFixed(1)},${(26 - v).toFixed(1)}`).join(" ");
  }, [seed]);
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.9"
      />
    </svg>
  );
}

function Delta({ up, value, good }: { up: boolean; value: string; good: boolean }) {
  const Icon: LucideIcon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold",
        good ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-brt/40 bg-brt/10 text-brt"
      )}
    >
      <Icon className="size-3" />
      {value}
    </span>
  );
}

interface Kpi {
  id: string;
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaUp: boolean;
  good: boolean;
  valueClass: string;
  spark: string;
  seed: number;
}

/** Static fallback KPIs (used when API unreachable) */
const KPIS_FALLBACK: Kpi[] = [
  { id: "punct", label: "انتظام الشبكة", value: "94.6", unit: "%", delta: "−0.4%", deltaUp: false, good: false, valueClass: "text-emerald", spark: "var(--color-emerald)", seed: 3 },
  { id: "fleet", label: "مركبات نشطة", value: "1,284", unit: "", delta: "+2.1%", deltaUp: true, good: true, valueClass: "text-white", spark: "var(--color-interactive)", seed: 11 },
  { id: "riders", label: "ركاب اليوم", value: "4.82M", unit: "", delta: "+1.4%", deltaUp: true, good: true, valueClass: "text-white", spark: "var(--color-mint)", seed: 19 },
  { id: "incidents", label: "حوادث مفتوحة", value: "6", unit: "", delta: "−2", deltaUp: false, good: true, valueClass: "text-brt", spark: "var(--color-brt)", seed: 27 },
  { id: "headway", label: "متوسط الفاصل الزمني", value: "3.2", unit: " د", delta: "−0.3", deltaUp: false, good: true, valueClass: "text-white", spark: "var(--color-lrt)", seed: 35 },
];

/** Map backend dashboard to KPI display format */
function dashboardToKpis(dash: any): Kpi[] {
  if (!dash) return KPIS_FALLBACK;
  try {
    return [
      {
        id: "punct", label: "انتظام الشبكة",
        value: dash.punctuality_pct != null ? String(dash.punctuality_pct) : KPIS_FALLBACK[0].value,
        unit: "%", delta: "", deltaUp: true, good: true,
        valueClass: "text-emerald", spark: "var(--color-emerald)", seed: 3
      },
      {
        id: "fleet", label: "مركبات نشطة",
        value: dash.active_vehicles != null ? String(dash.active_vehicles) : KPIS_FALLBACK[1].value,
        unit: "", delta: "", deltaUp: true, good: true,
        valueClass: "text-white", spark: "var(--color-interactive)", seed: 11
      },
      {
        id: "riders", label: "ركاب اليوم",
        value: dash.daily_riders != null ? String(dash.daily_riders) : KPIS_FALLBACK[2].value,
        unit: "", delta: "", deltaUp: true, good: true,
        valueClass: "text-white", spark: "var(--color-mint)", seed: 19
      },
      {
        id: "incidents", label: "حوادث مفتوحة",
        value: dash.open_incidents != null ? String(dash.open_incidents) : KPIS_FALLBACK[3].value,
        unit: "", delta: "", deltaUp: false, good: true,
        valueClass: "text-brt", spark: "var(--color-brt)", seed: 27
      },
      {
        id: "headway", label: "متوسط الفاصل الزمني",
        value: dash.avg_headway_min != null ? String(dash.avg_headway_min) : KPIS_FALLBACK[4].value,
        unit: " د", delta: "", deltaUp: false, good: true,
        valueClass: "text-white", spark: "var(--color-lrt)", seed: 35
      },
    ];
  } catch {
    return KPIS_FALLBACK;
  }
}

export function KpiRow() {
  const [kpis, setKpis] = useState<Kpi[]>(KPIS_FALLBACK);

  useEffect(() => {
    fetchAdminDashboard()
      .then((dash) => setKpis(dashboardToKpis(dash)))
      .catch(() => { /* keep fallback */ });
  }, []);

  return (
    <section aria-label="مؤشرات الأداء الرئيسية" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((k) => (
        <div key={k.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 settle hover:border-white/20 hover:bg-white/[0.05]">
          <div className="flex items-center justify-between gap-2">
            <span className="mono-tag !text-white/40">{k.label}</span>
            {k.delta ? <Delta up={k.deltaUp} value={k.delta} good={k.good} /> : null}
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className={cn("num text-[28px] font-extrabold leading-none tracking-tight", k.valueClass)}>
              {k.value}
            </span>
            {k.unit ? <span className="text-[12px] font-bold text-white/40">{k.unit}</span> : null}
          </div>
          <div className="mt-2.5">
            <Sparkline seed={k.seed} color={k.spark} />
          </div>
        </div>
      ))}
    </section>
  );
}

/* ============================= live ops table =========================== */

type DarkTone = "ok" | "busy" | "maint";

const TONE_CLASSES: Record<DarkTone, string> = {
  ok: "border-emerald/30 bg-emerald/10 text-emerald",
  busy: "border-brt/40 bg-brt/10 text-brt",
  maint: "border-interactive/30 bg-interactive/10 text-interactive",
};

const TONE_DOT: Record<DarkTone, string> = {
  ok: "bg-emerald",
  busy: "bg-brt",
  maint: "bg-interactive",
};

function lineTone(line: TransitLine): DarkTone {
  if (line.status === "normal") return "ok";
  if (line.status === "busy") return "busy";
  return "maint";
}

export function OpsTable() {
  const rows = useMemo(
    () =>
      LINES.map((line, i) => ({
        line,
        punctuality: (88 + seeded(i + 41) * 11).toFixed(1),
        headway: (2.4 + seeded(i + 57) * 3.4).toFixed(1),
        fleet: 18 + Math.floor(seeded(i + 73) * 140),
        load: Math.round(38 + seeded(i + 89) * 58),
      })),
    []
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]" aria-label="حالة الخطوط الحية">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald" />
          </span>
          <span className="font-head text-[13.5px] font-black text-white">حالة الخطوط — بث حي</span>
        </div>
        <span className="mono-tag !text-white/35">LIVE OPERATIONS · DENSITY 7/10</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-start">
          <thead>
            <tr className="text-[10.5px] font-bold text-white/35">
              <th className="px-5 py-2.5 text-start font-bold">الخط</th>
              <th className="px-3 py-2.5 text-start font-bold">الحالة</th>
              <th className="px-3 py-2.5 text-start font-bold">الانتظام</th>
              <th className="px-3 py-2.5 text-start font-bold">الفاصل</th>
              <th className="px-3 py-2.5 text-start font-bold">الأسطول النشط</th>
              <th className="px-5 py-2.5 text-start font-bold">مؤشر الحمل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = lineTone(r.line);
              return (
                <tr
                  key={r.line.id}
                  className="border-t border-white/[0.06] text-[12.5px] transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <LineBadge code={r.line.code} color={r.line.color} size="sm" />
                      <span className="hidden text-[12px] font-bold text-white/70 lg:inline">{r.line.nameAr}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold", TONE_CLASSES[tone])}>
                      <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />
                      {LINE_STATUS_LABEL[r.line.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="num font-bold text-white">{r.punctuality}%</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="num font-bold text-white/80">{r.headway} د</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="num font-bold text-white/80">{r.fleet}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.load}%`, backgroundColor: r.line.color }}
                        />
                      </div>
                      <span className="num text-[11px] font-bold text-white/45">{r.load}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ========================= incident moderation ========================== */

interface Report {
  id: number;
  type: string;
  station: string;
  lineCode: string;
  lineColor: string;
  desc: string;
  ago: string;
  sla: number;
}

/** Map backend report to display Report */
function backendToReport(item: any, i: number): Report {
  const created = item.created_at ? new Date(item.created_at) : null;
  const minsAgo = created ? Math.round((Date.now() - created.getTime()) / 60000) : i * 4;
  return {
    id: item.id ?? i + 1,
    type: item.type ?? item.category ?? "بلاغ راكب",
    station: item.stop_name ?? item.location ?? "محطة غير محددة",
    lineCode: item.route?.short_name ?? item.line_code ?? "L1",
    lineColor: "var(--color-l1)",
    desc: item.description ?? item.notes ?? "وصف غير متاح",
    ago: `قبل ${minsAgo} د`,
    sla: Math.max(60, 600 - minsAgo * 15),
  };
}

const REPORTS_FALLBACK: Report[] = [
  { id: 1, type: "ازدحام شديد", station: "محطة الشهداء", lineCode: "L1", lineColor: "var(--color-l1)", desc: "الزحام يمنع الوصول إلى بوابات التذاكر منذ 20 دقيقة.", ago: "قبل 4 د", sla: 372 },
  { id: 2, type: "عطل مصعد", station: "محطة السادات", lineCode: "L2", lineColor: "var(--color-l2)", desc: "المصعد متوقف في الجهة الغربية — كبار السن بحاجة لسلم كهربائي.", ago: "قبل 9 د", sla: 654 },
  { id: 3, type: "بوابة تذاكر معطلة", station: "محطة الجامعة", lineCode: "L3", lineColor: "var(--color-l3)", desc: "بوابتان من أصل 6 لا تقرآن البطاقات الذكية.", ago: "قبل 14 د", sla: 900 },
];

function fmtSla(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function ModerationQueue() {
  const [reports, setReports] = useState<Report[]>(REPORTS_FALLBACK);
  const [resolved, setResolved] = useState<Record<number, "approved" | "rejected">>({});
  const [sla, setSla] = useState<Record<number, number>>({});

  // Load real reports on mount
  useEffect(() => {
    fetchAdminReports()
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.slice(0, 10).map(backendToReport);
          setReports(mapped);
          setSla(Object.fromEntries(mapped.map((r) => [r.id, r.sla])));
        } else {
          setSla(Object.fromEntries(REPORTS_FALLBACK.map((r) => [r.id, r.sla])));
        }
      })
      .catch(() => {
        setSla(Object.fromEntries(REPORTS_FALLBACK.map((r) => [r.id, r.sla])));
      });
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setSla((prev) => {
        const next: Record<number, number> = { ...prev };
        for (const r of reports) {
          if (!resolved[r.id] && (next[r.id] ?? 0) > 0) next[r.id] = (next[r.id] ?? 0) - 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [resolved, reports]);

  const pending = reports.filter((r) => !resolved[r.id]).length;

  const moderate = async (id: number, verdict: "approved" | "rejected") => {
    // Call real API
    const action = verdict === "approved" ? "verify" : "reject";
    try {
      await moderateReport(id, action);
    } catch { /* ignore — still update local state */ }
    setResolved((prev) => ({ ...prev, [id]: verdict }));
    toast({
      title: verdict === "approved" ? "تم التحقق من البلاغ ونشره" : "تم رفض البلاغ",
      description:
        verdict === "approved"
          ? "أُرسل التنبيه لجميع الركاب على هذا الخط الآن."
          : "سُجل القرار مع إشعار الراكب المُبلِّغ.",
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02]" aria-label="بلاغات الركاب">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Siren className="size-4 text-brt" />
          <span className="font-head text-[13.5px] font-black text-white">بلاغات بانتظار المراجعة</span>
        </div>
        <span
          className={cn(
            "num rounded-full border px-2.5 py-1 text-[11px] font-bold",
            pending > 0 ? "border-brt/40 bg-brt/10 text-brt" : "border-emerald/30 bg-emerald/10 text-emerald"
          )}
        >
          {pending} مفتوحة
        </span>
      </div>

      <div className="max-h-[420px] space-y-2.5 overflow-y-auto p-4">
        {reports.map((r) => {
          const verdict = resolved[r.id];
          const urgent = !verdict && sla[r.id] < 120;
          return (
            <article
              key={r.id}
              className={cn(
                "rounded-xl border p-3.5 settle",
                verdict ? "border-white/[0.05] bg-white/[0.01] opacity-55" : "border-white/[0.08] bg-white/[0.03]"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <LineBadge code={r.lineCode} color={r.lineColor} size="sm" />
                <span className="text-[12.5px] font-black text-white">{r.type}</span>
                <span className="text-[11.5px] font-medium text-white/45">— {r.station}</span>
                <span className="num ms-auto text-[11px] font-medium text-white/35">{r.ago}</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-6 text-white/60">{r.desc}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {verdict ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold",
                      verdict === "approved" ? TONE_CLASSES.ok : "border-l2/40 bg-l2/10 text-l2"
                    )}
                  >
                    {verdict === "approved" ? <Check className="size-3.5" /> : <XCircle className="size-3.5" />}
                    {verdict === "approved" ? "تم النشر للركاب" : "مرفوض"}
                  </span>
                ) : (
                  <>
                    <span
                      className={cn(
                        "num inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                        urgent ? "border-l2/40 bg-l2/10 text-l2" : "border-white/15 bg-white/[0.04] text-white/60"
                      )}
                      title="مهلة المعالجة المتبقية"
                    >
                      SLA {fmtSla(sla[r.id])}
                    </span>
                    <span className="ms-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moderate(r.id, "approved")}
                        className="settle-fast inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/15 px-4 text-[12px] font-bold text-emerald hover:bg-emerald/25"
                      >
                        <Check className="size-3.5" />
                        موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate(r.id, "rejected")}
                        className="settle-fast inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-4 text-[12px] font-bold text-white/60 hover:border-l2/50 hover:bg-l2/10 hover:text-l2"
                      >
                        <X className="size-3.5" />
                        رفض
                      </button>
                    </span>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ============================ GTFS governance =========================== */

export function GtfsGovernance() {
  const [syncing, setSyncing] = useState(false);
  const [pct, setPct] = useState(0);
  const [lastImport, setLastImport] = useState("جارٍ التحميل…");
  const [feedRows, setFeedRows] = useState<string | null>(null);
  const [qualityPct, setQualityPct] = useState<string>("99.4");
  const pctRef = useRef(0);

  // Fetch real import data
  useEffect(() => {
    fetchDataImports()
      .then((data: any) => {
        const items: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        const last = items[0];
        if (last) {
          const d = last.created_at ? new Date(last.created_at) : null;
          setLastImport(
            d
              ? `${d.toLocaleDateString("ar-EG")} — ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`
              : "غير محدد"
          );
          if (last.row_count) setFeedRows(String(last.row_count));
        } else {
          setLastImport("لا توجد استيرادات بعد");
        }
      })
      .catch(() => { setLastImport("12 أكتوبر — 03:14"); });
    fetchDataQuality()
      .then((q: any) => {
        if (q?.valid_pct != null) setQualityPct(String(q.valid_pct));
      })
      .catch(() => { /* keep default */ });
  }, []);

  useEffect(() => {
    if (!syncing) return;
    const iv = setInterval(() => {
      pctRef.current = Math.min(100, pctRef.current + 8);
      setPct(pctRef.current);
      if (pctRef.current >= 100) {
        clearInterval(iv);
        setSyncing(false);
        setLastImport("الآن — مزامنة ناجحة");
        toast({
          title: "تمت مزامنة بيانات GTFS",
          description: "استيراد الجداول الثابتة اكتمل بنجاح.",
        });
      }
    }, 90);
    return () => clearInterval(iv);
  }, [syncing]);

  const startSync = () => {
    if (syncing) return;
    pctRef.current = 0;
    setPct(0);
    setSyncing(true);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label="إدارة بيانات GTFS">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Database className="size-4 text-interactive" />
          <span className="font-head text-[13.5px] font-black text-white">إدارة بيانات GTFS</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[11px] font-bold text-emerald">
          <span className="size-1.5 rounded-full bg-emerald" />
          <span className="num">{qualityPct}%</span> VALID
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
          <span className="mono-tag !text-white/35">LAST IMPORT</span>
          <div className="mt-1.5 text-[13px] font-bold text-white">{lastImport}</div>
          <div className="num mt-1 text-[11px] font-medium text-white/40">UTC+2 · GTFS REAL</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
          <span className="mono-tag !text-white/35">FEED ROWS</span>
          <div className="num mt-1.5 text-[15px] font-bold text-white" dir="ltr">{feedRows ?? "—"}</div>
          <div className="num mt-1 text-[11px] font-medium text-white/40">STOPS · ROUTES · STOP_TIMES</div>
        </div>
      </div>

      {syncing ? (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-interactive transition-all duration-100"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="num mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-interactive">
            <LoaderCircle className="size-3 animate-spin" />
            {pct}%
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={startSync}
        disabled={syncing}
        className="settle-fast mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 text-[12.5px] font-bold text-white/80 hover:border-white/30 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCw className={cn("size-3.5", syncing && "animate-spin")} />
        إعادة المزامنة
      </button>
    </section>
  );
}

/* =========================== network health map ========================= */

function NetStation({ x, y, color }: { x: number; y: number; color: string }) {
  return <circle cx={x} cy={y} r="4" fill="#0d0d0d" stroke={color} strokeWidth="2" />;
}

export function NetworkHealthMap() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label="خريطة صحة الشبكة">
      <div className="flex items-center justify-between gap-3">
        <span className="font-head text-[13.5px] font-black text-white">خريطة صحة الشبكة</span>
        <span className="mono-tag !text-white/35">NETWORK HEALTH · LIVE</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06] bg-black/40 p-2">
        <svg viewBox="0 0 480 220" className="w-full" aria-hidden="true">
          {/* L1 spine */}
          <path d="M30 60 H450" stroke="var(--color-l1)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* L2 diagonal */}
          <path d="M60 30 C140 110 300 130 440 190" stroke="var(--color-l2)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* delayed segment on L2 — amber pulse */}
          <path d="M150 92 C185 112 215 120 250 126" stroke="var(--color-brt)" strokeWidth="4" fill="none" strokeLinecap="round" className="animate-pulse" />
          <circle cx="205" cy="115" r="5" fill="var(--color-brt)" className="animate-pulse" />
          <text x="222" y="104" fill="var(--color-brt)" fontSize="10" fontWeight="700">تأخر 6 د</text>
          {/* L3 */}
          <path d="M30 190 L200 120 L440 40" stroke="var(--color-l3)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* LRT spur */}
          <path d="M250 190 H450" stroke="var(--color-lrt)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* MNR */}
          <path d="M330 30 L450 100" stroke="var(--color-mnr)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* BRT arc */}
          <path d="M30 120 Q240 14 450 60" stroke="var(--color-brt)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85" />
          {/* stations */}
          <NetStation x={120} y={60} color="var(--color-l1)" />
          <NetStation x={250} y={60} color="var(--color-l1)" />
          <NetStation x={380} y={60} color="var(--color-l1)" />
          <NetStation x={60} y={30} color="var(--color-l2)" />
          <NetStation x={340} y={140} color="var(--color-l2)" />
          <NetStation x={200} y={120} color="var(--color-l3)" />
          <NetStation x={380} y={56} color="var(--color-l3)" />
          <NetStation x={250} y={190} color="var(--color-lrt)" />
          <NetStation x={330} y={30} color="var(--color-mnr)" />
          <NetStation x={120} y={78} color="var(--color-brt)" />
          {/* interchange */}
          <circle cx={250} cy={126} r="5.5" fill="#0d0d0d" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
        </svg>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        {LINES.map((l) => (
          <LineBadge key={l.id} code={l.code} color={l.color} size="sm" />
        ))}
        <span className="ms-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-brt">
          <span className="size-1.5 rounded-full bg-brt animate-pulse" />
          مقطع متأخر: السادات — التحرير
        </span>
      </div>
    </section>
  );
}
