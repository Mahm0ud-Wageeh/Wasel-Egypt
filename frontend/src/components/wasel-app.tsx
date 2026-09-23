"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { TopHeader } from "@/components/layout/top-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SlimFooter } from "@/components/layout/slim-footer";
import { WaselLogoMark } from "@/components/kit";
import {
  isScreenKey,
  type NavigateFn,
  type ScreenKey,
  type ScreenParams,
  type ScreenProps,
} from "@/lib/navigation";

/* --------------------------------- Loader --------------------------------- */

function ScreenLoader() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4">
      <div className="gps-pulse rounded-2xl">
        <WaselLogoMark className="size-14" />
      </div>
      <span className="mono-tag">LOADING NETWORK…</span>
    </div>
  );
}

/* --------------------------- Dynamic screen map --------------------------- */

function makeScreen(loader: () => Promise<{ default: ComponentType<ScreenProps> }>) {
  return dynamic(loader, { loading: () => <ScreenLoader /> });
}

const SCREEN_COMPONENTS: Record<ScreenKey, ComponentType<ScreenProps>> = {
  welcome: makeScreen(() => import("@/components/screens/welcome")),
  home: makeScreen(() => import("@/components/screens/home")),
  planner: makeScreen(() => import("@/components/screens/planner")),
  "journey-active": makeScreen(() => import("@/components/screens/journey-active")),
  "journey-completed": makeScreen(() => import("@/components/screens/journey-completed")),
  history: makeScreen(() => import("@/components/screens/history")),
  map: makeScreen(() => import("@/components/screens/map")),
  metro: makeScreen(() => import("@/components/screens/metro")),
  lrt: makeScreen(() => import("@/components/screens/lrt")),
  monorail: makeScreen(() => import("@/components/screens/monorail")),
  brt: makeScreen(() => import("@/components/screens/brt")),
  train: makeScreen(() => import("@/components/screens/train")),
  fares: makeScreen(() => import("@/components/screens/fares")),
  community: makeScreen(() => import("@/components/screens/community")),
  notifications: makeScreen(() => import("@/components/screens/notifications")),
  auth: makeScreen(() => import("@/components/screens/auth")),
  profile: makeScreen(() => import("@/components/screens/profile")),
  admin: makeScreen(() => import("@/components/screens/admin")),
};

const FloatingHub = dynamic(() => import("@/components/floating-hub"), { ssr: false });

/* ------------------------------ Hash routing ------------------------------ */

function subscribe(onStoreChange: () => void) {
  const handler = () => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    onStoreChange();
  };
  window.addEventListener("hashchange", handler);
  return () => window.removeEventListener("hashchange", handler);
}

function getHashSnapshot(): string {
  return window.location.hash;
}

function getHashServerSnapshot(): string {
  return "#/welcome";
}

function parseHash(hash: string): { key: ScreenKey; params: ScreenParams } {
  const raw = hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const key = path && isScreenKey(path) ? path : "welcome";
  const params: ScreenParams = {};
  if (qs) {
    for (const [k, v] of new URLSearchParams(qs).entries()) {
      params[k] = v;
    }
  }
  return { key, params };
}

/* --------------------------------- Shell ---------------------------------- */

const HIDE_TAB_BAR: ScreenKey[] = ["welcome", "auth", "admin"];
const HIDE_HEADER: ScreenKey[] = ["auth", "welcome", "admin"];
const HIDE_FOOTER: ScreenKey[] = ["welcome", "auth", "admin", "map"];

export default function WaselApp() {
  const hash = useSyncExternalStore(subscribe, getHashSnapshot, getHashServerSnapshot);
  const { key, params } = useMemo(() => parseHash(hash), [hash]);

  const navigate = useCallback<NavigateFn>((next, nextParams) => {
    const qs = nextParams ? new URLSearchParams(nextParams).toString() : "";
    window.location.hash = `/${next}${qs ? `?${qs}` : ""}`;
  }, []);

  const Current = SCREEN_COMPONENTS[key];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {HIDE_HEADER.includes(key) ? null : (
        <TopHeader current={key} navigate={navigate} />
      )}
      <main key={key} className="rise-in flex-1">
        <Current navigate={navigate} params={params} />
      </main>
      {HIDE_FOOTER.includes(key) ? null : <SlimFooter navigate={navigate} />}
      {key === "auth" || key === "welcome" ? null : (
        <FloatingHub navigate={navigate} current={key} />
      )}
      {HIDE_TAB_BAR.includes(key) ? null : (
        <MobileTabBar current={key} navigate={navigate} />
      )}
      {/* bottom spacing guard for mobile tab bar */}
      {!HIDE_TAB_BAR.includes(key) ? <div className="h-16 md:hidden" aria-hidden="true" /> : null}
    </div>
  );
}
