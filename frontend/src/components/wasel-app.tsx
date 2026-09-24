"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ComponentType } from "react";
import { TopHeader } from "@/components/layout/top-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SlimFooter } from "@/components/layout/slim-footer";
import FloatingHub from "@/components/floating-hub";
import {
  isScreenKey,
  type NavigateFn,
  type ScreenKey,
  type ScreenParams,
  type ScreenProps,
} from "@/lib/navigation";

// Direct screen imports for instantaneous zero-delay SPA navigation
import WelcomeScreen from "@/components/screens/welcome";
import HomeScreen from "@/components/screens/home";
import PlannerScreen from "@/components/screens/planner";
import JourneyActiveScreen from "@/components/screens/journey-active";
import JourneyCompletedScreen from "@/components/screens/journey-completed";
import HistoryScreen from "@/components/screens/history";
import MapScreen from "@/components/screens/map";
import MetroScreen from "@/components/screens/metro";
import LrtScreen from "@/components/screens/lrt";
import MonorailScreen from "@/components/screens/monorail";
import BrtScreen from "@/components/screens/brt";
import TrainScreen from "@/components/screens/train";
import FaresScreen from "@/components/screens/fares";
import CommunityScreen from "@/components/screens/community";
import NotificationsScreen from "@/components/screens/notifications";
import AuthScreen from "@/components/screens/auth";
import ProfileScreen from "@/components/screens/profile";
import AdminScreen from "@/components/screens/admin";

/* --------------------------- Screen registry --------------------------- */

const SCREEN_COMPONENTS: Record<ScreenKey, ComponentType<ScreenProps>> = {
  welcome: WelcomeScreen,
  home: HomeScreen,
  planner: PlannerScreen,
  "journey-active": JourneyActiveScreen,
  "journey-completed": JourneyCompletedScreen,
  history: HistoryScreen,
  map: MapScreen,
  metro: MetroScreen,
  lrt: LrtScreen,
  monorail: MonorailScreen,
  brt: BrtScreen,
  train: TrainScreen,
  fares: FaresScreen,
  community: CommunityScreen,
  notifications: NotificationsScreen,
  auth: AuthScreen,
  profile: ProfileScreen,
  admin: AdminScreen,
};

function parseLocation(loc: string): { key: ScreenKey; params: ScreenParams } {
  const clean = loc.replace(/^#\/?/, "").replace(/^\//, "");
  const [rawPath, qs] = clean.split("?");
  const path = (rawPath || "").replace(/\/$/, "");

  let key: ScreenKey = "home";
  if (path && isScreenKey(path)) {
    key = path as ScreenKey;
  } else if (path === "" || path === "home") {
    key = "home";
  } else if (path === "welcome" || path === "landing") {
    key = "welcome";
  } else if (path === "journey/active" || path === "active-journey") {
    key = "journey-active";
  } else if (path === "journey/completed" || path === "completed-journey") {
    key = "journey-completed";
  } else if (path === "search") {
    key = "planner";
  }

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
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window === "undefined") return "/";
    const hash = window.location.hash;
    if (hash && hash !== "#" && hash !== "#/") {
      return hash.replace(/^#\/?/, "/") + (window.location.search || "");
    }
    return (window.location.pathname || "/") + (window.location.search || "");
  });

  useEffect(() => {
    // Automatically sanitize any legacy hash '#' from the URL bar to a clean HTML5 path:
    if (typeof window !== "undefined" && window.location.hash && window.location.hash !== "#" && window.location.hash !== "#/") {
      const cleanPath = window.location.hash.replace(/^#\/?/, "/") || "/";
      const fullUrl = cleanPath + (window.location.search || "");
      window.history.replaceState(null, "", fullUrl);
      setCurrentRoute(fullUrl);
    }

    const handlePopState = () => {
      const rawPath =
        window.location.hash && window.location.hash !== "#" && window.location.hash !== "#/"
          ? window.location.hash.replace(/^#\/?/, "/")
          : window.location.pathname || "/";
      const nextLoc = rawPath + (window.location.search || "");
      setCurrentRoute(nextLoc);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  const { key, params } = useMemo(() => parseLocation(currentRoute), [currentRoute]);

  const navigate = useCallback<NavigateFn>((next, nextParams) => {
    const qs = nextParams ? new URLSearchParams(nextParams).toString() : "";
    const targetPath = next === "home" ? `/${qs ? `?${qs}` : ""}` : `/${next}${qs ? `?${qs}` : ""}`;
    window.history.pushState(null, "", targetPath);
    setCurrentRoute(targetPath);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const Current = SCREEN_COMPONENTS[key] || HomeScreen;

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
      {!HIDE_TAB_BAR.includes(key) ? <div className="h-16 md:hidden" aria-hidden="true" /> : null}
    </div>
  );
}
