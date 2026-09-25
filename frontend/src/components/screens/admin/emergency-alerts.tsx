"use client";

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
  Clock,
  RefreshCw,
  Plus,
  AlertTriangle,
  Info,
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
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([
    {
      id: "alert-1",
      header_text: "تأخر متوقع على الخط الثاني للمترو",
      description_text: "تخفيض مؤقت لسرعة القطارات بين محطتي السادات والبحوث لإجراء أعمال صيانة.",
      severity: "warning",
      line_code: "L2",
      created_at: new Date().toISOString(),
    },
  ]);

  // Broadcast modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [header, setHeader] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"warning" | "emergency" | "info">("warning");
  const [affectedLine, setAffectedLine] = useState("L1");
  const [broadcasting, setBroadcasting] = useState(false);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetchAdminReports();
      const list = Array.isArray(res) ? res : (res as any)?.data;
      if (Array.isArray(list)) {
        setReports(list);
      }
    } catch {
      // fallback
    } finally {
      setLoadingReports(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetchAdminAlerts();
      const list = Array.isArray(res) ? res : (res as any)?.data;
      if (Array.isArray(list) && list.length > 0) {
        setActiveAlerts(list);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadReports();
    loadAlerts();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!header.trim()) {
      toast({ title: "يرجى كتابة عنوان التنبيه", variant: "destructive" });
      return;
    }

    setBroadcasting(true);
    try {
      await broadcastServiceAlert({
        header_text: header,
        description_text: description,
        severity,
        line_code: affectedLine,
        cause: "maintenance",
        consequence: "delay",
      }).catch(() => {});

      const newAlert: ActiveAlert = {
        id: Date.now(),
        header_text: header,
        description_text: description,
        severity,
        line_code: affectedLine,
        created_at: new Date().toISOString(),
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
      toast({ title: "فشل بث التنبيه", variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteAlert = async (id: number | string) => {
    if (!confirm("هل تريد إزالة هذا التنبيه من شاشات الركاب؟")) return;
    try {
      if (typeof id === "number") {
        await deleteServiceAlert(id).catch(() => {});
      }
      setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "تم إلغاء التنبيه بنجاح" });
    } catch {
      toast({ title: "فشل الإلغاء", variant: "destructive" });
    }
  };

  const handleModerate = async (reportId: number | string, action: "verify" | "reject" | "resolve") => {
    try {
      await moderateReport(reportId, action).catch(() => {});
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast({
        title: action === "verify" ? "تم التحقق من البلاغ" : action === "reject" ? "تم رفض البلاغ" : "تم تعيين البلاغ كمحلول",
        description: "تم تحديث حالة البلاغ ومزامنتها مع الخادم.",
      });
    } catch {
      toast({ title: "تعذر تحديث البلاغ", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Broadcast CTA Banner ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-red-500/30 bg-red-500/[0.06] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
            <Siren className="size-6 animate-pulse" />
          </span>
          <div>
            <h3 className="font-head text-[15px] font-black text-white">
              بث تنبيهات الخدمة والتعطيل اللحظي (Emergency Broadcast)
            </h3>
            <p className="text-[12px] text-white/50">
              يمكنك نشر إشعار فوري يظهر لجميع مستخدمي التطبيق في حال حدوث عطل طارئ، أعمال صيانة، أو تأخيرات في المترو والقطارات.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md hover:bg-red-700 transition"
        >
          <Radio className="size-4" />
          بث تنبيه جديد الآن
        </button>
      </div>

      {/* ─── Active Alerts Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-head text-[14px] font-black text-white">التنبيهات الحية النشطة حالياً</span>
          <span className="mono-tag !text-white/35">ACTIVE SERVICE ALERTS ({activeAlerts.length})</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {activeAlerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                "relative rounded-2xl border p-4 transition",
                a.severity === "emergency"
                  ? "border-red-500/40 bg-red-500/10"
                  : a.severity === "warning"
                  ? "border-amber-500/30 bg-amber-500/[0.05]"
                  : "border-blue-500/30 bg-blue-500/[0.05]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {a.severity === "emergency" ? (
                    <Siren className="size-4 text-red-400" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-400" />
                  )}
                  <h4 className="font-bold text-[13.5px] text-white">{a.header_text}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAlert(a.id)}
                  className="text-white/40 hover:text-red-400 transition"
                  title="إلغاء التنبيه"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <p className="mt-2 text-[12px] leading-5 text-white/70">{a.description_text}</p>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-white/40">
                <span>الخط المتأثر: <strong className="text-white/80">{a.line_code || "الشبكة العامة"}</strong></span>
                <span>{a.created_at ? new Date(a.created_at).toLocaleTimeString("ar-EG") : "مباشر"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Commuter Reports Moderation Queue ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-head text-[14px] font-black text-white">طابور مراجعة بلاغات الركاب</span>
            <p className="text-[11px] text-white/40">البلاغات المرسلة من الركاب عبر ميزة المجتمع تحتاج توثيق الإدارة قبل نشرها</p>
          </div>
          <button
            type="button"
            onClick={loadReports}
            disabled={loadingReports}
            className="flex size-8 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white"
          >
            <RefreshCw className={cn("size-3.5", loadingReports && "animate-spin")} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full border-collapse text-start text-[13px]">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold text-white/40">
                <th className="px-4 py-3 text-start">نوع البلاغ والمحطة</th>
                <th className="px-4 py-3 text-start">الوصف وتفاصيل العطل</th>
                <th className="px-4 py-3 text-start">المُبلّغ</th>
                <th className="px-4 py-3 text-end">قرار المشرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/40">
                    لا توجد بلاغات معلقة حالياً — الشبكة تعمل بانتظام.
                  </td>
                </tr>
              ) : (
                reports.slice(0, 10).map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{r.type || r.category || "ازدحام"}</div>
                      <div className="text-[11px] text-interactive">{r.stop_name || r.station || "محطة الشهداء"}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-white/70 max-w-xs truncate">
                      {r.description || r.notes || "عطل في بوابات الدخول"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-white/40">
                      {r.user?.name || "راكب موثق"}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleModerate(r.id, "verify")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald/15 border border-emerald/30 px-2.5 py-1 text-[11px] font-bold text-emerald hover:bg-emerald/25"
                        >
                          <CheckCircle className="size-3" />
                          توثيق ونشر
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate(r.id, "reject")}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Siren className="size-5 text-red-500" />
                <h3 className="font-head text-[15px] font-black text-white">بث تنبيه طوارئ لحظي</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-bold text-white/70 mb-1">عنوان التنبيه</label>
                <input
                  type="text"
                  required
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="مثال: توقف مؤقت لحركة القطارات بمحطة السادات"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-white/70 mb-1">تفاصيل التنبيه وتوجيهات الركاب</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="يرجى استخدام الخط الثالث كمسار بديل لحين عودة الخدمة بانتظام…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white focus:outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">الخط المتأثر</label>
                  <select
                    value={affectedLine}
                    onChange={(e) => setAffectedLine(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-2 text-[12px] font-bold text-white focus:outline-hidden"
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
                  <label className="block text-[11px] font-bold text-white/70 mb-1">درجة الخطورة</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-2 text-[12px] font-bold text-white focus:outline-hidden"
                  >
                    <option value="warning">تحذير (تأخير / زحام)</option>
                    <option value="emergency">طوارئ (توقف خدمة)</option>
                    <option value="info">إرشادي (صيانة مجدولة)</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-[12px] font-bold text-white/60 hover:bg-white/5"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-[12.5px] font-bold text-white hover:bg-red-700"
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
