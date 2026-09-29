"use client";

/**
 * FaresManager — light edition, real data only.
 * Starts empty; fills from /admin/fares; on failure shows an honest error
 * with retry. CRUD operations report real API results (no silent catches,
 * no invented rows).
 */

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Banknote,
  Search,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Check,
  X,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { fetchAdminFares, createAdminFare, updateAdminFare, deleteAdminFare } from "@/api/admin";

interface FareItem {
  id: number | string;
  label: string;
  tier?: string;
  amount: number;
  mode_name?: string;
  data_status?: string;
  notes?: string;
}

export function FaresManager() {
  const [fares, setFares] = useState<FareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [editingFare, setEditingFare] = useState<FareItem | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("10");
  const [newTier, setNewTier] = useState("standard");
  const [newMode, setNewMode] = useState("مترو الأنفاق");

  const loadFares = async () => {
    try {
      const res = await fetchAdminFares();
      const list = Array.isArray(res) ? res : (res as any)?.data;
      setFares(
        Array.isArray(list)
          ? list.map((f: any) => ({
              id: f.id,
              label: f.label || "تعريفة ركوب",
              tier: f.tier || "standard",
              amount: Number(f.amount) || 0,
              mode_name: f.transit_mode?.name || f.mode_name || "—",
              data_status: f.data_status || "verified",
            }))
          : []
      );
      setFailed(false);
    } catch {
      setFailed(true);
      setFares([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadFares();
    })();
  }, []);

  const refreshFares = () => {
    setLoading(true);
    loadFares();
  };

  const filteredFares = useMemo(() => {
    return fares.filter((f) => {
      return (
        !search.trim() ||
        f.label.toLowerCase().includes(search.toLowerCase()) ||
        (f.mode_name && f.mode_name.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [fares, search]);

  const handleSaveEdit = async () => {
    if (!editingFare) return;
    setSaving(true);
    const updatedAmount = parseFloat(editAmount) || editingFare.amount;
    try {
      await updateAdminFare(editingFare.id, {
        label: editLabel,
        amount: updatedAmount,
      });
      setFares((prev) =>
        prev.map((f) =>
          f.id === editingFare.id ? { ...f, label: editLabel, amount: updatedAmount } : f
        )
      );
      toast({
        title: "تم تحديث سعر التعريفة",
        description: `أصبح سعر "${editLabel}" الآن ${updatedAmount} جنيه مصري.`,
      });
      setEditingFare(null);
    } catch {
      toast({ title: "فشل تحديث التعريفة — لم يُحفظ أي تغيير", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const amt = parseFloat(newAmount) || 0;
      const created: any = await createAdminFare({
        label: newLabel,
        amount: amt,
        tier: newTier,
      });
      const saved = created?.data ?? created;
      const newEntry: FareItem = {
        id: saved?.id ?? `tmp-${Date.now()}`,
        label: saved?.label ?? newLabel,
        amount: Number(saved?.amount ?? amt),
        tier: saved?.tier ?? newTier,
        mode_name: saved?.transit_mode?.name ?? newMode,
        data_status: saved?.data_status ?? "verified",
      };
      setFares((prev) => [newEntry, ...prev]);
      toast({
        title: "تمت إضافة تعريفة جديدة",
        description: `أُضيفت "${newLabel}" بتكلفة ${amt} ج.م.`,
      });
      setAddModalOpen(false);
      setNewLabel("");
    } catch {
      toast({ title: "فشل إنشاء التعريفة — تحقق من الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number | string, label: string) => {
    if (!confirm(`هل أنت متأكد من حذف تعريفة "${label}"؟`)) return;
    try {
      await deleteAdminFare(id);
      setFares((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "تم حذف التعريفة", description: `أزيلت "${label}" بنجاح.` });
    } catch {
      toast({ title: "فشل الحذف — التعريفة ما زالت موجودة", variant: "destructive" });
    }
  };

  if (!loading && failed) {
    return (
      <div className="rounded-2xl border border-dashed border-bone bg-white px-6 py-14 text-center">
        <Tag className="mx-auto size-8 text-ash" />
        <p className="mt-3 font-head text-[15px] font-black text-ink">تعذر تحميل التعريفات</p>
        <p className="mt-1 text-[12.5px] text-slateink">الخادم غير متاح حالياً — لا توجد أسعار معروضة.</p>
        <button
          type="button"
          onClick={loadFares}
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
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bone bg-white p-4 shadow-xs">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-bone bg-mist/60 px-3 py-2 min-w-[240px]">
          <Search className="size-4 text-ash" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في التعريفات والشرائح…"
            className="w-full bg-transparent text-[13px] text-ink placeholder-ash focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshFares}
            disabled={loading}
            className="flex size-9 items-center justify-center rounded-xl border border-bone bg-white text-slateink hover:bg-mist hover:text-ink"
            title="تحديث البيانات"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[12px] font-bold text-white hover:bg-carbon transition shadow-sm"
          >
            <Plus className="size-4" />
            إضافة شريحة تسعير
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="rounded-xl border border-emerald/25 bg-emerald-50 p-3 text-[12px] text-emerald-800 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-600" />
          الأسعار المعروضة من قاعدة البيانات فقط — عدّلها بحذر فهي تنعكس على الركاب فوراً.
        </span>
        <span className="mono-tag !text-emerald-700">LIVE TARIFF</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-bone bg-white shadow-xs">
        <table className="w-full border-collapse text-start text-[13px]">
          <thead>
            <tr className="border-b border-bone bg-mist/50 text-start text-[11px] font-bold text-ash">
              <th className="px-4 py-3 text-start">الوسيلة والشريحة</th>
              <th className="px-4 py-3 text-start">الرمز البرمجي</th>
              <th className="px-4 py-3 text-start">السعر (جنيه)</th>
              <th className="px-4 py-3 text-start">حالة البيانات</th>
              <th className="px-4 py-3 text-end">تعديل وتحكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone">
            {filteredFares.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ash">
                  {loading ? "جارٍ تحميل التعريفات…" : "لا توجد تعريفات — القائمة فارغة أو لا تطابق البحث."}
                </td>
              </tr>
            ) : (
              filteredFares.map((f) => (
                <tr key={f.id} className="hover:bg-mist/50 transition">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-interactive/10 text-interactive">
                        <Banknote className="size-4.5" />
                      </span>
                      <div>
                        <div className="font-bold text-ink">{f.label}</div>
                        <div className="text-[11px] text-ash">{f.mode_name}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="mono-tag font-mono text-[11px] !text-slateink">{f.tier || "tier-std"}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="num font-head text-[16px] font-black text-emerald-700">
                      {f.amount} <span className="text-[11px] text-ash font-normal">ج.م</span>
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    {f.data_status === "real" || f.data_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        رسمي معتمد
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brt/30 bg-brt/10 px-2 py-0.5 text-[10.5px] font-bold text-brt">
                        تقديرية — بانتظار التوثيق
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFare(f);
                          setEditLabel(f.label);
                          setEditAmount(String(f.amount));
                        }}
                        className="flex size-8 items-center justify-center rounded-lg border border-bone bg-white text-slateink hover:bg-mist hover:text-ink"
                        title="تعديل السعر"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(f.id, f.label)}
                        className="flex size-8 items-center justify-center rounded-lg border border-l2/20 bg-l2/10 text-l2 hover:bg-l2/20"
                        title="حذف التعريفة"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Fare Modal */}
      {editingFare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-bone bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-bone pb-4">
              <h3 className="font-head text-[15px] font-black text-ink">تعديل سعر التعريفة</h3>
              <button type="button" onClick={() => setEditingFare(null)} className="text-ash hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">اسم الشريحة</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[13px] text-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">السعر (جنيه مصري)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[14px] font-black text-emerald-700 focus:outline-hidden"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-bone pt-4">
                <button
                  type="button"
                  onClick={() => setEditingFare(null)}
                  className="rounded-xl border border-bone px-4 py-2 text-[12px] font-bold text-slateink hover:bg-mist"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald-700"
                >
                  <Check className="size-4" />
                  حفظ التعديل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Fare Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-bone bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-bone pb-4">
              <h3 className="font-head text-[15px] font-black text-ink">إضافة شريحة تسعير جديدة</h3>
              <button type="button" onClick={() => setAddModalOpen(false)} className="text-ash hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFare} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">اسم الشريحة أو الوصف</label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="مثال: اشتراك شهري مخفض للطلبة"
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[13px] text-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">الوسيلة</label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value)}
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[12px] font-bold text-ink focus:outline-hidden"
                >
                  <option value="مترو الأنفاق">مترو الأنفاق</option>
                  <option value="قطار العاصمة LRT">قطار العاصمة LRT</option>
                  <option value="المونوريل">المونوريل</option>
                  <option value="الأتوبيس الترددي BRT">الأتوبيس الترددي BRT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-carbon mb-1">السعر (جنيه مصري)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full rounded-xl border border-bone bg-white px-3 py-2 text-[13px] text-ink focus:outline-hidden"
                />
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
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[12px] font-bold text-white hover:bg-carbon"
                >
                  <Check className="size-4" />
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
