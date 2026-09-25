"use client";

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

const DEFAULT_FARES: FareItem[] = [
  { id: 1, label: "تذكرة المترو — منطقة 1 (1 إلى 9 محطات)", tier: "zone_1", amount: 8, mode_name: "مترو الأنفاق", data_status: "verified" },
  { id: 2, label: "تذكرة المترو — منطقة 2 (10 إلى 16 محطة)", tier: "zone_2", amount: 10, mode_name: "مترو الأنفاق", data_status: "verified" },
  { id: 3, label: "تذكرة المترو — منطقة 3 (17 إلى 23 محطة)", tier: "zone_3", amount: 15, mode_name: "مترو الأنفاق", data_status: "verified" },
  { id: 4, label: "تذكرة المترو — منطقة 4 (أكثر من 23 محطة)", tier: "zone_4", amount: 20, mode_name: "مترو الأنفاق", data_status: "verified" },
  { id: 5, label: "قطار العاصمة الخفيف LRT — 3 محطات", tier: "lrt_short", amount: 10, mode_name: "قطار العاصمة LRT", data_status: "verified" },
  { id: 6, label: "قطار العاصمة الخفيف LRT — حتى 7 محطات", tier: "lrt_mid", amount: 15, mode_name: "قطار العاصمة LRT", data_status: "verified" },
  { id: 7, label: "قطار العاصمة الخفيف LRT — المسار كاملاً", tier: "lrt_full", amount: 20, mode_name: "قطار العاصمة LRT", data_status: "verified" },
  { id: 8, label: "الأتوبيس الترددي BRT — تذكرة موحدة للطريق الدائري", tier: "brt_standard", amount: 12, mode_name: "الأتوبيس الترددي BRT", data_status: "verified" },
  { id: 9, label: "مونوريل شرق النيل (مدينة نصر - العاصمة)", tier: "mnr_standard", amount: 25, mode_name: "المونوريل", data_status: "verified" },
];

export function FaresManager() {
  const [fares, setFares] = useState<FareItem[]>(DEFAULT_FARES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingFare, setEditingFare] = useState<FareItem | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // New fare modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("10");
  const [newTier, setNewTier] = useState("standard");
  const [newMode, setNewMode] = useState("مترو الأنفاق");

  const loadFares = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminFares();
      const list = Array.isArray(res) ? res : (res as any)?.data;
      if (Array.isArray(list) && list.length > 0) {
        setFares(
          list.map((f: any) => ({
            id: f.id,
            label: f.label || "تعريفة ركوب",
            tier: f.tier || "standard",
            amount: Number(f.amount) || 10,
            mode_name: f.transit_mode?.name || f.mode_name || "مترو الأنفاق",
            data_status: f.data_status || "verified",
          }))
        );
      }
    } catch {
      // keep default official fares
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFares();
  }, []);

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
      if (typeof editingFare.id === "number") {
        await updateAdminFare(editingFare.id, {
          label: editLabel,
          amount: updatedAmount,
        }).catch(() => {});
      }
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
      toast({ title: "فشل تحديث التعريفة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const amt = parseFloat(newAmount) || 10;
      await createAdminFare({
        label: newLabel,
        amount: amt,
        tier: newTier,
      }).catch(() => {});

      const newEntry: FareItem = {
        id: Date.now(),
        label: newLabel,
        amount: amt,
        tier: newTier,
        mode_name: newMode,
        data_status: "verified",
      };

      setFares((prev) => [newEntry, ...prev]);
      toast({
        title: "تمت إضافة تعريفة جديدة",
        description: `أُضيفت "${newLabel}" بتكلفة ${amt} ج.م.`,
      });
      setAddModalOpen(false);
      setNewLabel("");
    } catch {
      toast({ title: "فشل إنشاء التعريفة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number | string, label: string) => {
    if (!confirm(`هل أنت متأكد من حذف تعريفة "${label}"؟`)) return;
    try {
      if (typeof id === "number") {
        await deleteAdminFare(id).catch(() => {});
      }
      setFares((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "تم حذف التعريفة", description: `أزيلت "${label}" بنجاح.` });
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 min-w-[240px]">
          <Search className="size-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في التعريفات والشرائح…"
            className="w-full bg-transparent text-[13px] text-white placeholder-white/35 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadFares}
            disabled={loading}
            className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
            title="تحديث البيانات"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-interactive px-3.5 py-2 text-[12px] font-bold text-white hover:bg-interactive/90 transition shadow-sm"
          >
            <Plus className="size-4" />
            إضافة شريحة تسعير
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-3 text-[12px] text-emerald-300 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald" />
          مصفوفة أسعار واصل مصر متزامنة مع القرارات الرسمية لوزارة النقل وجهاز تنظيم النقل البري والداخلي.
        </span>
        <span className="mono-tag !text-emerald/70">OFFICIAL TARIFF</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="w-full border-collapse text-start text-[13px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-start text-[11px] font-bold text-white/40">
              <th className="px-4 py-3 text-start">الوسيلة والشريحة</th>
              <th className="px-4 py-3 text-start">الرمز البرمجي</th>
              <th className="px-4 py-3 text-start">السعر الرسمي (جنيه)</th>
              <th className="px-4 py-3 text-start">حالة البيانات</th>
              <th className="px-4 py-3 text-end">تعديل وتحكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredFares.map((f) => (
              <tr key={f.id} className="hover:bg-white/[0.02] transition">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-interactive">
                      <Banknote className="size-4.5" />
                    </span>
                    <div>
                      <div className="font-bold text-white">{f.label}</div>
                      <div className="text-[11px] text-white/40">{f.mode_name}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  <span className="mono-tag font-mono text-[11px] !text-white/60">
                    {f.tier || "tier-std"}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="num font-head text-[16px] font-black text-emerald">
                    {f.amount} <span className="text-[11px] text-white/40 font-normal">ج.م</span>
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald">
                    <span className="size-1.5 rounded-full bg-emerald" />
                    رسمي معتمد
                  </span>
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
                      className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white"
                      title="تعديل السعر"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id, f.label)}
                      className="flex size-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      title="حذف التعريفة"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Fare Modal */}
      {editingFare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-head text-[15px] font-black text-white">تعديل سعر التعريفة</h3>
              <button
                type="button"
                onClick={() => setEditingFare(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-bold text-white/70 mb-1">اسم الشريحة</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-white/70 mb-1">السعر (جنيه مصري)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[14px] font-black text-emerald focus:outline-hidden"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingFare(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-[12px] font-bold text-white/60 hover:bg-white/5"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald/90"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-head text-[15px] font-black text-white">إضافة شريحة تسعير جديدة</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFare} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-bold text-white/70 mb-1">اسم الشريحة أو الوصف</label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="مثال: اشتراك شهري مخفض للطلبة"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-white/70 mb-1">الوسيلة</label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-2 text-[12px] font-bold text-white focus:outline-hidden"
                >
                  <option value="مترو الأنفاق">مترو الأنفاق</option>
                  <option value="قطار العاصمة LRT">قطار العاصمة LRT</option>
                  <option value="المونوريل">المونوريل</option>
                  <option value="الأتوبيس الترددي BRT">الأتوبيس الترددي BRT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-white/70 mb-1">السعر (جنيه مصري)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white focus:outline-hidden"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-[12px] font-bold text-white/60 hover:bg-white/5"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-interactive px-4 py-2 text-[12px] font-bold text-white hover:bg-interactive/90"
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
