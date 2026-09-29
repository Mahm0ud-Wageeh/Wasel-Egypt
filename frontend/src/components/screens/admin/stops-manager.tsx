"use client";

/**
 * StopsManager — light edition, real data only.
 * Lists /stops from the backend; empty + error states are honest.
 * Create/delete write through the real API — the local list only changes
 * when the server confirms (followed by a refetch).
 */

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  MapPin,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  X,
  Accessibility,
} from "lucide-react";
import { fetchAdminStops, createAdminStop, deleteAdminStop } from "@/api/admin";

interface StopItem {
  id: number | string;
  name_ar: string;
  name_en: string;
  line: string;
  mode: string;
  lat: number;
  lng: number;
  is_transfer?: boolean;
  wheelchair_accessible?: boolean;
}

export function StopsManager() {
  const [stops, setStops] = useState<StopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newLine, setNewLine] = useState("L1");
  const [newLat, setNewLat] = useState("30.0444");
  const [newLng, setNewLng] = useState("31.2357");
  const [newAccessible, setNewAccessible] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadStops = async () => {
    try {
      const res = await fetchAdminStops();
      const list = Array.isArray(res) ? res : res?.data;
      setStops(
        Array.isArray(list)
          ? list.map((s: any) => ({
              id: s.id,
              name_ar: s.name_ar || s.name || "—",
              name_en: s.name_en || s.name || "",
              line: s.line_code || "L1",
              mode: s.mode || "metro",
              lat: Number(s.latitude ?? s.lat ?? 0),
              lng: Number(s.longitude ?? s.lng ?? 0),
              is_transfer: s.is_transfer || false,
              wheelchair_accessible: s.wheelchair_accessible ?? true,
            }))
          : []
      );
      setFailed(false);
    } catch {
      setFailed(true);
      setStops([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadStops();
    })();
  }, []);

  const refreshStops = () => {
    setLoading(true);
    loadStops();
  };

  const filteredStops = useMemo(() => {
    return stops.filter((s) => {
      const matchesSearch =
        !search.trim() ||
        s.name_ar.toLowerCase().includes(search.toLowerCase()) ||
        s.name_en.toLowerCase().includes(search.toLowerCase());

      const matchesLine = lineFilter === "all" || s.line === lineFilter;

      return matchesSearch && matchesLine;
    });
  }, [stops, search, lineFilter]);

  const handleCreateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAr.trim()) {
      toast({ title: "يرجى كتابة اسم المحطة بالعربية", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await createAdminStop({
        name: newEn || newAr,
        name_ar: newAr,
        name_en: newEn || newAr,
        latitude: parseFloat(newLat),
        longitude: parseFloat(newLng),
        line_code: newLine,
        wheelchair_accessible: newAccessible,
      });
      toast({
        title: "تمت إضافة المحطة بنجاح",
        description: `أُضيفت محطة "${newAr}" إلى مسار الخط (${newLine}).`,
      });
      setAddModalOpen(false);
      setNewAr("");
      setNewEn("");
      await loadStops();
    } catch {
      toast({
        title: "خطأ أثناء إضافة المحطة",
        description: "تعذر حفظ المحطة في قاعدة البيانات — لم يُحفظ أي شيء.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف محطة "${name}"؟`)) return;
    try {
      await deleteAdminStop(id);
      setStops((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: "تم حذف المحطة",
        description: `أزيلت محطة "${name}" من الشبكة.`,
      });
    } catch {
      toast({ title: "فشل الحذف — المحطة ما زالت موجودة", variant: "destructive" });
    }
  };

  const getLineBadge = (line: string) => {
    const map: Record<string, { label: string; color: string }> = {
      L1: { label: "الخط الأول (حلوان - المرج)", color: "#0072bc" },
      L2: { label: "الخط الثاني (شبرا - الجيزة)", color: "#ed1c24" },
      L3: { label: "الخط الثالث (عدلي منصور - إمبابة/جامعة القاهرة)", color: "#00a651" },
      LRT: { label: "قطار العاصمة LRT", color: "#6647f0" },
      MNR: { label: "المونوريل", color: "#f39200" },
      BRT: { label: "الأتوبيس الترددي BRT", color: "#00b5e2" },
      TRAIN: { label: "سكك حديد مصر", color: "#555" },
    };
    const info = map[line] || { label: line, color: "#888" };
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
        style={{ borderColor: `${info.color}40`, backgroundColor: `${info.color}12`, color: info.color }}
      >
        <span className="size-1.5 rounded-full" style={{ backgroundColor: info.color }} />
        {info.label}
      </span>
    );
  };

  if (!loading && failed) {
    return (
      <div className="rounded-2xl border border-dashed border-bone bg-white px-6 py-14 text-center">
        <MapPin className="mx-auto size-8 text-ash" />
        <p className="mt-3 font-head text-[15px] font-black text-ink">تعذر تحميل المحطات</p>
        <p className="mt-1 text-[12.5px] text-slateink">الخادم غير متاح حالياً — لا توجد بيانات معروضة.</p>
        <button
          type="button"
          onClick={loadStops}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-bold text-white hover:bg-carbon"
        >
          <RefreshCw className="size-3.5" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bone bg-white p-4 shadow-xs">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-bone bg-mist/60 px-3 py-2 min-w-[240px]">
          <Search className="size-4 text-ash" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن محطة بالعربية أو الإنجليزية…"
            className="w-full bg-transparent text-[13px] text-ink placeholder-ash focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="rounded-xl border border-bone bg-white px-3 py-2 text-[12px] font-bold text-carbon focus:outline-hidden"
          >
            <option value="all">كل خطوط وشبكات النقل</option>
            <option value="L1">المترو — الخط الأول</option>
            <option value="L2">المترو — الخط الثاني</option>
            <option value="L3">المترو — الخط الثالث</option>
            <option value="LRT">قطار العاصمة LRT</option>
            <option value="MNR">المونوريل</option>
            <option value="BRT">الأتوبيس الترددي BRT</option>
          </select>

          <button
            type="button"
            onClick={refreshStops}
            disabled={loading}
            className="flex size-9 items-center justify-center rounded-xl border border-bone bg-white text-slateink hover:bg-mist hover:text-ink"
            title="تحديث المحطات"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[12px] font-bold text-white hover:bg-carbon transition shadow-sm"
          >
            <Plus className="size-4" />
            إضافة محطة جديدة
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="flex items-center justify-between text-[12px] text-slateink px-1">
        <span>إجمالي المحطات المعروضة: <strong className="text-ink">{loading ? "…" : filteredStops.length}</strong></span>
        <span>بيانات حية من قاعدة البيانات</span>
      </div>

      {/* Stops Table */}
      <div className="overflow-x-auto rounded-2xl border border-bone bg-white shadow-xs">
        <table className="w-full border-collapse text-start text-[13px]">
          <thead>
            <tr className="border-b border-bone bg-mist/50 text-start text-[11px] font-bold text-ash">
              <th className="px-4 py-3 text-start">المحطة (عربي / إنجليزي)</th>
              <th className="px-4 py-3 text-start">الخط والشبكة</th>
              <th className="px-4 py-3 text-start">الإحداثيات الجغرافية (WGS84)</th>
              <th className="px-4 py-3 text-start">إتاحة ذوي الهمم</th>
              <th className="px-4 py-3 text-end">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone">
            {filteredStops.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ash">
                  {loading ? "جارٍ تحميل شبكة المحطات…" : "لا توجد محطات — القائمة فارغة أو لا تطابق البحث."}
                </td>
              </tr>
            ) : (
              filteredStops.slice(0, 100).map((s) => (
                <tr key={s.id} className="hover:bg-mist/50 transition">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-interactive/10 text-interactive">
                        <MapPin className="size-4" />
                      </span>
                      <div>
                        <div className="font-bold text-ink">{s.name_ar}</div>
                        <div className="text-[11px] text-ash" dir="ltr">{s.name_en}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    {getLineBadge(s.line)}
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="num font-mono text-[11.5px] text-slateink" dir="ltr">
                      {Number(s.lat).toFixed(4)}, {Number(s.lng).toFixed(4)}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    {s.wheelchair_accessible ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Accessibility className="size-3.5" />
                        مجهزة
                      </span>
                    ) : (
                      <span className="text-[11px] text-ash">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.name_ar)}
                      className="flex size-8 items-center justify-center rounded-lg border border-l2/20 bg-l2/10 text-l2 hover:bg-l2/20 ms-auto"
                      title="حذف المحطة"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Stop Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-bone bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-bone pb-4">
              <h3 className="font-head text-[16px] font-black text-ink">إضافة محطة جديدة للشبكة</h3>
              <button type="button" onClick={() => setAddModalOpen(false)} className="text-ash hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStop} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">اسم المحطة بالعربية</label>
                <input
                  type="text"
                  required
                  value={newAr}
                  onChange={(e) => setNewAr(e.target.value)}
                  placeholder="مثال: روض الفرج"
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[13px] text-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">اسم المحطة بالإنجليزية</label>
                <input
                  type="text"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                  placeholder="e.g. Rod El Farag"
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[13px] text-ink focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">الخط التابع له</label>
                <select
                  value={newLine}
                  onChange={(e) => setNewLine(e.target.value)}
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[12px] font-bold text-ink focus:outline-hidden"
                >
                  <option value="L1">المترو — الخط الأول</option>
                  <option value="L2">المترو — الخط الثاني</option>
                  <option value="L3">المترو — الخط الثالث</option>
                  <option value="LRT">قطار العاصمة LRT</option>
                  <option value="MNR">المونوريل</option>
                  <option value="BRT">الأتوبيس الترددي BRT</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-carbon mb-1">خط العرض (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[12px] text-ink focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-carbon mb-1">خط الطول (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[12px] text-ink focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acc"
                  checked={newAccessible}
                  onChange={(e) => setNewAccessible(e.target.checked)}
                  className="size-4 rounded accent-interactive"
                />
                <label htmlFor="acc" className="text-[12px] text-carbon cursor-pointer">
                  محطة مجهزة لمستخدمي الكراسي المتحركة وذوي الهمم
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-bone pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-xl border border-bone px-4 py-2 text-[12px] font-bold text-slateink hover:bg-mist"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-5 py-2 text-[12px] font-bold text-white hover:bg-carbon"
                >
                  <Check className="size-4" />
                  حفظ المحطة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
