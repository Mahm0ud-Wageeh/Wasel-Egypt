# Wasel Egypt — Phase C Report: Real Map + Road-Aware Walking + UX Polish

**Date:** 2026-09-06
**Scope:** Real map productionization, road-network walking via a proven
routing engine, route geometry visualization, journey results/details/active
journey/deviation UX polish, public home, responsive + accessibility pass,
performance checks, full regression, live browser E2E.

---

## 1. Map solution selected

**MapLibre GL JS** (BSD-3-Clause) — already adopted in the prior phase;
this phase productionized it:

- Real OSM raster basemap through MapLibre's raster source; attribution
  control always visible (Stadia Maps / OpenMapTiles / © OpenStreetMap
  contributors) with compact toggle.
- **Functional controls** replacing decorative spans: working recenter
  (flyTo user/origin), zoom in/out, live zoom badge — all keyboard
  reachable with `aria-label`s and focus-visible rings.
- **Selected vs alternative routes**: the selected itinerary draws transit
  legs as solid mode-colored lines (metro red, bus teal, minibus purple,
  microbus orange, rail green — resolved to real hex values because
  MapLibre paint properties cannot read CSS variables) with a white
  casing layer; walking legs draw dashed gray. Unselected alternatives
  render as muted gray context lines.
- **Deviation marker** (severity-colored pin), **user location** (dot +
  halo), **stop markers**, origin/destination pins.
- **Graceful fallbacks**: non-finite coordinates are filtered everywhere
  (a NaN crash found by E2E — see §9); if MapLibre/WebGL fails to load the
  component renders an accessible placeholder that explains routing still
  works.
- Removed the fake "Next stop · 2 min" pill — the ActiveJourney screen now
  passes the real next stop and ETA.

Tile provider: Stamen Toner Lite via Stadia Maps (configurable
`VITE_MAP_TILES_URL`). API key: none required for the demo tier;
production must register a key via env or self-host tiles (documented in
`docs/demo/LICENSES_AND_ATTRIBUTIONS.md`).

## 2. Walking routing engine selected

**Self-hosted OSRM v26.9.0** with the **foot profile** over the Geofabrik
Egypt OSM extract (native Windows binaries — no Docker needed).

- **Why OSRM over Valhalla/other**: proven, BSD-2-Clause, first-class foot
  profile, runs natively on Windows for the demo machine; the public OSRM
  demo server was rejected (it answers with car-profile speeds — 13 m/s —
  regardless of the URL profile, and its terms forbid production use).
- `RoadAwareWalkingService` (new, `app/Services/Journey/`) calls OSRM over
  HTTP; results cached per coordinate pair (60 min, DB cache) + per-process
  memo. Trivial walks (<25 m straight-line) skip the engine.
- **Planner integration**: every walking leg (access, transfer, egress,
  walking-only) resolves real road distance, realistic walking duration
  (verified ~1.37 m/s on Cairo streets), and a road-following polyline.
  Legs carry `walk_source: "osrm" | "estimate"`.
- **Mandatory fallback**: OSRM unreachable → straight-line haversine with
  a documented ×1.3 circuity allowance, geometry null, `walk_source:
  "estimate"` — search never fails because of the engine. 5 s timeout.
- Recovery replanning deliberately **widens the boarding walk radius to
  2 km** and prefers transit-containing plans (a deviated rider rejoining
  the network should not be handed a walk-only itinerary when transit
  exists).
- Config: `OSRM_URL` / `OSRM_ENABLED` (`.env`), setup guide in
  `docs/architecture/OSRM_SETUP.md`, binaries + foot-profile Lua vendored
  under `storage/app/osrm/`.

## 3. Geometry improvements

- **Transit legs** now carry the variant's real GTFS shape polyline from
  `route_geometry` (memoized per-search lookup; decimated ≤400 pts at
  import). Legs without stored geometry are marked
  `geometry_source: "stop_to_stop"` — the honest fallback (straight line),
  never fake road geometry.
- **Walking legs** carry OSRM road geometry (`walk_source: "osrm"`).
- **Persistence**: new nullable `journey_legs.geometry` +
  `geometry_source` columns — saved journeys keep their exact geometry so
  the Active Journey map renders the real route from one payload. Legacy
  legs (null geometry) fall back to straight lines, documented.
- Verified live: a Tahrir→Giza search returns 4 legs with 18/400/288/93
  geometry points (osrm/route_geometry sources).

## 4. Screens polished

- **Journey Results**: desktop map+list split (map right, sticky, list
  left with scroll); mobile bottom-sheet map (fixed, 62dvh, handle,
  close button) + "View on map" trigger; selected-card state highlights
  the itinerary on the map; **score explanation panel** ("Why this
  ranking" — time/walking/transfers/fare/reliability bars with the real
  weight mix); disruption banner with alert text; sticky save bar that
  clears the mobile tabbar (bug found by E2E).
- **Active Journey** (flagship): live status strip (next stop + ETA,
  current leg, animated progress bar with ARIA progressbar role), live
  user marker from the latest GPS ping, deviation pin, full itinerary
  **timeline** with mode glyphs, stop names, times, in-progress/past
  states; GPS simulation panel (demo tool); rerouted banner; responsive
  map height.
- **Deviation/Recovery**: incident summary (type, severity, description,
  expected stop, detected coordinates, can-continue verdict), resume
  gating by severity, recovery options with **delay comparison vs the
  original journey** and a **per-option route preview map** (alternative
  geometry + deviation pin), accept-reroute flow, fixed a real bug where
  "Back to Map" navigated with an undefined id and removed a hardcoded
  fallback journey id 55.
- **Public home (landing)**: professional navbar (logo, section anchors,
  working EN↔AR language switch, login CTA), skip-link target, live
  coverage stats, real service alerts when present, footer attributions.
- **Global**: top-level error boundary (a render crash now shows a
  readable recovery screen, not a router dump), skip-to-content link,
  global focus-visible rings, `prefers-reduced-motion` support, RTL
  logical-property helpers + `<html dir>` switching foundation.

## 5. Files changed (key)

Backend: `RoadAwareWalkingService` (new), `JourneyPlannerService` (walking
resolution + transit geometry + NaN-safe), `RecoveryService` (widened
radius + transit preference), `JourneyService` (geometry persistence),
`JourneyLeg` model + resource, `ActiveJourneyResource` (preserves nested
leg relations), `ActiveJourneyController` (eager loads leg stop/route
relations), `NotificationService` + deviation copy fix, migration
`2026_09_06_040000_add_geometry_to_journey_legs_table`, config/services.php
+ .env(.example) OSRM block, tests (4 new `RoadAwareWalkingTest`, fixture
adjustments).
Frontend: `MapPanel.jsx` (full rewrite), `JourneyResults.jsx` (split
layout, score explanation, mobile sheet), `ActiveJourney.jsx` (rebuilt),
`Deviation.jsx` (previews + fixes), `Landing.jsx` (navbar), `main.jsx`
(error boundary + skip link), `PassengerLayout.jsx` (skip target),
`components.css`/`base.css` (map controls, timeline, sheet, a11y),
test-utils (real route patterns so useParams works), 4 test files
modernized to the real API contract.

## 6. Dependencies added

**None** (no new composer/npm packages). OSRM is a self-hosted external
binary, not a package dependency.

## 7. Tests

- Backend: **232 passed / 0 failed** (1,688 assertions) — includes new
  `RoadAwareWalkingTest` (OSRM contract, unreachable fallback, per-pair
  caching, short-walk skip).
- Frontend: **13 files / 51 tests passed**. Four test files were
  modernized to the **real API contract** (leg `mode`, `from_stop`/`to_stop`
  keys, persisted geometry, class-based sticky bar) — mocks previously used
  invented field names that matched the old UI, not the API.
- Production build: clean (3.5 s).

## 8. Browser E2E (live, real stack: OSRM :5001 + API :8000 + Vite :5174)

Flagship flow executed in the real browser UI:
1. Landing (navbar, live stats 3,025 stops / 1,014 routes).
2. Search form → 3 options with road-aware walking (1.7 km) and scores.
3. Best option expanded (score explanation visible) → **saved** through
   the UI.
4. Journey started (API) → Active Journey screen: next stop pill
   ("Shepheard Hotel"), ETA, progress bar (0% → 8% after a GPS ping),
   itinerary with real stop names (Origin → Shepheard Hotel → Khofo Gate →
   Mena House → Destination), live map with WebGL canvas.
5. "Simulate deviation" → auto-redirect to Deviation screen: incident
   summary (7,748 m off-route, high severity, expected stop, coordinates),
   resume correctly disabled, notification badge incremented.
6. "Find New Routes" → 3 recovery options with delay comparison (+177
   min) and route preview maps → **accepted reroute** → back on tracking
   with "Following your new route".
7. Complete → confirmation → auto-navigate home.
8. Notifications feed shows the full ordered story (started → deviation →
   recovery → rerouted → completed).
9. Reports/notifications/admin analytics verified working (from the
   earlier live smoke + this session's notification check).

Responsive: 390px (no horizontal overflow, nav collapses, sheet opens
fixed 62dvh with map), 1440px (side-by-side 968px map + 460px list, WebGL
rendering). Keyboard: controls/buttons focus-visible + aria-labels; skip
link first tab stop.

## 9. Real bugs found and fixed by this phase's E2E

1. **Map crash**: `Invalid LngLat object (NaN, NaN)` threw and blanked the
   route — non-finite coordinate guards added across bounds/markers/
   geometry.
2. **Sticky save bar under the mobile tabbar** — unclickable at 721px;
   fixed with a tabbar-aware offset.
3. **CSS variables in WebGL paint** — MapLibre can't resolve
   `var(--p600)`; markers were invisibly colored. All colors resolved to
   hex.
4. **Undefined `id` navigation** in Deviation ("Back to Map" →
   `/active-journeys/undefined`) + hardcoded fallback journey id 55.
5. **Leg field mismatch**: screens/tests used `journey_legs` /
   `transit_stop_from` / `mode_type` / `duration_seconds` — the API
   actually serves `legs` / `from_stop` / `mode` / `duration_sec`.
6. **Eager-load wipe**: `ActiveJourneyResource` re-loaded `journeyLegs`
   discarding nested stop/route relations → "Origin → Destination" labels;
   fixed with `loadMissing` on the relations.
7. **Recovery from deep deviations found nothing** (Heliopolis point):
   widened recovery walk radius to 2 km + transit-preference filter.
8. **jsdom compatibility**: `matchMedia` guard for the new sheet behavior.

## 10. Performance observations

- **Search latency (HTTP, real network 3,025 stops)**: ~1.6-1.7 s per
  search — within the architecture's <2 s target. The cost is per-leg
  schedule resolution (876 queries ≈ 700 ms across 13 candidates; the
  schedule memo keys on the leg's earliest-departure timestamp, so reuse
  is partial) plus Laravel boot + 2.5 MB index unserialize (~130 ms). OSRM
  adds little (3 unique walk pairs per search, cached, ~13 ms first /
  ~0 ms after).
- **API payload**: 54.6 KB raw / **9 KB gzipped** with full per-leg
  geometry — fine.
- **Bundle**: app chunk 348 KB (103 KB gzip); maplibre 1,014 KB
  (268 KB gzip) — code-split and dynamically imported, loads only on
  map-bearing pages.
- **Walk caching**: per-pair DB cache (60 min) + in-process memo; repeated
  searches skip OSRM entirely.
- Not optimized further (documented, not blind): the schedule-lookup
  batching would be the next lever if searches grow slower with more
  candidates.

## 11. Remaining limitations

1. Metro geometries are station-to-station polylines (OSM way-level
   geometry would need a way-member Overpass import) — marked
   `geometry_source: route_geometry` but coarser than bus routes.
2. Tile provider is an external demo-tier service; production needs an
   API key (env) or self-hosted tiles.
3. Deviation pings at points with no transit within the (widened) radius
   still yield "no recovery options" — honest, but a "walk to nearest
   stop" suggestion could soften it.
4. Arabic dictionaries exist but page copy is mostly English — the RTL
   foundation (dir switching, logical CSS) is in place; full AR copy is
   future work.
5. `php artisan serve` on Windows keeps serving stale code after edits —
   restart the server after backend changes (bit twice this session).

## 12. Final status

- Map: MapLibre + OSM tiles, real Cairo basemap, route polylines
  (selected + alternatives), stops, user location, deviation marker,
  recenter/zoom controls, attribution, responsive, fallbacks. **DONE**
- Road-aware walking: self-hosted OSRM foot profile, real distances/
  durations/geometry, estimate fallback, cached. **DONE**
- Route geometry: real GTFS polylines on transit legs, persisted to saved
  journeys, honest fallbacks labeled. **DONE**
- UX polish: results split + score explanation, active journey timeline,
  deviation previews + delay comparison, landing navbar, a11y (focus,
  skip link, reduced motion, ARIA), RTL foundation. **DONE**
- Regression: 232 backend + 51 frontend green; build clean; browser E2E
  of the full flagship flow executed against the live stack. **DONE**

**READY FOR FINAL FRONTEND AUDIT: YES**
