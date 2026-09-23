"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bell, ChevronDown, Menu, X, ShieldAlert } from "lucide-react";
import { WaselLogo, PillButton } from "@/components/kit";
import type { NavigateFn, ScreenKey } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  key: ScreenKey;
  children?: { label: string; key: ScreenKey }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "الرئيسية", key: "home" },
  { label: "تخطيط الرحلة", key: "planner" },
  {
    label: "الشبكات",
    key: "metro",
    children: [
      { label: "مترو الأنفاق", key: "metro" },
      { label: "القطار الكهربائي الخفيف", key: "lrt" },
      { label: "المونوريل", key: "monorail" },
      { label: "حافلات BRT", key: "brt" },
      { label: "السكك الحديدية", key: "train" },
    ],
  },
  { label: "الخريطة", key: "map" },
  { label: "الأجور", key: "fares" },
  { label: "المجتمع", key: "community" },
];

export function TopHeader({
  current,
  navigate,
  hidden = false,
}: {
  current: ScreenKey;
  navigate: NavigateFn;
  hidden?: boolean;
}) {
  const { user, isLoggedIn, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (hidden) return null;

  const go = (key: ScreenKey) => {
    navigate(key);
    setMobileOpen(false);
    setOpenMenu(null);
  };

  const itemActive = (item: NavItem) =>
    item.key === current || item.children?.some((c) => c.key === current);

  return (
    <header className="glass sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <button
          onClick={() => go("home")}
          className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-interactive/50 rounded-xl"
          aria-label="واصل مصر — الرئيسية"
        >
          <WaselLogo />
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  onClick={() => go(item.key)}
                  className={cn(
                    "settle-fast inline-flex h-9 cursor-pointer items-center gap-1 rounded-full px-3.5 text-[13.5px] font-bold outline-none",
                    itemActive(item)
                      ? "bg-ink/[0.06] text-ink"
                      : "text-carbon hover:bg-ink/[0.04]"
                  )}
                  aria-expanded={openMenu === item.label}
                >
                  {item.label}
                  <ChevronDown className="size-3.5 text-ash" />
                </button>
                {openMenu === item.label ? (
                  <div className="rise-in absolute start-0 top-full w-56 pt-2">
                    <div className="card-flat overflow-hidden bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(9,12,29,0.18)]">
                      {item.children.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => go(c.key)}
                          className={cn(
                            "settle-fast block w-full cursor-pointer rounded-xl px-3.5 py-2.5 text-start text-[13px] font-semibold",
                            current === c.key
                              ? "bg-mist text-ink"
                              : "text-carbon hover:bg-mist"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={cn(
                  "settle-fast inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 text-[13.5px] font-bold outline-none",
                  current === item.key
                    ? "bg-ink/[0.06] text-ink"
                    : "text-carbon hover:bg-ink/[0.04]"
                )}
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => go("notifications")}
            className="settle-fast relative flex size-10 cursor-pointer items-center justify-center rounded-full text-carbon outline-none hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-interactive/50"
            aria-label="الإشعارات"
          >
            <Bell className="size-[18px]" strokeWidth={2.2} />
            <span className="absolute end-2 top-2 size-2 rounded-full bg-l2 ring-2 ring-white" />
          </button>
          {isAdmin ? (
            <button
              onClick={() => go("admin")}
              className="settle-fast hidden items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-3 py-1 text-[11.5px] font-bold text-emerald hover:bg-emerald/20 sm:inline-flex"
            >
              <ShieldAlert className="size-3.5" />
              غرفة العمليات NOC
            </button>
          ) : null}

          {isLoggedIn ? (
            <button
              onClick={() => go("profile")}
              className="settle-fast hidden size-10 cursor-pointer items-center justify-center rounded-full bg-mist font-head text-[13px] font-black text-carbon outline-none ring-1 ring-bone hover:bg-mercury focus-visible:ring-2 focus-visible:ring-interactive/50 sm:flex"
              aria-label="الملف الشخصي"
            >
              {user?.name?.slice(0, 1) || "م"}
            </button>
          ) : (
            <button
              onClick={() => go("auth")}
              className="settle-fast hidden cursor-pointer items-center gap-1.5 rounded-full border border-bone bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-carbon hover:bg-mist sm:inline-flex"
            >
              دخول
            </button>
          )}

          <PillButton
            size="md"
            className="hidden md:inline-flex"
            onClick={() => go("planner")}
          >
            ابدأ رحلتك
          </PillButton>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="settle-fast flex size-10 cursor-pointer items-center justify-center rounded-full text-carbon outline-none hover:bg-ink/[0.05] lg:hidden"
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen ? (
        <div className="rise-in border-t border-bone bg-white lg:hidden">
          <nav className="mx-auto grid w-full max-w-[1200px] gap-1 px-4 py-4" aria-label="قائمة الجوال">
            {NAV_ITEMS.map((item) => (
              <div key={item.label}>
                <button
                  onClick={() => go(item.key)}
                  className={cn(
                    "settle-fast w-full rounded-xl px-4 py-3 text-start font-head text-[15px] font-bold",
                    itemActive(item) ? "bg-mist text-ink" : "text-carbon hover:bg-mist"
                  )}
                >
                  {item.label}
                </button>
                {item.children ? (
                  <div className="ms-4 grid gap-0.5 border-s border-bone py-1 ps-3">
                    {item.children.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => go(c.key)}
                        className="settle-fast rounded-lg px-3 py-2 text-start text-[13px] font-semibold text-slateink hover:bg-mist hover:text-ink"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="mt-2 flex gap-2 border-t border-bone pt-3">
              <PillButton variant="mist" size="md" className="flex-1" onClick={() => go("profile")}>
                حسابي
              </PillButton>
              <PillButton size="md" className="flex-1" onClick={() => go("planner")}>
                ابدأ رحلتك
              </PillButton>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
