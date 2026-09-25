"use client";

/**
 * SCREEN: notifications — مركز التنبيهات
 * Grouped commuter inbox: line alerts, journey updates, offers, system.
 */

import { useEffect, useMemo, useState } from "react";
import {
  TrainFront,
  Route,
  Sparkles,
  ShieldCheck,
  CheckCheck,
  Trash2,
  Inbox,
  BellRing,
  LineChart,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PillButton, LineBadge, SectionHead, ScreenShell } from "@/components/kit";
import type { NavigateFn, ScreenKey } from "@/lib/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/api/notifications";
import {
  GROUP_ORDER,
  groupLabelAr,
  type Notif,
  type NotifKind,
} from "./data";

type TabKey = "all" | NotifKind;

/* -------------------------------- tone tile -------------------------------- */

function KindTile({ kind }: { kind: NotifKind }) {
  const map: Record<NotifKind, { icon: typeof TrainFront; cls: string }> = {
    line: { icon: TrainFront, cls: "bg-l2/10 text-l2 border-l2/20" },
    journey: { icon: Route, cls: "bg-interactive/10 text-interactive border-interactive/20" },
    offer: { icon: Sparkles, cls: "bg-brand/10 text-brand border-brand/20" },
    system: { icon: ShieldCheck, cls: "bg-mist text-ash border-bone" },
  };
  const { icon: Icon, cls } = map[kind];
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl border", cls)}>
      <Icon className="size-[19px]" aria-hidden="true" />
    </span>
  );
}

/* --------------------------------- time ----------------------------------- */

function TimeAgo({ minutes }: { minutes: number }) {
  if (minutes < 60) return <>منذ <span className="num font-bold">{minutes}</span> د</>;
  const h = Math.floor(minutes / 60);
  if (h < 24) return <>منذ <span className="num font-bold">{h}</span> س</>;
  const d = Math.floor(h / 24);
  return <>منذ <span className="num font-bold">{d}</span> يوم</>;
}

/* --------------------------------- row ------------------------------------- */

interface NotifRowProps {
  n: Notif;
  onOpen: (n: Notif) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotifRow({ n, onOpen, onMarkRead, onDelete }: NotifRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={n.titleAr}
      onClick={() => onOpen(n)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(n);
        }
      }}
      className={cn(
        "settle-fast group relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 outline-none focus-visible:ring-2 focus-visible:ring-interactive/40 md:p-4.5",
        n.unread
          ? "border-interactive/20 bg-interactive/[0.035] hover:border-interactive/40"
          : "border-bone bg-white hover:border-cloud hover:bg-mist/50"
      )}
    >
      <KindTile kind={n.kind} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3
            className={cn(
              "text-[13.5px] leading-6",
              n.unread ? "font-extrabold text-ink" : "font-bold text-carbon"
            )}
          >
            {n.titleAr}
          </h3>
          {n.lineCode && n.lineColor ? (
            <LineBadge code={n.lineCode} color={n.lineColor} size="sm" />
          ) : null}
        </div>
        <p className="mt-1 text-[12.5px] leading-6 text-slateink">{n.bodyAr}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="flex items-center gap-2 whitespace-nowrap text-[11px] font-medium text-ash">
          <TimeAgo minutes={n.minutesAgo} />
          <span
            className={cn("size-2 rounded-full", n.unread ? "bg-interactive" : "bg-transparent")}
            aria-label={n.unread ? "غير مقروء" : undefined}
          />
        </span>

        {/* hover actions (desktop) */}
        <span className="hidden items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 md:flex">
          {!n.unread ? null : (
            <button
              type="button"
              aria-label="تعليم كمقروء"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(n.id);
              }}
              className="settle-fast flex size-8 cursor-pointer items-center justify-center rounded-full border border-bone bg-white text-carbon hover:border-interactive/40 hover:text-interactive outline-none focus-visible:ring-2 focus-visible:ring-interactive/40"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label="حذف الإشعار"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(n.id);
            }}
            className="settle-fast flex size-8 cursor-pointer items-center justify-center rounded-full border border-bone bg-white text-carbon hover:border-l2/40 hover:text-l2 outline-none focus-visible:ring-2 focus-visible:ring-l2/40"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ empty state -------------------------------- */

function EmptyState({
  ctaLabelAr,
  onCta,
}: {
  ctaLabelAr: string;
  onCta: () => void;
}) {
  return (
    <div className="card-flat flex flex-col items-center gap-3 rounded-3xl px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-bone bg-mist">
        <Inbox className="size-5 text-ash" aria-hidden="true" />
      </span>
      <p className="text-[14px] font-bold text-ink">لا توجد إشعارات جديدة حالياً</p>
      <p className="max-w-xs text-[12.5px] leading-6 text-slateink">
        سننبّهك هنا عند أي تغيّر يخص خطوطك ورحلاتك — لا شيء يستدعي انتباهك الآن.
      </p>
      <PillButton variant="outline" size="sm" onClick={onCta}>
        {ctaLabelAr}
      </PillButton>
    </div>
  );
}

/* --------------------------------- screen ---------------------------------- */

const EMPTY_CTA: Partial<Record<NotifKind | "all", { labelAr: string; target: ScreenKey }>> = {
  all: { labelAr: "استكشف الخطوط", target: "metro" },
  line: { labelAr: "استعرض حالة الخطوط", target: "metro" },
  journey: { labelAr: "خطط رحلة جديدة", target: "planner" },
  system: { labelAr: "تصفح الأجور والاشتراكات", target: "fares" },
};

export default function NotificationsScreen({ navigate }: { navigate: NavigateFn }) {
  const { isLoggedIn } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    if (isLoggedIn) {
      fetchNotifications()
        .then((items) => {
          if (!active) return;
          if (Array.isArray(items)) {
            const mapped: Notif[] = items.map((item) => ({
              id: String(item.id),
              kind: (item.type === "alert" || item.category === "line") ? "line" : (item.category === "journey" ? "journey" : "system"),
              titleAr: item.title_ar || item.title || "تنبيه من واصل",
              bodyAr: item.body_ar || item.body || item.message || "",
              minutesAgo: item.created_at ? Math.max(1, Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000)) : 1,
              unread: !item.is_read && !item.read_at,
            }));
            setNotifs(mapped);
          } else {
            setNotifs([]);
          }
        })
        .catch(() => {
          if (active) setNotifs([]);
        });
    } else {
      setNotifs([]);
    }
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const unreadCount = notifs.filter((n) => n.unread).length;

  const visible = useMemo(
    () =>
      notifs
        .filter((n) => tab === "all" || n.kind === tab)
        .sort((a, b) => a.minutesAgo - b.minutesAgo),
    [notifs, tab]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Notif[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const n of visible) map.get(groupLabelAr(n.minutesAgo))!.push(n);
    return GROUP_ORDER.map((g) => ({ label: g, items: map.get(g)! })).filter(
      (g) => g.items.length > 0
    );
  }, [visible]);

  const markRead = (id: string) => {
    setNotifs((list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    if (isLoggedIn) markNotificationRead(id).catch(() => {});
  };

  const onOpen = (n: Notif) => {
    markRead(n.id);
    if (n.navigateTo) navigate(n.navigateTo);
  };

  const onDelete = (id: string) => {
    setNotifs((list) => list.filter((n) => n.id !== id));
    if (isLoggedIn) deleteNotification(id).catch(() => {});
  };

  const markAll = () => {
    if (unreadCount === 0) return;
    setNotifs((list) => list.map((n) => ({ ...n, unread: false })));
    if (isLoggedIn) markAllNotificationsRead().catch(() => {});
    toast({
      title: "تم تعليم كل الإشعارات كمقروءة",
      description: "صندوقك خالٍ من غير المقروء — أهلاً بيوم جديد.",
    });
  };

  return (
    <ScreenShell className="pb-24 md:pb-8">
      {/* ------------------------------- header ------------------------------- */}
      <section className="pt-8 md:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <SectionHead
            tag="INBOX — ALERTS & UPDATES"
            title="مركز التنبيهات"
            desc="تنبيهات خطوطك، تحديثات رحلاتك، ورسائل النظام — كل ما يهم رحلتك في مكان واحد."
          />
          <div className="mb-1 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-interactive/25 bg-interactive/10 px-3.5 py-1.5 text-[12px] font-bold text-interactive">
              <BellRing className="size-3.5" aria-hidden="true" />
              <span className="num">{unreadCount}</span>
              غير مقروءة
            </span>
            <PillButton variant="ghost" size="sm" disabled={unreadCount === 0} onClick={markAll}>
              <CheckCheck aria-hidden="true" />
              تعليم الكل كمقروء
            </PillButton>
          </div>
        </div>
      </section>

      {/* -------------------------------- tabs --------------------------------- */}
      <section className="mt-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} dir="rtl">
          <TabsList className="h-11 w-full justify-start gap-1 overflow-x-auto rounded-full border border-bone bg-mist p-1 sm:w-auto">
            <TabsTrigger
              value="all"
              className="h-9 cursor-pointer rounded-full px-4 text-[12.5px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-none"
            >
              الكل
            </TabsTrigger>
            <TabsTrigger
              value="line"
              className="h-9 cursor-pointer rounded-full px-4 text-[12.5px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-none"
            >
              تنبيهات الخطوط
            </TabsTrigger>
            <TabsTrigger
              value="journey"
              className="h-9 cursor-pointer rounded-full px-4 text-[12.5px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-none"
            >
              تحديثات الرحلات
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="h-9 cursor-pointer rounded-full px-4 text-[12.5px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-none"
            >
              النظام
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-6 outline-none">
            {visible.length === 0 ? (
              <EmptyState
                ctaLabelAr={EMPTY_CTA[tab]?.labelAr ?? "استكشف الخطوط"}
                onCta={() => {
                  const target = EMPTY_CTA[tab]?.target ?? "metro";
                  navigate(target);
                }}
              />
            ) : (
              <div className="space-y-8">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[12px] font-black text-slateink">
                        {g.label === "اليوم" ? (
                          <LineChart className="size-3.5 text-interactive" aria-hidden="true" />
                        ) : null}
                        {g.label}
                      </span>
                      <span className="h-px flex-1 bg-bone" aria-hidden="true" />
                      <span className="num text-[11px] font-medium text-ash">{g.items.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {g.items.map((n) => (
                        <NotifRow
                          key={n.id}
                          n={n}
                          onOpen={onOpen}
                          onMarkRead={markRead}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </ScreenShell>
  );
}
