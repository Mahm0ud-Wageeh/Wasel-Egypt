"use client";

/**
 * UsersManager — light edition, real data only.
 * Starts empty; fills from /admin/users; on failure shows an honest error
 * with retry (never invented users).
 */

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  Edit2,
  Check,
  Mail,
  Phone,
} from "lucide-react";
import { fetchAdminUsers, updateAdminUser, deleteAdminUser } from "@/api/admin";

interface UserItem {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: "active" | "inactive" | "suspended" | string;
  roles?: { name: string; display_name?: string }[];
  trust_score?: number;
  created_at?: string;
}

export function UsersManager() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    try {
      const res = await fetchAdminUsers();
      const list = Array.isArray(res) ? res : res?.data;
      setUsers(Array.isArray(list) ? list : []);
      setFailed(false);
    } catch {
      setFailed(true);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadUsers();
    })();
  }, []);

  const refreshUsers = () => {
    setLoading(true);
    loadUsers();
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search.trim() ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone && u.phone.includes(search));

      const userRole = u.roles?.[0]?.name || "user";
      const matchesRole = roleFilter === "all" || userRole === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleSaveEdit = async (userId: number) => {
    setActionLoading(true);
    try {
      await updateAdminUser(userId, {
        role: selectedRole,
        status: selectedStatus,
      });
      toast({
        title: "تم تحديث بيانات المستخدم",
        description: `تم حفظ الصلاحية (${selectedRole}) والحالة (${selectedStatus}) بنجاح.`,
      });
      setEditingUserId(null);
      loadUsers();
    } catch {
      toast({
        title: "تعذر تحديث المستخدم",
        description: "حدث خطأ أثناء الاتصال بالخادم.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      await deleteAdminUser(userId);
      toast({
        title: "تم حذف المستخدم",
        description: `تم إزالة حساب "${userName}" نهائياً من النظام.`,
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      toast({
        title: "تعذر حذف المستخدم",
        description: "حدث خطأ أو أن الحساب يمتلك صلاحيات إدارة عليا.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (roles?: { name: string }[]) => {
    const role = roles?.[0]?.name || "user";
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-700">
          <Shield className="size-3" />
          مدير نظام
        </span>
      );
    }
    if (role === "moderator") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700">
          <ShieldAlert className="size-3" />
          مشرف
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-bone bg-mist px-2 py-0.5 text-[10px] font-bold text-slateink">
        <UserCheck className="size-3" />
        راكب
      </span>
    );
  };

  if (!loading && failed) {
    return (
      <div className="rounded-2xl border border-dashed border-bone bg-white px-6 py-14 text-center">
        <UserX className="mx-auto size-8 text-ash" />
        <p className="mt-3 font-head text-[15px] font-black text-ink">تعذر تحميل المستخدمين</p>
        <p className="mt-1 text-[12.5px] text-slateink">الخادم غير متاح حالياً — لا توجد بيانات معروضة.</p>
        <button
          type="button"
          onClick={loadUsers}
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
      {/* Search & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bone bg-white p-4 shadow-xs">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-bone bg-mist/60 px-3 py-2 min-w-[240px]">
          <Search className="size-4 text-ash" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، البريد، أو الهاتف…"
            className="w-full bg-transparent text-[13px] text-ink placeholder-ash focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-bone bg-white px-3 py-2 text-[12px] font-bold text-carbon focus:outline-hidden"
          >
            <option value="all">كل الصلاحيات</option>
            <option value="admin">مدير نظام (Admin)</option>
            <option value="moderator">مشرف (Moderator)</option>
            <option value="user">راكب (User)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-bone bg-white px-3 py-2 text-[12px] font-bold text-carbon focus:outline-hidden"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط (Active)</option>
            <option value="suspended">موقوف (Suspended)</option>
            <option value="inactive">غير نشط (Inactive)</option>
          </select>

          <button
            type="button"
            onClick={refreshUsers}
            disabled={loading}
            className="flex size-9 items-center justify-center rounded-xl border border-bone bg-white text-slateink hover:bg-mist hover:text-ink"
            title="تحديث القائمة"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Users Count summary */}
      <div className="flex items-center justify-between text-[12px] text-slateink px-1">
        <span>إجمالي المستخدمين المطابقين: <strong className="text-ink">{loading ? "…" : filteredUsers.length}</strong></span>
        <span>بيانات حية مباشرة من قاعدة البيانات</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-bone bg-white shadow-xs">
        <table className="w-full border-collapse text-start text-[13px]">
          <thead>
            <tr className="border-b border-bone bg-mist/50 text-start text-[11px] font-bold text-ash">
              <th className="px-4 py-3 text-start">المستخدم</th>
              <th className="px-4 py-3 text-start">الاتصال</th>
              <th className="px-4 py-3 text-start">الصلاحية</th>
              <th className="px-4 py-3 text-start">الحالة</th>
              <th className="px-4 py-3 text-start">تاريخ التسجيل</th>
              <th className="px-4 py-3 text-end">الإجراءات والتحكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ash">
                  {loading ? "جارٍ تحميل قائمة المستخدمين…" : "لا يوجد مستخدمون — القائمة فارغة أو لا تطابق البحث."}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isEditing = editingUserId === u.id;
                const role = u.roles?.[0]?.name || "user";

                return (
                  <tr key={u.id} className="hover:bg-mist/50 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-interactive/10 text-interactive font-bold font-head text-[13px]">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-ink">{u.name}</div>
                          <div className="text-[11px] text-ash">ID #{u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-carbon" dir="ltr">
                          <Mail className="size-3 text-ash" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slateink" dir="ltr">
                            <Phone className="size-3 text-ash" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {isEditing ? (
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="rounded-lg border border-interactive/50 bg-white px-2 py-1 text-[11px] font-bold text-ink focus:outline-hidden"
                        >
                          <option value="user">راكب (User)</option>
                          <option value="moderator">مشرف (Moderator)</option>
                          <option value="admin">مدير نظام (Admin)</option>
                        </select>
                      ) : (
                        getRoleBadge(u.roles)
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {isEditing ? (
                        <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="rounded-lg border border-interactive/50 bg-white px-2 py-1 text-[11px] font-bold text-ink focus:outline-hidden"
                        >
                          <option value="active">نشط</option>
                          <option value="suspended">موقوف</option>
                          <option value="inactive">غير نشط</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            u.status === "active"
                              ? "bg-emerald/10 text-emerald border border-emerald/20"
                              : "bg-l2/10 text-l2 border border-l2/20"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              u.status === "active" ? "bg-emerald animate-pulse" : "bg-l2"
                            )}
                          />
                          {u.status === "active" ? "نشط" : u.status === "suspended" ? "موقوف" : "غير نشط"}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-[11.5px] text-slateink">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("ar-EG") : "—"}
                    </td>

                    <td className="px-4 py-3.5 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(u.id)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald/90"
                            >
                              <Check className="size-3" />
                              حفظ
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="rounded-lg border border-bone px-2 py-1 text-[11px] text-slateink hover:bg-mist"
                            >
                              إلغاء
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setSelectedRole(role);
                                setSelectedStatus(u.status || "active");
                              }}
                              className="flex size-8 items-center justify-center rounded-lg border border-bone bg-white text-slateink hover:bg-mist hover:text-ink"
                              title="تعديل الصلاحية والحالة"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u.id, u.name)}
                              className="flex size-8 items-center justify-center rounded-lg border border-l2/20 bg-l2/10 text-l2 hover:bg-l2/20"
                              title="حذف المستخدم"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
