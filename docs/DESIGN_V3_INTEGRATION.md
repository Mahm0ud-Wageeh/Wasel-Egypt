# Design System v3 Integration — 2026-09-09

Integration of the design-system v3 deliverables (`design-system/wasel-egypt/MASTER.md`
+ prototype) into the existing Wasel Egypt architecture. No parallel frontend, no
duplicated features — every change extends the current Laravel + React stack.

## Backend (new capability: map stop info panel, design v3 §10)

Three additive public endpoints, all feature-tested (`tests/Feature/Transit/PublicStopInfoTest.php`, 7 tests):

| Endpoint | Purpose | Implementation |
|---|---|---|
| `GET /api/v1/stops/{id}?with_routes=1` | Stop detail + serving routes (lines, modes, colors) | `TransitStopController::publicShow` + new `servingRoutesFor()` — reuses the existing `routeStops` relation; field omitted without the flag (old contract unchanged) |
| `GET /api/v1/stops/{id}/departures?limit=3` | Next departures per serving variant | New `app/Services/Transit/StopDeparturesService` — same schedules/stop_times/frequency_windows sources and headway-grid semantics as `JourneyPlannerService::resolveFrequencyDeparture`. Lines without timetable data are returned with `has_timetable: false` and NO invented times |
| `GET /api/v1/stops?lat=&lng=&radius=` | Nearby stops, nearest-first | `publicIndex` extension — degree-space prefilter + haversine via existing `GeoCalculator::distanceMeters`; standard `{data, links, meta}` envelope; `distance_meters` field only present on nearby queries |

Route registered in `routes/api.php`. `TransitStopResource` gained a conditional
`distance_meters` (`$this->when(isset(...))`) — omitted for all existing consumers.

### Driver-compat note (bug found by tests)
Schedule date filtering uses `whereDate()` (not plain `<=` string compare): sqlite
stores Carbon-bound dates as `YYYY-MM-DD 00:00:00`, and the string comparison
`'2026-09-09 00:00:00' <= '2026-09-09'` is **false** on sqlite (true on MySQL).
Same semantics as the planner's date check.

## Frontend (design adoption + real-data wiring)

### Design tokens (`src/styles/tokens.css`)
- New AA text-on-tint tokens: `--w800 #9a5b00`, `--s800 #256b29`, `--a800 #7d5c1e`
  (audited ≥4.5:1 on their `-50/-100` tints; the `-600/-700` tones remain graphics-only)
- `--dur-slow: 320ms` (drawers/sheets) and `--scrim` for dialog/drawer overlays

### Logo (`src/components/ui/Logo.jsx`)
New mark per MASTER §2 "the route is the letter": solid `--p900` badge (gradient
removed), W-route polyline with origin dot bottom-start and gold destination dot at
the apex; lockup subtitle uses gold on dark, `--a800` on light.

### Contrast fixes (AA) — `components.css`, `base.css`, inline styles
All colored **text** on tinted surfaces moved to `-800` pairs: badges (pending/
verified/completed/low/medium/rerouted), alert titles, hero geo warnings,
reliability pills, admin stat text, searchbar pin, dashboard/reports/active-journey
inline text. Border/accent graphics stay on `-600/-700` (3:1 non-text rule).

### Reduced motion (design v3 §8)
`components.css` gained a global `prefers-reduced-motion: reduce` gate: animations
→ 0.01ms/1-iteration, decorative transforms removed.

### Stop info panel — new `src/components/ui/StopPanel.jsx`
Connected to the three new endpoints. Renders serving line chips, next-departure
times ("5 min", tabular), honest "No timetable data for this line" /
"No upcoming departures right now" states, and Set-as-origin/destination actions.
Styling in `components.css` (`.stop-panel*`): bottom sheet on mobile, 340px side
card on ≥768px, RTL-aware.

### MapPanel integration
- Stop click now reads `stop_id` from the feature properties (both `stops-halo` and
  `nearby-halo` layers carry it) and opens the StopPanel for numeric ids.
- New optional `onSelectStop` prop — no existing consumer breaks.
- `JourneyResults` wires it to `JourneyContext.storeSearch` → back to the planner
  with the stop prefilled (real state bridge, verified E2E).
- `JourneySearch` wires Set-as-origin/destination directly into the live planner
  (`planner.setOriginStop/setDestinationStop`) and enables the nearby-stops layer.

### i18n
10 new keys EN+AR (`map.stop_panel_*`), dictionaries regenerated (499/499 parity).

### Bug fixes found by browser E2E
- `Forbidden.jsx` and `NotFound.jsx` used `<Icon>` without importing it → hard crash
  on the 403 route for every non-admin (verified rendering correctly after fix).

## Verification

- Backend: **268/268** tests green (incl. 7 new stop-info tests)
- Frontend: **110/110** tests green (incl. 5 new StopPanel tests)
- Production build: green (maplibre stays an isolated chunk)
- Browser E2E (real flows, real DB):
  - Landing: live stats 3,025 stops / 1,014 routes from real API
  - Journey Tahrir Square → Giza (Omraneyya): Recommended 18 min direct, 95%
    reliability, 372 m walking, **8 EGP** (TfC mdb-3354, Oct 2024)
  - Journey Mar Girgis → Saad Zaghloul: Recommended 8 min direct, 95%, 0 m, 8 EGP
  - Stop panel on map click (real CUA click on maplibre canvas): Tahrir Square —
    Metro L1/L2 both directions, CTA buses, minibuses with real minute counts,
    honest "no timetable data" rows, "Now" for departed-time grid
  - "Set as origin" round-trip: results map → planner with the stop prefilled
  - EN/AR RTL: all pages dir=rtl with real Arabic, zero horizontal overflow
  - 390px: landing + results zero overflow, mobile tabbar visible
  - All 10 routes sweep: zero crashes (403/404 pages render correctly)

## Attribution (unchanged, restated)
Transit data © Transport for Cairo (CC-BY-NC-SA) via Mobility Database mdb-3355;
Cairo Metro fares from mdb-3354 (Oct 2024); map data © OpenStreetMap contributors.


---

# Addendum — Final Product Completion (2026-09-10)

## Route/line experience (the last major gap, now closed)
Passengers can now open a real line page: **`/routes/:id`** (public).

Backend (all additive, feature-tested in `RouteExperienceTest`, 5 tests):
- `GET /public-routes/{id}` now includes `variants[]` — active variants with
  `headsign`, `direction`, `has_geometry`, and REAL `frequency_windows`
  (GTFS frequencies; e.g. Line 1: every 7 min 05:30–07:00, every 5 min
  07:00–10:00 — verified live).
- `GET /route-variants/{id}/geometry` — NEW public endpoint returning the
  stored polyline (same data the planner uses). 404s honestly when a variant
  has no shape — never a fabricated line.
- `GET /routes/{id}/stops` — variants now carry `headsign`/`direction`/`active`.
- `ScheduleResource` exposes `frequency_windows` (was in the DB, hidden).
- Active service alerts now eager-load their affected routes/stops.

Frontend:
- NEW `pages/RouteDetail.jsx` (+ `/routes/:id` router entry, public): line
  identity (number, name, operator, mode, GTFS color), direction switcher
  (real headsigns: "New Marg" / "Helwan Metro"), line map drawn from the
  stored geometry with all stops, frequency windows rendered as
  "every N min · start–end", ordered stop list, and per-stop
  "Plan from <stop>" that prefills the real planner origin (never
  overwriting an existing selection).
- Home metro cards now link to `/routes/:id` instead of generic `/search`.
- 15 new i18n keys EN+AR (514/514 parity).

## Data quality (report: docs/DATA_QUALITY_REPORT.md)
Read-only audit of the live dataset: structurally healthy — zero orphaned
relations, zero broken sequences, zero bad coordinates, all 1,792 active
variants have schedules AND geometry. Documented (NOT deleted):
5 true duplicate stop pairs (Obour Market area), 1 single-stop variant,
Latin-only stop names (Arabic search works via the Photon places section —
verified with "ميدان التحرير"). No records modified.

## Flaky-test fix (real defect found by the audit run)
`PublicStopInfoTest::departures_return_frequency_grid_times…` used a fixed
05:00–23:00 frequency window — near 23:00 UTC the first grid departure falls
past the window end and the second slot vanished. GTFS clock windows are
same-day, so any "now+X" window wraps at midnight. Rebuilt with a
same-day window (floor5(now)→23:59) + 120s headway; deterministic at any
run time. The production service behavior was already correct.

## Verification (this phase)
- Backend: **273/273** (7 stop-info + 5 route-experience included)
- Frontend: **113/113** (3 new RouteDetail tests)
- Production build: green
- Browser E2E: Line 1 page with real data (operator "National Authority for
  Tunnels", 35 stops, both directions, real frequencies, map from geometry);
  Line 2 via Home card click; honest 404 for unknown line; "Plan from stop"
  prefill round-trip; both required journeys re-verified post-change
  (Tahrir→Giza 20 min direct 95% 8 EGP; Mar Girgis→Saad Zaghloul 10 min
  direct 95% 8 EGP); 14-route sweep at 1920px and 390/768px — zero crashes,
  zero overflow, AR RTL throughout.
