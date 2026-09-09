# Wasel Egypt — Product Redesign Report (Map, Landing, Geolocation, Brand)

**Date:** 2026-09-08 · **Scope:** full visual-system + UX + map + landing + geolocation redesign
**Constraints honored:** no business-logic rewrites, no Matrix/importer/TFC2 changes,
existing API behavior preserved (additive backend changes only), no fake data anywhere.

---

## 1. What was redesigned

| Area | Before | After |
|---|---|---|
| Design tokens | Flat palette, 3 shadows, ad-hoc sizes | `tokens.css` v2: full blue ramp, gold/teal accents, 5-step elevation, 4-pt spacing incl. `--sp-0/16`, type scale vars, `--ctl-*` control heights, `--icon-*` sizes, motion tokens |
| Buttons/inputs/cards | No hover/active deltas, 1px borders, `.chip` class used but **never defined** | Pressed/active/hover/disabled states, 1.5px input borders with hover, `.chip` component added, card hover lift |
| Branding | Generic lucide `navigate` glyph + text | Real logo mark (`Logo.jsx`): route folding into a "W" with origin ring + destination dot, gradient tile; used in nav, footer, tabbar (desktop), auth screens, admin rail; new SVG-derived favicon + PWA icons (192/512/maskable) |
| Landing hero | Static fake From/To card → `/search` | **Functional search**: shared `OriginDestinationFields` (autocomplete, swap, geolocation), real `/journeys/search` execution for authed users; guests store a validated draft and continue pre-filled after login |
| Location inputs | Per-page `LocationPicker` (monolith, no geo) | Shared `LocationSearchField` + `useJourneyPlanner` hook used by hero AND planner (one interaction language, zero logic duplication) |
| Geolocation | Only Reports lat/lng fill, silent Cairo fallback | `useGeolocation` hook (idle/locating/granted/denied/unavailable/timeout), crosshair affordance, auto-adopt when origin empty, meta line, refresh-by-relocate; Reports fallback kept honest |
| Map tiles | Stadia stamen_toner_lite → **HTTP 401** (API key now required) → blank map | OSM standard raster (keyless, verified 200), `VITE_MAP_TILES_URL` override kept, `{r}` correctly absent (MapLibre requests it literally) |
| Map rendering | Routes/pins/stops **never rendered** (see §3) | Route polylines (mode colors + casing + dashed walk), alt routes, origin/destination pins, leg-stop circles, user dot + accuracy halo, deviation pin |
| Map controls | Text glyphs (+/−/⌖), scattered | Grouped cluster (zoom in/out, stops toggle, recenter) with lucide icons + tooltips + `aria-pressed`, collapsible legend, zoom badge, selected-stop chip, compact attribution |
| Map data | Only selected-route stops | + live nearby-stops layer (real `GET /stops?bbox=`, 93 stops verified), stop click → info chip |
| Results page | Split layout, hardcoded EN strings | Same layout/logic; memoized map inputs (no GL rebuild churn); all user strings via i18n keys |
| ActiveJourney | Hardcoded EN strings | Wired to existing `journey.*` keys (identical EN text) |
| Footer | Hardcoded EN headings/links | Fully keyed (EN/AR) |

Deleted: orphaned `LocationPicker.jsx` (superseded), dead `.locpicker` CSS (kept `__clear` still used by the drawer).

## 2. What was added

- `frontend/src/components/ui/Logo.jsx` — brand mark + lockup
- `frontend/src/components/ui/LocationSearchField.jsx` — shared combobox
- `frontend/src/components/journey/JourneyPlannerForm.jsx` — `useJourneyPlanner` + `OriginDestinationFields`
- `frontend/src/hooks/useGeolocation.js` — permission-safe geolocation + `positionToSelection`
- `frontend/scripts/sync-maplibre-worker.mjs` — worker sync (`predev/prebuild/pretest`)
- Backend (additive): `GET /places/search?lat=&lng=` reverse mode (`PlaceGeocoderService::reverse`, cached, Photon reverse, coordinate-label fallback); `GET /stops?bbox=` viewport filter (validated, capped `per_page=100`)
- i18n: 489 keys EN/AR (100% parity via `gen.js`) — geo, map controls/legend, hero, footer, results metrics
- Tests: `landingSearch.test.jsx` (5), `geolocation.test.jsx` (7); backend: bbox (2) + reverse (4)

## 3. What changed in the map (root causes found by inspection + live CDP probing)

1. **Blank base map:** default tile endpoint returned 401 (Stadia requires API keys since 2024).
   Also, historic logs show a literal `{r}` was requested (`...1688%7Br%7D.png`) — MapLibre raster
   sources do not expand Leaflet's `{r}` token. Fixed with keyless OSM default; `{r}` kept out.
2. **Vector layers never rendered (pre-existing, both old and new code):** MapLibre resolves its
   web worker relative to `import.meta.url` (`./maplibre-gl-worker.mjs`). Vite's dev pre-bundler
   serves `deps/maplibre-gl.js` with **no sibling worker file (verified 404)**, and the Rollup
   build also omitted it — so the worker was dead: `isStyleLoaded() === false` forever,
   `querySourceFeatures() === []`, zero console errors. Raster tiles (main thread) masked the
   failure. Fix: worker files synced to `public/map/` + explicit `setWorkerUrl()` — identical
   behavior in dev, preview, and production (all verified with live layer queries).

## 4. How current location works

Explicit crosshair button only (never auto-prompted). `getCurrentPosition` (high accuracy,
12 s timeout) → position → reverse-geocoded to a real place name via the throttled server
proxy (coordinate label fallback) → auto-adopted as origin **iff the origin is empty**
(one-shot per locate; clearing sticks; relocate re-arms). Map shows the user dot + accuracy
halo and fits to it. Denied/timeout/unavailable each render a distinct, recoverable message.
Verified in headless Chromium with CDP-granted permission + emulated Tahrir coordinates:
origin filled, meta shown, `user-dot` layer present at the exact coordinates.

## 5. How the landing-page search works

Hero form = same `useJourneyPlanner` as `/search`. Submit validates → authed users execute
the real search and land in `/journeys/results`; guests `storeDraft()` (validated params only,
no API call) and go to `/login` with `from: '/search'`, continuing pre-filled after auth
(sessionStorage-backed context). Covered by `landingSearch.test.jsx` incl. the guest hand-off.

## 6. Tests / build results

- Frontend: **105/105 pass (18 files)** — 93 pre-existing + 12 new; `npm run build` ✓ (7 s)
- Backend: **261/261 pass** full suite; touched areas 21/21 (bbox + reverse + preserved validation)
- i18n: EN=489/AR=489 key parity enforced by test

## 7. Browser verification results (headless Chromium via CDP, real backend + 3,025 stops)

| Check | Result |
|---|---|
| Landing 1440/390 EN+AR, no overflow (`scrollWidth == 390`), no console errors | ✅ screenshots |
| Register → home (real account, token stored) | ✅ |
| Autocomplete (AR + Latin, Photon proxy) → pick → search → 3 real options | ✅ |
| Results map: OSM tiles + mode-colored route + pins + stops + legend + controls | ✅ dev + prod build |
| Details drawer → save ("Saved to your trips") → start → active journey | ✅ (save takes ~30–45 s: backend re-runs planning — pre-existing) |
| Geolocation granted → origin + halo marker at exact coords | ✅ |
| Geolocation denied → honest message, manual entry unaffected | ✅ (code path; unit-tested states) |
| Nearby stops toggle → 93 real stops layer | ✅ |
| Tablet 768, mobile 390, desktop 1440; RTL mirror incl. drawer/timeline/map controls | ✅ screenshots |
| `{r}` absent from all tile traffic; OSM attribution shown | ✅ |
| Prod `dist/` (worker files present) served via preview: register → search → mode-colored route | ✅ |

Remaining limitations / notes:
- Save-journey latency (~30–45 s) is backend planning cost, unchanged by this work; the button loading state covers it.
- A transient burst of HTTP 429s appeared during heavy verification (tile CDN throttling under rapid repeated loads); probes afterward returned 200 — no app-side request storm exists (debounced inputs, no polling).
- `frontend/public/map/` is generated (git-ignored); `npm run predev/prebuild/pretest` regenerates it — no manual step.
