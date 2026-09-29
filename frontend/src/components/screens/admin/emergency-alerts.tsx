"use client";

/**
 * EmergencyAlerts — light edition, real data only.
 * Active alerts and reports come from the backend. Broadcast / moderate /
 * delete mutate the local list only after the server confirms — failures
 * surface an honest error toast and change nothing.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Siren,
  Radio,
  Send,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  fetchAdminReports,
  moderateReport,
  broadcastServiceAlert,
  fetchAdminAlerts,
  deleteServiceAlert,
} from "@/api/admin";

interface ActiveAlert {
  id: number | string;
  header_text: string;
  description_text: string;
  severity: "info" | "warning" | "emergency" | string;
  line_code?: string;
  created_at?: string;
}

export function EmergencyAlerts() {
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsFailed, setReportsFailed] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertsFailed, setAlertsFailed] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [header, setHeader] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"warning" | "emergency" | "info">("warning");
  const [affectedLine, setAffectedLine] = useState("L1");
  const [broadcasting, setBroadcasting] = useState(false);

  const loadReports = async () => {
    try {
      const res = await fetchAdminReports();
      const list = Array.isArray(res) ? res : (res as any)?.data;
      setReports(Array.isArray(list) ? list : []);
      setReportsFailed(false);
    } catch {
      setReportsFailed(true);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetchAdminAlerts();
      const list = Array.isArray(res) ? res : (res as any)?.data;
      setActiveAlerts(Array.isArray(list) ? list : []);
      setAlertsFailed(false);
    } catch {
      setAlertsFailed(true);
      setActiveAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadReports();
      await loadAlerts();
    })();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header.trim()) {
      toast({ title: "يرجى كتابة عنوان التنبيه", variant: "destructive" });
      return;
    }

    setBroadcasting(true);
    try {
      const created: any = await broadcastServiceAlert({
        header_text: header,
        description_text: description,
        severity,
        line_code: affectedLine,
        cause: "maintenance",
        consequence: "delay",
      });
      const saved = created?.data ?? created;
      const newAlert: ActiveAlert = {
        id: saved?.id ?? `tmp-${Date.now()}`,
        header_text: saved?.header_text ?? header,
        description_text: saved?.description_text ?? description,
        severity: saved?.severity ?? severity,
        line_code: saved?.line_code ?? affectedLine,
        created_at: saved?.created_at ?? new Date().toISOString(),
      };
      setActiveAlerts((prev) => [newAlert, ...prev]);
      toast({
        title: "تم بث التنبيه لجميع الركاب",
        description: `أُرسل التنبيه "${header}" لشريط التنبيهات الحية فوراً.`,
      });
      setModalOpen(false);
      setHeader("");
      setDescription("");
    } catch {
      toast({ title: "فشل بث التنبيه — لم يُرسل أي شيء", variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteAlert = async (id: number | string) => {
    if (!confirm("هل تريد إزالة هذا التنبيه من شاشات الركاب؟")) return;
    try {
      await deleteServiceAlert(id);
      setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "تم إلغاء التنبيه بنجاح" });
    } catch {
      toast({ title: "فشل الإلغاء — التنبيه ما زال نشطاً", variant: "destructive" });
    }
  };

  const handleModerate = async (reportId: number | string, action: "verify" | "reject" | "resolve") => {
    try {
      await moderateReport(reportId, action);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast({
        title: action === "verify" ? "تم التحقق من البلاغ" : action === "reject" ? "تم رفض البلاغ" : "تم تعيين البلاغ كمحلول",
        description: "تم تحديث حالة البلاغ ومزامنتها مع الخادم.",
      });
    } catch {
      toast({ title: "تعذر تحديث البلاغ — لم يتغير أي شيء", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Broadcast CTA Banner ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-l2/25 bg-l2/[0.06] p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-l2/10 text-l2">
            <Siren className="size-6 animate-pulse" />
          </span>
          <div>
            <h3 className="font-head text-[15px] font-black text-ink">
              بث تنبيهات الخدمة والتعطيل اللحظي (Emergency Broadcast)
            </h3>
            <p className="text-[12px] text-slateink">
              يمكنك نشر إشعار فوري يظهر لجميع مستخدمي التطبيق في حال حدوث عطل طارئ، أعمال صيانة، أو تأخيرات في المترو والقطارات.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-l2 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md hover:bg-l2/90 transition"
        >
          <Radio className="size-4" />
          بث تنبيه جديد الآن
        </button>
      </div>

      {/* ─── Active Alerts Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-head text-[14px] font-black text-ink">التنبيهات الحية النشطة حالياً</span>
          <span className="mono-tag !text-ash">ACTIVE SERVICE ALERTS ({loadingAlerts ? "…" : activeAlerts.length})</span>
        </div>

        {alertsFailed ? (
          <div className="rounded-2xl border border-dashed border-bone bg-white px-6 py-10 text-center">
            <p className="text-[13px] font-bold text-ink">تعذر تحميل التنبيهات النشطة</p>
            <p className="mt-1 text-[12px] text-slateink">الخادم غير متاح حالياً.</p>
            <button
              type="button"
              onClick={() => {
                setLoadingAlerts(true);
                loadAlerts();
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-bold text-white hover:bg-carbon"
            >
              <RefreshCw className="size-3.5" />
              إعادة المحاولة
            </button>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-bone bg-white px-6 py-10 text-center text-[12.5px] font-medium text-ash">
            {loadingAlerts ? "جارٍ تحميل التنبيهات النشطة…" : "لا توجد تنبيهات نشطة حالياً — الشبكة تعمل بانتظام."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeAlerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "relative rounded-2xl border bg-white p-4 shadow-xs transition",
                  a.severity === "emergency"
                    ? "border-l2/30"
                    : a.severity === "warning"
                    ? "border-brt/30"
                    : "border-interactive/25"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {a.severity === "emergency" ? (
                      <Siren className="size-4 text-l2" />
                    ) : (
                      <AlertTriangle className="size-4 text-brt" />
                    )}
                    <h4 className="font-bold text-[13.5px] text-ink">{a.header_text}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(a.id)}
                    className="text-ash hover:text-l2 transition"
                    title="إلغاء التنبيه"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <p className="mt-2 text-[12px] leading-5 text-slateink">{a.description_text}</p>

                <div className="mt-3 flex items-center justify-between border-t border-bone pt-2 text-[11px] text-ash">
                  <span>الخط المتأثر: <strong className="text-carbon">{a.line_code || "الشبكة العامة"}</strong></span>
                  <span>{a.created_at ? new Date(a.created_at).toLocaleTimeString("ar-EG") : "مباشر"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Commuter Reports Moderation Queue ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-head text-[14px] font-black text-ink">طابور مراجعة بلاغات الركاب</span>
            <p className="text-[11px] text-slateink">البلاغات المرسلة من الركاب عبر ميزة المجتمع تحتاج توثيق الإدارة قبل نشرها</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadingReports(true);
              loadReports();
            }}
            disabled={loadingReports}
            className="flex size-8 items-center justify-center rounded-xl border border-bone bg-white text-slateink hover:text-ink"
          >
            <RefreshCw className={cn("size-3.5", loadingReports && "animate-spin")} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-bone bg-white shadow-xs">
          <table className="w-full border-collapse text-start text-[13px]">
            <thead>
              <tr className="border-b border-bone bg-mist/50 text-[11px] font-bold text-ash">
                <th className="px-4 py-3 text-start">نوع البلاغ والمحطة</th>
                <th className="px-4 py-3 text-start">الوصف وتفاصيل العطل</th>
                <th className="px-4 py-3 text-start">المُبلّغ</th>
                <th className="px-4 py-3 text-end">قرار المشرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ash">
                    {loadingReports
                      ? "جارٍ تحميل البلاغات…"
                      : reportsFailed
                      ? "تعذر تحميل البلاغات — الخادم غير متاح."
                      : "لا توجد بلاغات معلقة حالياً — الشبكة تعمل بانتظام."}
                  </td>
                </tr>
              ) : (
                reports.slice(0, 10).map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-mist/50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-ink">{r.type || r.category || "بلاغ"}</div>
                      <div className="text-[11px] text-interactive">{r.stop_name || r.station || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slateink max-w-xs truncate">
                      {r.description || r.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-ash">
                      {r.user?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleModerate(r.id, "verify")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          <CheckCircle className="size-3" />
                          توثيق ونشر
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate(r.id, "reject")}
                          className="inline-flex items-center gap-1 rounded-lg bg-l2/[0.07] border border-l2/20 px-2.5 py-1 text-[11px] font-bold text-l2 hover:bg-l2/15"
                        >
                          <XCircle className="size-3" />
                          رفض
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Alert Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-bone bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-bone pb-4">
              <div className="flex items-center gap-2">
                <Siren className="size-5 text-l2" />
                <h3 className="font-head text-[15px] font-black text-ink">بث تنبيه طوارئ لحظي</h3>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="text-ash hover:text-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">عنوان التنبيه</label>
                <input
                  type="text"
                  required
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="مثال: توقف مؤقت لحركة القطارات بمحطة السادات"
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[13px] text-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">تفاصيل التنبيه وتوجيهات الركاب</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="يرجى استخدام الخط الثالث كمسار بديل لحين عودة الخدمة بانتظام…"
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[12.5px] text-ink focus:outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-carbon mb-1">الخط المتأثر</label>
                  <select
                    value={affectedLine}
                    onChange={(e) => setAffectedLine(e.target.value)}
                    className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[12px] font-bold text-ink focus:outline-hidden"
                  >
                    <option value="L1">المترو — الخط الأول</option>
                    <option value="L2">المترو — الخط الثاني</option>
                    <option value="L3">المترو — الخط الثالث</option>
                    <option value="LRT">قطار العاصمة LRT</option>
                    <option value="MNR">المونوريل</option>
                    <option value="BRT">الأتوبيس الترددي BRT</option>
                    <option value="ALL">كامل الشبكة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-carbon mb-1">درجة الخطورة</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[12px] font-bold text-ink focus:outline-hidden"
                  >
                    <option value="warning">تحذير (تأخير / زحام)</option>
                    <option value="emergency">طوارئ (توقف خدمة)</option>
                    <option value="info">إرشادي (صيانة مجدولة)</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-bone pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-bone px-4 py-2 text-[12px] font-bold text-slateink hover:bg-mist"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-l2 px-5 py-2 text-[12.5px] font-bold text-white hover:bg-l2/90"
                >
                  <Send className="size-3.5" />
                  بث الإشعار الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
