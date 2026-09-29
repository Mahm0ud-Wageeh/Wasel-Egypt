"use client";

/**
 * Admin widgets — light command-center edition.
 * REAL DATA ONLY: every widget starts in a loading state, renders backend
 * values on success, and hides itself (returns null) when its endpoint is
 * unreachable. No fallback constants, no seeded numbers, no fake animations.
 *  - KpiRow:          /admin/analytics/dashboard (real totals + rates)
 *  - OpsTable:        /telemetry/live polled every 15s (real vehicles)
 *  - ModerationQueue: /reports (real pending reports)
 *  - GtfsGovernance:  /admin/data/imports + /admin/data/quality (real logs)
 *  - NetworkHealthMap: live MapLibre map fed by /telemetry/live
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Activity,
  Check,
  Compass,
  Database,
  Gauge,
  LoaderCircle,
  Navigation,
  RotateCw,
  Siren,
  Users,
  Waypoints,
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
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";

/* ------------------------------ shared bits ----------------------------- */

function Card({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={cn("rounded-2xl border border-bone bg-white p-5 shadow-xs", className)}>
      {children}
    </section>
  );
}

function CardHead({ icon: Icon, title, side }: { icon: LucideIcon; title: string; side?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-ink/[0.05] text-ink">
          <Icon className="size-4" />
        </span>
        <span className="font-head text-[13.5px] font-black text-ink">{title}</span>
      </div>
      {side}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-mist", className)} aria-hidden="true" />;
}

const MODE_LABEL: Record<string, string> = {
  metro: "مترو",
  lrt: "LRT",
  monorail: "مونوريل",
  brt: "BRT",
  train: "قطار",
  bus: "حافلة",
};

function fmtInt(v: unknown): string | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n).toLocaleString("en-US");
}

/* ================================= KPIs ================================= */

interface Kpi {
  id: string;
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent: string;
}

function dashboardToKpis(dash: any): Kpi[] | null {
  const t = dash?.totals;
  if (!t) return null;
  const out: Kpi[] = [];
  const push = (id: string, label: string, raw: unknown, sub: string, icon: LucideIcon, accent: string, suffix = "") => {
    const v = fmtInt(raw);
    if (v == null) return;
    out.push({ id, label, value: `${v}${suffix}`, sub, icon, accent });
  };
  push("users", "إجمالي المستخدمين", t.users, "حساب مسجل", Users, "text-interactive bg-interactive/10");
  push("journeys", "رحلات منشأة", t.journeys_created, "إجمالي الرحلات", Navigation, "text-l1 bg-l1/10");
  push("active", "رحلات نشطة الآن", t.active_journeys_in_flight, "قيد التنفيذ", Activity, "text-emerald bg-emerald/10");
  push("pending", "بلاغات معلقة", t.pending_reports, "بانتظار المراجعة", Siren, "text-brt bg-brt/10");
  push("deviations", "انحرافات مسار", t.deviations, "الفترة الحالية", Compass, "text-mnr bg-mnr/10");
  const rate = Number(dash?.journey_completion_rate);
  if (Number.isFinite(rate)) {
    out.push({
      id: "completion",
      label: "معدل إكمال الرحلات",
      value: `${Math.round(rate)}%`,
      sub: "رحلات مكتملة",
      icon: Gauge,
      accent: "text-lrt bg-lrt/10",
    });
  }
  return out.length > 0 ? out : null;
}

export function KpiRow() {
  const [kpis, setKpis] = useState<Kpi[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAdminDashboard()
      .then((dash) => {
        if (!cancelled) setKpis(dashboardToKpis(dash));
      })
      .catch(() => {
        if (!cancelled) setKpis(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="مؤشرات الأداء الرئيسية">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
    );
  }

  // No backend → no cards at all (never invent metrics).
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="مؤشرات الأداء الرئيسية">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div key={k.id} className="rounded-2xl border border-bone bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] font-bold text-ash">{k.label}</span>
              <span className={cn("flex size-7 items-center justify-center rounded-lg", k.accent)}>
                <Icon className="size-3.5" />
              </span>
            </div>
            <div className="num mt-2 text-[26px] font-black leading-none tracking-tight text-ink">{k.value}</div>
            <div className="mt-1.5 text-[11px] font-medium text-slateink">{k.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================ live ops table ============================ */

export function OpsTable() {
  const { vehicles, count, loading, error, live, timestamp } = useLiveTelemetry(15000);

  const rows = useMemo(() => vehicles.slice(0, 12), [vehicles]);

  if (loading) {
    return (
      <Card label="المركبات الحية">
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-slateink">
          <LoaderCircle className="size-4 animate-spin text-interactive" />
          جارٍ الاتصال بتيليمتري الخادم…
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      </Card>
    );
  }

  // Backend unreachable → hide the whole live section.
  if (error && rows.length === 0) return null;

  return (
    <Card label="المركبات الحية">
      <div className="flex items-center justify-between gap-3 border-b border-bone pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", live ? "animate-ping bg-emerald" : "bg-ash")} />
            <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-emerald" : "bg-ash")} />
          </span>
          <span className="font-head text-[13.5px] font-black text-ink">المركبات الحية — بث الخادم</span>
        </div>
        <span className="mono-tag !text-ash">
          {live ? `LIVE · ${count} مركبة` : "OFFLINE — آخر لقطة محفوظة"}
          {timestamp ? ` · ${new Date(timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[12.5px] font-medium text-ash">لا توجد مركبات نشطة حالياً على الشبكة.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-start">
            <thead>
              <tr className="text-[10.5px] font-bold text-ash">
                <th className="px-4 py-2.5 text-start font-bold">المركبة / الخط</th>
                <th className="px-3 py-2.5 text-start font-bold">الوسيلة</th>
                <th className="px-3 py-2.5 text-start font-bold">السرعة</th>
                <th className="px-3 py-2.5 text-start font-bold">المحطة التالية</th>
                <th className="px-3 py-2.5 text-start font-bold">الوصول المتوقع</th>
                <th className="px-4 py-2.5 text-start font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone">
              {rows.map((v) => (
                <tr key={v.id} className="text-[12.5px] transition-colors hover:bg-mist/60">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: v.color }} />
                      <span className="font-bold text-carbon">{v.line}</span>
                      <span className="num hidden text-[10.5px] text-ash lg:inline" dir="ltr">{v.id}</span>
                    </div>
                    <div className="mt-0.5 ps-5 text-[11px] text-ash">{v.headsign}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center rounded-full border border-bone bg-mist px-2.5 py-1 text-[10.5px] font-bold text-carbon">
                      {MODE_LABEL[v.mode] ?? v.mode}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="num font-bold text-carbon" dir="ltr">{v.speed_kmh} كم/س</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-carbon">{v.next_stop}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="num font-bold text-carbon">~{v.eta_next_stop_mins} د</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[10.5px] font-bold text-emerald">
                      <span className="size-1.5 rounded-full bg-emerald" />
                      {v.status === "on_time" ? "منتظمة" : v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ========================= incident moderation ========================== */

interface Report {
  id: number;
  type: string;
  station: string;
  desc: string;
  ago: string;
}

function backendToReport(item: any): Report {
  const created = item.created_at ? new Date(item.created_at) : null;
  const minsAgo = created ? Math.max(0, Math.round((Date.now() - created.getTime()) / 60000)) : null;
  return {
    id: item.id,
    type: item.type ?? item.category ?? "بلاغ راكب",
    station: item.stop_name ?? item.location ?? "—",
    desc: item.description ?? item.notes ?? "",
    ago: minsAgo == null ? "" : minsAgo < 1 ? "الآن" : `قبل ${minsAgo} د`,
  };
}

export function ModerationQueue() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [resolved, setResolved] = useState<Record<number, "approved" | "rejected">>({});

  useEffect(() => {
    let cancelled = false;
    fetchAdminReports()
      .then((items) => {
        if (cancelled) return;
        const list: any[] = Array.isArray(items) ? items : [];
        setReports(list.slice(0, 10).map(backendToReport));
      })
      .catch(() => {
        if (!cancelled) setReports(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Backend unreachable → hide the queue entirely (no invented reports).
  if (reports === null) return null;

  const pending = reports.filter((r) => !resolved[r.id]).length;

  const moderate = async (id: number, verdict: "approved" | "rejected") => {
    const action = verdict === "approved" ? "verify" : "reject";
    try {
      await moderateReport(id, action);
      setResolved((prev) => ({ ...prev, [id]: verdict }));
      toast({
        title: verdict === "approved" ? "تم التحقق من البلاغ ونشره" : "تم رفض البلاغ",
        description:
          verdict === "approved" ? "أُرسل التنبيه لجميع الركاب على هذا الخط الآن." : "سُجل القرار مع إشعار الراكب المُبلِّغ.",
      });
    } catch {
      toast({
        title: "تعذر تنفيذ القرار",
        description: "الخادم غير متاح — لم يُحفظ أي تغيير.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card label="بلاغات الركاب">
      <CardHead
        icon={Siren}
        title="بلاغات بانتظار المراجعة"
        side={
          <span
            className={cn(
              "num rounded-full border px-2.5 py-1 text-[11px] font-bold",
              pending > 0 ? "border-brt/40 bg-brt/10 text-brt" : "border-emerald/30 bg-emerald/10 text-emerald"
            )}
          >
            {pending} مفتوحة
          </span>
        }
      />

      <div className="mt-4 max-h-[420px] space-y-2.5 overflow-y-auto">
        {reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-bone bg-mist/50 py-10 text-center text-[12.5px] font-medium text-ash">
            لا توجد بلاغات معلقة حالياً — الشبكة هادئة.
          </p>
        ) : (
          reports.map((r) => {
            const verdict = resolved[r.id];
            return (
              <article
                key={r.id}
                className={cn("rounded-xl border p-3.5", verdict ? "border-bone bg-mist/40 opacity-60" : "border-bone bg-white")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-black text-ink">{r.type}</span>
                  <span className="text-[11.5px] font-medium text-slateink">— {r.station}</span>
                  {r.ago ? <span className="num ms-auto text-[11px] font-medium text-ash">{r.ago}</span> : null}
                </div>
                {r.desc ? <p className="mt-1.5 text-[12px] leading-6 text-slateink">{r.desc}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {verdict ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold",
                        verdict === "approved" ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-l2/30 bg-l2/10 text-l2"
                      )}
                    >
                      {verdict === "approved" ? <Check className="size-3.5" /> : <XCircle className="size-3.5" />}
                      {verdict === "approved" ? "تم النشر للركاب" : "مرفوض"}
                    </span>
                  ) : (
                    <span className="ms-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moderate(r.id, "approved")}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/15 px-4 text-[12px] font-bold text-emerald hover:bg-emerald/25"
                      >
                        <Check className="size-3.5" />
                        موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate(r.id, "rejected")}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-bone px-4 text-[12px] font-bold text-slateink hover:border-l2/50 hover:bg-l2/10 hover:text-l2"
                      >
                        <X className="size-3.5" />
                        رفض
                      </button>
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </Card>
  );
}

/* ============================ GTFS governance =========================== */

export function GtfsGovernance() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [feedRows, setFeedRows] = useState<string | null>(null);
  const [qualityPct, setQualityPct] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [importsRes, qualityRes] = await Promise.all([
        fetchDataImports().catch(() => null),
        fetchDataQuality().catch(() => null),
      ]);
      const items: any[] = Array.isArray(importsRes) ? importsRes : (importsRes?.data ?? []);
      const last = items[0];
      if (last) {
        const d = last.created_at ? new Date(last.created_at) : null;
        setLastImport(
          d
            ? `${d.toLocaleDateString("ar-EG")} — ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`
            : "غير محدد"
        );
        setFeedRows(last.row_count != null ? String(last.row_count) : null);
      } else {
        setLastImport(null);
        setFeedRows(null);
      }
      const q = qualityRes?.data ?? qualityRes;
      setQualityPct(q?.valid_pct != null ? String(q.valid_pct) : null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Backend unreachable → hide (never show invented dates or percentages).
  if (!loading && failed) return null;

  return (
    <Card label="إدارة بيانات GTFS">
      <CardHead
        icon={Database}
        title="إدارة بيانات GTFS"
        side={
          qualityPct != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[11px] font-bold text-emerald">
              <span className="size-1.5 rounded-full bg-emerald" />
              <span className="num">{qualityPct}%</span> VALID
            </span>
          ) : undefined
        }
      />

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-[86px]" />
          <Skeleton className="h-[86px]" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-bone bg-mist/50 p-3.5">
            <span className="mono-tag !text-ash">LAST IMPORT</span>
            <div className="mt-1.5 text-[13px] font-bold text-ink">{lastImport ?? "لا توجد استيرادات بعد"}</div>
            <div className="num mt-1 text-[11px] font-medium text-ash">UTC+2 · GTFS</div>
          </div>
          <div className="rounded-xl border border-bone bg-mist/50 p-3.5">
            <span className="mono-tag !text-ash">FEED ROWS</span>
            <div className="num mt-1.5 text-[15px] font-bold text-ink" dir="ltr">{feedRows ?? "—"}</div>
            <div className="num mt-1 text-[11px] font-medium text-ash">STOPS · ROUTES · STOP_TIMES</div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-bone text-[12.5px] font-bold text-carbon hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCw className={cn("size-3.5", loading && "animate-spin")} />
        تحديث البيانات من الخادم
      </button>
    </Card>
  );
}

/* =========================== live network map =========================== */

function vehicleMarkerEl(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:18px;height:18px;border-radius:9999px;border:3px solid #fff;" +
    `background:${color};box-shadow:0 1px 6px rgba(0,0,0,.35);cursor:pointer;`;
  return el;
}

export function NetworkHealthMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const { vehicles, loading, error, live, count } = useLiveTelemetry(15000);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  // Init a light raster map once (client-only).
  useEffect(() => {
    let cancelled = false;
    let map: any = null;
    (async () => {
      try {
        const mod = await import("maplibre-gl");
        const maplibre = (mod as any).default ?? mod;
        if (cancelled || !mapRef.current) return;
        maplibre.setWorkerUrl?.("/map/maplibre-gl-worker.mjs");
        map = new maplibre.Map({
          container: mapRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          },
          center: [31.3, 30.05],
          zoom: 9.5,
          attributionControl: { compact: true },
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
        map.on("load", () => {
          if (!cancelled) setMapReady(true);
        });
        map.on("error", () => {
          if (!cancelled) setMapFailed(true);
        });
        mapObj.current = map;
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      try {
        markers.current.forEach((m) => m.remove());
      } catch { /* ignore */ }
      markers.current.clear();
      if (map) {
        try { map.remove(); } catch { /* ignore */ }
      }
      mapObj.current = null;
    };
  }, []);

  // Sync live vehicle markers (robust sync via dynamic Marker import).
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;
    (async () => {
      const mod = await import("maplibre-gl").catch(() => null);
      if (!mod || cancelled || !mapObj.current) return;
      const Marker = (mod as any).Marker ?? (mod as any).default?.Marker;
      if (!Marker) return;
      const seen = new Set<string>();
      for (const v of vehicles) {
        seen.add(v.id);
        const existing = markers.current.get(v.id);
        if (existing) {
          try { existing.setLngLat([v.lng, v.lat]); } catch { /* ignore */ }
          continue;
        }
        try {
          const marker = new Marker({ element: vehicleMarkerEl(v.color || "#1D4ED8") })
            .setLngLat([v.lng, v.lat])
            .setPopup(
              new (mod as any).Popup({ offset: 12, closeButton: false }).setHTML(
                `<div dir="rtl" style="font-family:inherit;font-size:12px;line-height:1.9;color:#111">` +
                  `<strong>${v.line}</strong><br/>${v.headsign}<br/>` +
                  `<span>السرعة: ${v.speed_kmh} كم/س · التالي: ${v.next_stop} (~${v.eta_next_stop_mins} د)</span></div>`
              )
            )
            .addTo(mapObj.current);
          markers.current.set(v.id, marker);
        } catch { /* ignore */ }
      }
      markers.current.forEach((m, id) => {
        if (!seen.has(id)) {
          try { m.remove(); } catch { /* ignore */ }
          markers.current.delete(id);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicles, mapReady]);

  // Backend unreachable AND no map → hide the widget (no static fake map).
  if (!loading && error && vehicles.length === 0) return null;

  return (
    <Card label="خريطة الشبكة الحية" className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-ink/[0.05] text-ink">
            <Waypoints className="size-4" />
          </span>
          <span className="font-head text-[13.5px] font-black text-ink">خريطة الشبكة الحية</span>
        </div>
        <span className={cn("mono-tag", live ? "!text-emerald" : "!text-ash")}>
          {loading ? "CONNECTING…" : live ? `LIVE · ${count} مركبة` : "OFFLINE"}
        </span>
      </div>

      <div className="p-5 pt-4">
        <div className="relative overflow-hidden rounded-xl border border-bone" dir="ltr">
          <div ref={mapRef} className="h-[320px] w-full bg-mist" />
          {loading && !mapReady ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/60 text-[12.5px] font-bold text-slateink">
              <LoaderCircle className="size-4 animate-spin text-interactive" />
              جارٍ تحميل الخريطة الحية…
            </div>
          ) : null}
          {mapFailed ? (
            <div className="absolute inset-0 flex items-center justify-center bg-mist px-6 text-center text-[12.5px] font-medium text-ash">
              تعذر تحميل طبقة الخريطة — تحقق من الاتصال بالإنترنت.
            </div>
          ) : null}
        </div>
        <p className="mt-2.5 text-[11.5px] leading-6 text-ash">
          مواقع المركبات من تيليمتري الخادم وتتحدث كل 15 ثانية — اضغط أي نقطة لعرض السرعة والمحطة التالية.
        </p>
      </div>
    </Card>
  );
}
