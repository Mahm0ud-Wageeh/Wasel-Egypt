# Wasel Egypt — Phase 7–11 Upgrade Report (Real Data Era)

**Date:** 2026-09-06
**Scope:** This report covers the session that took Wasel Egypt from an
empty-database prototype to a real-data transit platform: verified data
research, production-grade import pipeline, planner upgrades, frontend
regression repair, public landing site, and a fully verified live demo
lifecycle.

---

## 1. What was inspected

- Full backend (services, controllers, resources, routes, migrations,
  seeders, 218-test suite re-run) — see
  `docs/audit/CURRENT_SYSTEM_ARCHITECTURE.md` (new, supersedes the stale
  root audit).
- Frontend state: found **6 of 13 test files broken** (esbuild transform
  errors — syntax corruption left by the previous session's maplibre
  edit: `JourneyResults.jsx` and `Home.jsx` were mid-edit broken) and a
  stale `JourneyResults.jsx.bak` that was a copy of the broken file, not a
  good backup.
- Database volume: 5 stops / 2 routes (dev residue only).
- Live data sources: Mobility Database mdb-3355 (T4C Cairo feed —
  verified by downloading and inspecting the actual zip), Overpass OSM
  metro relations (verified geometry + stop roles + tags).

## 2. What was researched

- Mobility Database feeds for Egypt: found the **live, official mdb-3355**
  (successor of deprecated mdb-1825): 11 agencies, 1,011 routes, 2,997
  stops, frequency-based service, CC-BY-NC-SA-2.0, no auth, direct zip.
  Verified locally: agencies include NAT (Cairo Metro authority) with **zero
  metro routes** — metro must come from OSM. The feed's `route_type` is
  non-standard (0 = paratransit, 1 = formal road) → mode mapping must key
  on `agency_id`.
- Prior sessions' research docs updated with these verification addenda
  (`docs/research/OPEN_SOURCE_AND_API_RESEARCH.md`,
  `docs/data/EGYPT_TRANSIT_DATA_STRATEGY.md`).

## 3. What was changed

### Backend
1. **GTFS importer rewritten** (`app/Services/Transit/GtfsImportService.php`):
   streaming CSV reader (constant memory — 532k shape points handled),
   agency→operator/mode mapping, per-variant geometry with decimation
   (≤400 pts), frequency windows import, demo service-window
   normalization, overnight time wrapping, idempotent upserts, provenance
   logging. New `php artisan gtfs:import` command (URL or path).
2. **Cairo Metro OSM importer** (`app\Console\Commands\OsmMetroImport.php`):
   Overpass relations → routes/variants/stops/schedules with NAT-derived
   frequency windows (explicitly labeled derived), station
   proximity-linking (≤150 m) to GTFS stops for real interchanges,
   idempotent on OSM ids, provenance logged.
3. **Planner upgrades** (`JourneyPlannerService`):
   - frequency-aware departures (headway-grid snapping anchored at window
     start, arrival from template offsets);
   - per-search memoized schedule resolution;
   - **board-eligibility reachability rewrite**: endpoint board maps +
     interchange sets replace naive nearest-stop pairing (which found
     zero cross-city plans on the dense real network); `MAX_STOP_CANDIDATES`
     5 → 12;
   - cached network index on the file store with structural-fingerprint
     invalidation (search: ~7 s cold → **~90 ms cached**);
   - **disruption-aware ranking**: active service alerts touching a plan's
     variants/stops flag the plan (`disrupted`, `alerts`) with a ×1.25
     score penalty and re-rank — surfaced in `JourneyPlanResource`.
4. **Migrations**: `schedules.frequency_windows` (JSON),
   `data_import_logs` (provenance), unique index on
   `route_stops (variant, stop, sequence)` for idempotent re-imports.
5. **API bug fix**: removed redundant `->additional(['meta' => ...])` from
   9 transit controllers — it merged with the paginator's own meta and
   turned scalars into `[value, value]` arrays (e.g. `total: [3025, 3025]`).
6. **Test flake fix** (not a weakening): `CommunityReportTest` fixtures
   used `today()->setTime(8:10)` which is in the future when the suite
   runs in the early-morning UTC hours → 422s. Anchored to yesterday.
7. **New tests (+10)**: `GtfsImportServiceTest` (agency→mode mapping,
   frequency windows, idempotent re-import, overnight normalization,
   provenance), `FrequencyAndDisruptionTest` (headway snapping, arrival
   derivation, disruption flag/penalty/rank, expired alerts ignored),
   `PlannerReachabilityTest` (trunk-line-via-beyond-nearest-stop scenario,
   no-fabrication negative case).

### Data
- **mdb-3355 imported**: 2,997 stops, 1,011 routes, 1,784 variants,
   44,743 stop times + route stops, 1,784 geometries, 6,432 frequency
   windows, demo window 2026-09-01→2027-09-01, provenance row written.
- **Cairo Metro imported**: Lines 1/2/3 (Line 3 with both branches), 8
   variants, 28 new stations, 190 stations linked to existing GTFS stops.
- Final volumes: **3,025 stops · 1,014 routes · 1,792 variants · 44,967
   stop times · 15 operators**.

### Frontend
1. **Regression repaired**: fixed the broken JSX in
   `JourneyResults.jsx` (orphaned map-callback/transfer blocks) and
   `Home.jsx` (unclosed alert map) — both left syntax-broken by the
   previous session, breaking the whole bundle; removed the misleading
   `.bak`.
2. **Tests modernized to the current product** (not weakened): old
   assertions targeted the deleted SVG mock map ("map (preview)",
   `viewBox`) and stale field names (`route_short_name`); updated to the
   real MapLibre panel contract and the real API contract
   (`short_name`/`long_name`) — the mock now matches `JourneyPlanResource`.
3. **Landing page rebuilt** as a real public site: hero + live coverage
   stats (3,025 stops / 1,014 routes from the API), live service-alerts
   section (real data only — renders nothing when no alerts), How Wasel
   Works (Plan/Track/Detect/Recover), six mode chips, community-trust
   section, CTA, professional footer with **correct data attributions**
   (T4C CC-BY-NC-SA + OSM). Added `.container`/`.grid-2` utilities.
4. **Journey option cards**: disruption banner (`disrupted` + alert
   texts), per-leg mode timeline with real API fields, transfer section
   keyed to `transfer_type`.

## 4. Files changed (key)

Backend: `app/Services/Transit/GtfsImportService.php` (rewritten),
`app/Console/Commands/GtfsImport.php` (new),
`app/Console/Commands/OsmMetroImport.php` (new),
`app/Services/Journey/JourneyPlannerService.php` (major),
`app/Models/Schedule.php`, `app/Http/Resources/JourneyPlanResource.php`,
9 transit controllers (meta fix), 3 migrations (new), 3 test files
(new), 1 test fixture fix.
Frontend: `src/pages/JourneyResults.jsx` (repaired + disruption UI),
`src/pages/Home.jsx` (repaired), `src/pages/Landing.jsx` (rebuilt),
`src/styles/base.css`, `src/test/test-utils.jsx` (API-contract mock),
2 test files modernized.
Docs: `docs/audit/CURRENT_SYSTEM_ARCHITECTURE.md` (new),
`docs/data/DATA_PROVENANCE.md` (new),
`docs/demo/LICENSES_AND_ATTRIBUTIONS.md` (new),
research/data/demo docs updated with verified addenda.

## 5. APIs added/changed

- No breaking changes. Additions: `schedules.frequency_windows` column;
  `data_import_logs` table; `JourneyPlanResource` now includes
  `disrupted` + `alerts`; public listing `meta` now well-formed scalars
  (bug fix); two artisan commands (`gtfs:import`, `osm:metro-import`).

## 6. Dependencies added

None (no new composer/npm packages — deliberate; all upgrades are
first-party code).

## 7. External data adopted

- Mobility Database **mdb-3355** (Transport for Cairo) — CC-BY-NC-SA-2.0.
- OpenStreetMap metro relations via Overpass — ODbL-1.0.
- Rejected: OTP/Valhalla/OSRM services (unjustified ops overhead for V1),
  Transitland (covered by MobilityDB).

## 8. Tests run

- Backend: **228 passed / 0 failed** (1,664 assertions) — includes 10 new
  tests covering the importer, frequency planning, disruption ranking and
  reachability.
- Frontend: **13 files / 51 tests passed** (repaired from 6 failing
  files); production build clean (4.7 s).

## 9. Live verification (Phase 11)

Full lifecycle executed against the running stack (curl + real browser):

- Guest landing shows real stats; login via UI works.
- UI search Tahrir → Giza pyramids: 3 ranked options (65 min, 1 transfer,
  minibus `Ms4` → CTA `2002`, 1.3 km walk; metro journeys verified
  separately: Mar Girgis → Saad Zaghloul, Line 1 direct, 8 min).
- Save → start → location pings (nearest stop, stop events, progress) →
  deviation ping → **"Off route: 478 m from the corridor of the current
  minibus leg"**, status `deviated` → 3 recovery options generated
  (re-planned from actual position) → accept → `rerouted` → complete →
  4 lifecycle notifications in order.
- Community: report submitted; self-moderation **409-blocked** (integrity);
  second moderator verified → report in public feed.
- Admin dashboard returns live KPIs.
- Late-night behavior is truthful (first departures snap to the 05:30
  window) — documented in the demo script.

## 10. Performance observations

- Journey search: ~90 ms cached / ~700 ms–1.5 s cold (network index
  build) at 3,025-stop scale — the file-cache + fingerprint keeps repeat
  searches fast; any import rotates the fingerprint automatically.
- Import: full mdb-3355 + shapes in one streamed transaction (minutes).
- MySQL cache store cannot hold the 15 MB network index (packet limit) —
  the planner uses the file store deliberately.

## 11. Security observations

- No secrets added; agency-mode map passed as CLI options, not config.
- Authorization untouched and re-verified live (role:admin dashboard,
  moderator-only moderation, self-moderation 409).
- Validation re-verified live: future `occurred_at` → 422; malformed
  payloads → 422; missing auth → 401.
- Demo date normalization is explicit in data + schedule notes; nothing
  is labeled "live" that isn't.

## 12. Remaining issues (honest list)

1. Walk legs are still straight-line haversine (road-aware walking was
   deferred by the approved architecture — Phase C candidate).
2. Metro geometry is station-to-station polylines (way-level geometry
   import would need the way-member Overpass query).
3. Map tiles default to an external provider — production needs an API
   key or self-hosted tiles (documented in licenses doc).
4. Two identical-stat options can appear when parallel services share
   headways (correct, but a "similar to #1" UI hint could improve scan).
5. Admin data-quality screen (import-log viewer) is backend-only; a small
   admin UI page would surface provenance nicely.
6. An old Vite dev server may hold port 5173 serving stale code — kill
   stale node processes before demoing (noted in demo script).

## 13. Next recommended phase

Phase C (per approved architecture): road-aware walking via OSM footway
graph in `GeoCalculator`, Alexandria coverage (second city), admin
provenance/data-quality screen.

## 14. READY FOR NEXT PHASE: YES

---

## FINAL PROJECT STATUS

- **Data**: real (mdb-3355 + OSM metro), provenance-logged, reproducible
  imports, 3,025 stops / 1,014 routes / 15 operators.
- **Engineering**: 228 backend + 51 frontend tests green; production build
  clean; live end-to-end lifecycle verified including the flagship
  deviation → recovery loop.
- **Demo**: verified 5-act script in `docs/demo/DEMO_SCENARIO.md`.
- **Docs**: architecture audit, provenance, licenses/attribution, research
  and data strategy all updated to match reality.

FINAL PROJECT STATUS: READY / NOT READY → **READY (core system)**
CRITICAL ISSUES: 0
HIGH ISSUES: 1 (stale-port dev-server trap in demos — mitigation documented)
MEDIUM ISSUES: 3 (walking straight-line; metro geometry simplification; tile-provider key for production)
TESTS: 228 PASSED / 0 FAILED (backend) · 51 PASSED / 0 FAILED (frontend)
READY FOR GRADUATION DEMO: YES
