"use client";

/**
 * Screen: profile (spec 18 — Passenger Profile & System Settings)
 * Light professional canvas: identity, wallet, places, stats,
 * preferences, subscription, danger zone.
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PillButton, LineBadge } from "@/components/kit";
import { ScreenShell } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import type { ScreenProps } from "@/lib/navigation";
import { LINES } from "@/lib/transit-data";
import { WalletCard } from "./wallet";
import { SavedPlaces } from "./places";
import { Preferences } from "./prefs";
import { useAuth } from "@/contexts/AuthContext";
import {
  BadgeCheck,
  CalendarClock,
  Mail,
  Pencil,
  Ticket,
  Trash2,
  TriangleAlert,
  UserRound,
  LogOut,
  ShieldAlert,
} from "lucide-react";

/* ------------------------------ section label ---------------------------- */

function SectionLabel({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="mb-3.5">
      <span className="mono-tag">{tag}</span>
      <h3 className="mt-1 font-head text-[17px] font-black text-ink">{title}</h3>
    </div>
  );
}

/* --------------------------------- screen -------------------------------- */

export default function ProfileScreen({ navigate }: ScreenProps) {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user?.name || "محمد أحمد");
  const [email, setEmail] = useState(user?.email || "mohamed.ahmed@example.com");

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

  const initials = (user?.name || name)
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join(" ");

  const saveProfile = () => {
    setEditOpen(false);
    toast({ title: "تم تحديث الملف الشخصي", description: "حُفظت بياناتك بنجاح على جهازك." });
  };

  return (
    <ScreenShell className="pb-24 pt-8 md:pb-8 md:pt-10">
      {/* header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-tag">PROFILE &amp; SETTINGS</span>
          <h1 className="mt-1.5 font-head text-[26px] font-black text-ink md:text-[30px]">
            الملف الشخصي والإعدادات
          </h1>
        </div>
        <PillButton variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil />
          تعديل الملف
        </PillButton>
      </div>

      <div className="space-y-7">
        {/* ========================= identity ========================= */}
        <section className="card-flat flex flex-wrap items-center gap-5 p-5 md:p-6">
          <span className="relative shrink-0 rounded-full ring-4 ring-emerald/15">
            <span className="num flex size-16 items-center justify-center rounded-full bg-ink font-head text-[22px] font-black text-white md:size-20 md:text-[26px]">
              {initials || "م"}
            </span>
            <span className="absolute -bottom-0.5 -end-0.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-emerald">
              <BadgeCheck className="size-3.5 text-white" />
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-head text-[19px] font-black text-ink">{name}</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/25 bg-emerald/10 px-2.5 py-1 text-[11px] font-bold text-emerald">
                <BadgeCheck className="size-3" />
                {isAdmin ? "مسؤول النظام (Admin)" : "راكب موثّق"}
              </span>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate("admin")}
                  className="inline-flex items-center gap-1 rounded-full border border-interactive/30 bg-interactive/10 px-2.5 py-1 text-[11px] font-bold text-interactive hover:bg-interactive/20"
                >
                  <ShieldAlert className="size-3" />
                  لوحة العمليات NOC
                </button>
              ) : null}
            </div>
            <div className="num mt-1.5 text-[13.5px] font-bold text-slateink" dir="ltr">
              {user?.phone || "+20 100 123 4567"}
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-slateink">
              <Mail className="size-3.5 text-ash" />
              <span className="num" dir="ltr">{email}</span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1.5 md:items-end">
            <span className="mono-tag">MEMBER SINCE</span>
            <span className="num text-[13px] font-bold text-carbon" dir="ltr">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase() : "2024"}
            </span>
            <span className="mono-tag !text-fog">{isAdmin ? "SUPERADMIN ROLE" : "TRUST 98 / 100"}</span>
          </div>
        </section>

        {/* ==================== wallet + subscription ==================== */}
        <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <WalletCard />

          {/* subscription */}
          <div className="card-mist flex flex-col p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl border border-bone bg-white text-ink">
                <Ticket className="size-4.5" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/25 bg-emerald/10 px-2.5 py-1 text-[11px] font-bold text-emerald">
                <CalendarClock className="size-3" />
                فعّالة
              </span>
            </div>
            <h3 className="mt-4 font-head text-[16px] font-black text-ink">بطاقة شهريّة مترو</h3>
            <p className="mt-1.5 text-[12.5px] leading-6 text-slateink">
              اشتراك غير محدود على خطوط المترو — فعّالة حتى{" "}
              <span className="font-bold text-ink">15 أكتوبر</span>
            </p>
            <div className="mt-3.5 flex items-center gap-1.5">
              {LINES.filter((l) => l.mode === "metro").map((l) => (
                <LineBadge key={l.id} code={l.code} color={l.color} size="sm" />
              ))}
            </div>
            <PillButton variant="dark" size="sm" className="mt-auto w-full" onClick={() => navigate("fares")}>
              تجديد الاشتراك
            </PillButton>
          </div>
        </section>

        {/* ======================= journey stats ======================== */}
        <section>
          <SectionLabel tag="JOURNEY IMPACT" title="رحلاتك على الشبكة" />
          <div className="card-mist grid grid-cols-2 gap-y-6 p-5 md:grid-cols-4 md:p-6">
            {[
              { v: "128", l: "رحلة مكتملة" },
              { v: "1,240", l: "كم مشوارة" },
              { v: "96", l: "كجم CO₂ موفّرة" },
              { v: "1,850", l: "ج.م توفير أجرة" },
            ].map((s, i) => (
              <div key={s.l} className={cn(i > 0 && "md:border-s md:border-bone md:ps-6")}>
                <div className="num text-[30px] font-extrabold leading-none text-onyx md:text-[36px]">{s.v}</div>
                <div className="mt-2 text-[12.5px] font-medium text-slateink">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================= saved places ======================== */}
        <section>
          <SectionLabel tag="FREQUENT PLACES" title="الأماكن اليومية المفضلة" />
          <SavedPlaces />
        </section>

        {/* ========================= preferences ========================= */}
        <section>
          <SectionLabel tag="APP PREFERENCES" title="تفضيلات التطبيق" />
          <Preferences />
        </section>

        {/* ========================= danger zone ========================= */}
        <section>
          <SectionLabel tag="ACCOUNT" title="إدارة الحساب" />
          <div className="card-flat border-l2/25 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <PillButton
                    variant="outline"
                    className="border-l2/40 text-l2 hover:border-l2 hover:bg-l2/10"
                  >
                    <LogOut />
                    تسجيل الخروج
                  </PillButton>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-sm rounded-3xl p-6">
                  <AlertDialogHeader className="text-start">
                    <AlertDialogTitle className="font-head text-[17px] font-black text-ink">
                      تسجيل الخروج من واصل مصر؟
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[13px] leading-6 text-slateink">
                      سينتهي حسابك الموثّق على هذا الجهاز — يمكنك العودة وتسجيل الدخول في أي وقت.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2.5">
                    <AlertDialogCancel className="h-10 rounded-full border-bone bg-white px-5 text-[13px] font-bold text-ink hover:bg-mist">
                      إلغاء
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await logout();
                        toast({
                          title: "تم تسجيل الخروج",
                          description: "أنت الآن تتصفح كزائر.",
                        });
                        navigate("home");
                      }}
                      className="h-10 rounded-full bg-l2 px-5 text-[13px] font-bold text-white hover:bg-l2/90"
                    >
                      تسجيل الخروج
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <button
                type="button"
                onClick={() => {
                  toast({
                    title: "تم استلام طلب حذف الحساب",
                    description: "سنرسل رمز تأكيد نهائي على رقم موبايلك قبل التنفيذ.",
                  });
                }}
                className="settle-fast inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-bold text-l2 hover:bg-l2/10"
              >
                <Trash2 className="size-4" />
                حذف الحساب
              </button>

              <p className="ms-auto hidden items-center gap-1.5 text-[11.5px] font-medium text-slateink sm:flex">
                <TriangleAlert className="size-3.5 text-brt" />
                حذف الحساب يمسح رصيد المحفظة وتاريخ الرحلات نهائيًا
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogTitle className="font-head text-[17px] font-black text-ink">تعديل الملف الشخصي</DialogTitle>
          <DialogDescription className="mt-1 text-[12.5px] leading-6 text-slateink">
            حدِّث بياناتك الأساسية — رقم الموبايل مرتبط بالتحقق ولا يمكن تغييره من هنا.
          </DialogDescription>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-carbon" htmlFor="pf-name">
                الاسم الكامل
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ash" />
                <input
                  id="pf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-bone bg-white ps-11 pe-4 text-[14px] font-medium text-ink outline-none settle-fast focus:border-interactive/60"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold text-carbon" htmlFor="pf-email">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ash" />
                <input
                  id="pf-email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="num h-12 w-full rounded-2xl border border-bone bg-white ps-11 pe-4 text-start text-[14px] font-medium text-ink outline-none settle-fast focus:border-interactive/60"
                />
              </div>
            </div>
          </div>
          <PillButton variant="dark" className="mt-6 w-full" onClick={saveProfile}>
            حفظ التغييرات
          </PillButton>
        </DialogContent>
      </Dialog>
    </ScreenShell>
  );
}
