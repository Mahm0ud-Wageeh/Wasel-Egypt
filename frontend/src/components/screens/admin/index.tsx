"use client";

/**
 * Screen: admin — Operations Command Center (light edition).
 * Dedicated admin-only shell: white sticky NOC bar, light tab strip, light
 * console body. No user chrome (header/footer/tab-bar are already hidden for
 * the admin route in WaselApp) and no "back to app" — admins never enter the
 * rider experience. Every number shown here comes from the backend
 * (/admin/analytics/system-health); nothing is hardcoded.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PillButton } from "@/components/kit";
import type { ScreenProps } from "@/lib/navigation";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  Users,
  MapPin,
  Banknote,
  Siren,
  Database,
  LogOut,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { KpiRow, ModerationQueue, NetworkHealthMap, OpsTable, GtfsGovernance } from "./sections";
import { UsersManager } from "./users-manager";
import { StopsManager } from "./stops-manager";
import { FaresManager } from "./fares-manager";
import { EmergencyAlerts } from "./emergency-alerts";
import { clearSystemCache, fetchSystemHealth } from "@/api/admin";

type AdminTab = "operations" | "users" | "stops" | "fares" | "emergency" | "governance";

/* ------------------------------ light brand ----------------------------- */

function AdminLogo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#202020" />
        <path
          d="M8 21c4 0 4-10 8-10s4 10 8 10"
          stroke="#8b7bff"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="8" cy="21" r="2.4" fill="#0091ff" />
        <circle cx="24" cy="21" r="2.4" fill="#ffffff" />
      </svg>
      <span className="leading-none">
        <span className="block font-head text-[18px] font-black text-ink">
          واصل <span className="text-interactive">مصر</span>
        </span>
        <span className="mono-tag mt-1 block !text-[9px] !text-ash">ADMIN COMMAND CENTER</span>
      </span>
    </span>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const TABS: Array<{ id: AdminTab; label: string; icon: typeof Activity; danger?: boolean }> = [
  { id: "operations", label: "العمليات والتحليلات", icon: Activity },
  { id: "users", label: "المستخدمون والصلاحيات", icon: Users },
  { id: "stops", label: "المحطات والشبكة", icon: MapPin },
  { id: "fares", label: "التذاكر والأجور", icon: Banknote },
  { id: "emergency", label: "الطوارئ والبلاغات", icon: Siren, danger: true },
  { id: "governance", label: "GTFS والحوكمة", icon: Database },
];

function SectionHead({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="mono-tag !text-ash">{kicker}</span>
        <h1 className="mt-1.5 font-head text-[22px] font-black text-ink md:text-[26px]">{title}</h1>
      </div>
      <p className="hidden max-w-sm text-[12px] leading-6 text-slateink md:block">{desc}</p>
    </div>
  );
}

export default function AdminScreen({ navigate }: ScreenProps) {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("operations");
  const [now, setNow] = useState<Date | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<number | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, []);

  // Real system pulse for the top bar — hidden entirely if unreachable.
  useEffect(() => {
    let cancelled = false;
    fetchSystemHealth()
      .then((h: any) => {
        if (cancelled) return;
        const d = h?.data ?? h;
        setActiveAlerts(typeof d?.alerts_active === "number" ? d.alerts_active : null);
        setHealthOk(true);
      })
      .catch(() => {
        if (!cancelled) setHealthOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clock = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "--:--:--";

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await clearSystemCache();
      toast({
        title: "تم تفريغ ذاكرة التخزين المؤقت",
        description: "تمت مزامنة الجداول وقواعد البيانات مع الخادم بنجاح.",
      });
    } catch {
      toast({
        title: "تعذر تفريغ الكاش",
        description: "الخادم غير متاح حالياً — تحقق من الاتصال وحاول مجدداً.",
        variant: "destructive",
      });
    } finally {
      setClearingCache(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      navigate("auth");
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#eef1f7]">
      {/* ========================== sticky light top bar ========================== */}
      <header className="sticky top-0 z-40 border-b border-bone bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-4 md:px-6">
          <AdminLogo />

          <span className="mono-tag hidden !text-ash lg:block">NETWORK OPERATIONS CENTER</span>

          <div className="ms-auto flex items-center gap-2.5 md:gap-3">
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearingCache}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-bone bg-white px-3 py-1.5 text-[11px] font-bold text-carbon hover:bg-mist transition"
              title="تفريغ الكاش وإعادة المزامنة"
            >
              <RefreshCw className={cn("size-3.5", clearingCache && "animate-spin")} />
              <span>تفريغ الكاش</span>
            </button>

            {/* Live backend pulse — rendered only when the health API answers */}
            {healthOk ? (
              activeAlerts != null && activeAlerts > 0 ? (
                <span className="hidden items-center gap-1.5 rounded-full border border-brt/40 bg-brt/10 px-2.5 py-1 text-[11px] font-bold text-brt sm:inline-flex">
                  <TriangleAlert className="size-3.5" />
                  <span className="num">{activeAlerts}</span> تنبيه نشط
                </span>
              ) : (
                <span className="hidden items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[11px] font-bold text-emerald sm:inline-flex">
                  <span className="size-1.5 rounded-full bg-emerald animate-pulse" />
                  الشبكة مستقرة
                </span>
              )
            ) : null}

            <span className="hidden flex-col items-end leading-tight sm:flex">
              <span className="num text-[14px] font-bold text-ink">{clock}</span>
              <span className="mono-tag !text-[8.5px] !text-ash">CAIRO · UTC+2</span>
            </span>

            {user ? (
              <span className="hidden max-w-[140px] truncate text-[11.5px] font-bold text-slateink md:block" title={user.email}>
                {user.name}
              </span>
            ) : null}

            <PillButton
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="border border-bone text-carbon hover:bg-mist"
            >
              <LogOut />
              {loggingOut ? "جارٍ الخروج…" : "تسجيل الخروج"}
            </PillButton>
          </div>
        </div>

        {/* ========================== light tab strip ========================== */}
        <div className="mx-auto flex w-full max-w-[1440px] overflow-x-auto px-4 md:px-6 border-t border-bone/70 no-scrollbar">
          <div className="flex items-center gap-1 py-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-bold transition",
                    active
                      ? t.danger
                        ? "bg-l2 text-white shadow-xs"
                        : "bg-ink text-white shadow-xs"
                      : "text-slateink hover:bg-mist hover:text-ink"
                  )}
                  aria-pressed={active}
                >
                  <Icon className="size-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ============================== console body ============================== */}
      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6 md:py-8">
        {activeTab === "operations" && (
          <div className="space-y-6">
            <SectionHead
              kicker="RESTRICTED · OPERATIONS & TELEMETRY"
              title="مركز العمليات اللحظية — مراقبة الشبكة"
              desc="مراقبة حية للمركبات والخطوط من تيليمتري الخادم، مع مؤشرات حقيقية من قاعدة البيانات."
            />
            <KpiRow />
            <OpsTable />
            <div className="grid gap-6 xl:grid-cols-2">
              <NetworkHealthMap />
              <ModerationQueue />
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <SectionHead
              kicker="SECURITY & ACCESS CONTROL"
              title="إدارة المستخدمين والصلاحيات"
              desc="التحكم الكامل بحسابات المستخدمين من قاعدة البيانات: الصلاحيات والحظر والتفعيل."
            />
            <UsersManager />
          </div>
        )}

        {activeTab === "stops" && (
          <div className="space-y-4">
            <SectionHead
              kicker="GIS & TRANSIT INFRASTRUCTURE"
              title="إدارة محطات وشبكة النقل"
              desc="إضافة محطات جديدة وتعديل الإحداثيات الجغرافية WGS84 مباشرة على بيانات التشغيل."
            />
            <StopsManager />
          </div>
        )}

        {activeTab === "fares" && (
          <div className="space-y-4">
            <SectionHead
              kicker="TARIFF & PRICING MATRIX"
              title="إدارة تسعيرة التذاكر والشرائح"
              desc="أسعار التذاكر من قاعدة البيانات فقط — لا توجد أسعار افتراضية معروضة."
            />
            <FaresManager />
          </div>
        )}

        {activeTab === "emergency" && (
          <div className="space-y-4">
            <SectionHead
              kicker="EMERGENCY BROADCAST & COMMUNITY"
              title="مركز بث الطوارئ ومراجعة البلاغات"
              desc="بث إشعارات فورية لجميع الركاب في حالات الأعطال، ومراجعة بلاغات المجتمع الحقيقية."
            />
            <EmergencyAlerts />
          </div>
        )}

        {activeTab === "governance" && (
          <div className="space-y-6">
            <SectionHead
              kicker="GTFS DATA INTEGRITY & AUDIT"
              title="حوكمة البيانات والتحقق من الجداول"
              desc="سجلات الاستيراد الحقيقية وجودة البيانات من الخادم — بدون نسب مزيفة."
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <GtfsGovernance />
              <NetworkHealthMap />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bone pt-5 pb-2">
          <span className="mono-tag !text-ash">WASEL EGYPT · ADMIN CONSOLE</span>
          <span className="mono-tag !text-ash">LIVE DATABASE · AFRICA/CAIRO</span>
        </div>
      </main>
    </div>
  );
}
