"use client";

import { cn } from "@/lib/utils";
import { Home, Route, Map as MapIcon, Bookmark, UserRound } from "lucide-react";
import type { NavigateFn, ScreenKey } from "@/lib/navigation";

const TABS: { key: ScreenKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "planner", label: "التخطيط", icon: Route },
  { key: "map", label: "الخريطة", icon: MapIcon },
  { key: "history", label: "رحلاتي", icon: Bookmark },
  { key: "profile", label: "حسابي", icon: UserRound },
];

export function MobileTabBar({
  current,
  navigate,
  hidden = false,
}: {
  current: ScreenKey;
  navigate: NavigateFn;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-50 border-t border-bone md:hidden"
      aria-label="التنقل السفلي"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => navigate(key)}
              className="relative flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 outline-none"
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "settle-fast flex h-7 w-12 items-center justify-center rounded-full",
                  active ? "bg-ink text-white" : "text-slateink"
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
              </span>
              <span
                className={cn(
                  "text-[10px] leading-none",
                  active ? "font-black text-ink" : "font-semibold text-ash"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
