/**
 * Wasel Egypt — SPA navigation contract.
 * The whole product renders on the single `/` route as a
 * client-side screen switcher synchronized with the URL hash
 * (e.g. `#/planner?from=...`).
 */

export type ScreenKey =
  | "welcome"
  | "home"
  | "planner"
  | "journey-active"
  | "journey-completed"
  | "history"
  | "map"
  | "metro"
  | "lrt"
  | "monorail"
  | "brt"
  | "train"
  | "fares"
  | "community"
  | "notifications"
  | "auth"
  | "profile"
  | "admin";

export type ScreenParams = Record<string, string>;

export type NavigateFn = (key: ScreenKey, params?: ScreenParams) => void;

export interface ScreenProps {
  navigate: NavigateFn;
  params: ScreenParams;
}

export const SCREEN_KEYS: ScreenKey[] = [
  "welcome",
  "home",
  "planner",
  "journey-active",
  "journey-completed",
  "history",
  "map",
  "metro",
  "lrt",
  "monorail",
  "brt",
  "train",
  "fares",
  "community",
  "notifications",
  "auth",
  "profile",
  "admin",
];

export function isScreenKey(value: string): value is ScreenKey {
  return (SCREEN_KEYS as string[]).includes(value);
}
