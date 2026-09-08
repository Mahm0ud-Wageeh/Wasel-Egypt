# Wasel Egypt — Current System Architecture

**Phase 0 audit — compiled 2026-09-06** (supersedes the stale root `FINAL_AUDIT_REPORT.md` of 2026-09-03)

---

## 1. Repository Layout

```
Wasel Egypt/                     (repo root = Laravel 12 API)
├── app/                         (Http, Models, Services — domain logic)
├── database/migrations/         (35+ migrations, ERD-verified)
├── database/seeders/            (Governorate, RolePermission, SystemConfig, TransitMode, TransitOperator)
├── docs/                        (design, research, data, audit, architecture, demo)
├── frontend/                    (React 18 + Vite SPA, custom CSS design system)
├── routes/api.php               (191 lines, /api/v1)
├── tests/                       (Feature + Unit — 218 tests / 1609 assertions, ALL GREEN 2026-09-06)
└── storage/app/gtfs-sources/    (raw external GTFS feeds — not part of seed data)
```

## 2. Verified Current State (2026-09-06)

| Check | Result |
|---|---|
| Backend test suite | **218 passed, 1609 assertions, 0 failed** (34s) |
| Frontend test suite | 29 tests passed, **6 of 13 test FILES fail** (esbuild transform errors introduced by the maplibre upgrade — regression, must fix) |
| DB transit volume | 5 stops, 2 routes, 3 variants, 8 stop_times, 0 geometries, 0 alerts (dev residue only) |
| Reference data | 28 governorates, 6 transit modes, 5 operators, 4 users |
| Map | Real MapLibre GL JS + OSM raster tiles (done 2026-09-05) |

**The single biggest gap: the database contains no real transit data.** Journey planning, recovery, analytics, and the demo all depend on it.

## 3. Backend Modules

### 3.1 Service Layer (`app/Services/`)

| Domain | Class | Responsibility |
|---|---|---|
| Planning | `Journey/JourneyPlannerService` | Deterministic planner: walking-only / direct / 1-transfer candidates → scoring → ranked options. Network index = all active `RouteVariant`s + ordered `routeStops` in memory. |
| Planning | `Journey/JourneyScoringService` | Weights time/walk/transfers/fare/reliability + preference bonuses/penalties. |
| Planning | `Journey/FareEstimator` | Mode-based fare estimation. |
| Planning | `Journey/GeoCalculator` | Haversine distance, walking duration (speed profile), transit speed per mode. **Straight-line only — no road awareness.** |
| Execution | `Journey/JourneyService` | Persist journeys (save/list/show/delete, alternatives). |
| Execution | `Journey/JourneyExecutionService` | Start journey → creates `ActiveJourney` + legs. |
| Execution | `Journey/JourneyTrackingService` | Location updates → progress rows, next-stop ETA. |
| Execution | `Journey/DeviationDetectionService` | Distance-from-route threshold → `DeviationEvent`. |
| Execution | `Journey/RecoveryService` | Generate recovery options from current position (reachable stops, remaining journey), accept reroute. |
| Community | `Reports/ReportService` | Report CRUD + filters. |
| Community | `Reports/TrustScoreService` | User trust computation from verification/moderation history. |
| Notifications | `Notifications/NotificationService` | In-app notifications (type in `data_payload` JSON). |
| Analytics | `Analytics/AdminAnalyticsService` | Dashboard aggregates: journeys, deviations, usage, reports, trust, notifications, modes. |
| Data | `Transit/GtfsImportService` | Zip-based GTFS import (see §6 — has serious gaps for real feeds). |

### 3.2 API Surface (`routes/api.php`, prefix `/api/v1`)

- **Auth**: register / login / logout / forgot-password / reset-password / user (Sanctum tokens).
- **Users**: self show/update, preferences; admin list/delete (`role:admin`).
- **Journeys**: `POST journeys/search` (planner), CRUD, `{id}/alternatives`.
- **Active journeys**: start → index/show → **location** → progress → deviations → recovery-options (list/generate/accept) → resume / complete / cancel.
- **Community**: reports CRUD + `moderate` (`role:moderator,admin`) + public index/show + user trust.
- **Notifications**: index, unread-count, read/read-all, delete.
- **Admin analytics**: dashboard, journeys, deviations, usage, reports, trust, notifications, modes.
- **Public transit data**: stops, transit-modes, governorates, areas, operators, public-routes(+{id}/stops), public-schedules, service-alerts/active, community-reports.
- **GTFS**: validate + import (`permission:transit-data-edit`).
- **Roles/permissions**: assign/remove permission.

### 3.3 Auth & Authorization Flow

Sanctum bearer tokens → `auth:sanctum` middleware; custom `CheckRole` / `CheckPermission` middleware (`role:admin`, `role:moderator,admin`, `permission:transit-data-edit`). Roles seeded: admin, moderator, verifier, passenger. The 2026-09-03 user horizontal-privilege gap was fixed (validation-before-guard checks in `UserController`).

## 4. Journey Lifecycle (data flow)

```
search    POST /journeys/search
            → JourneyPlannerService.search (builds network index, candidates, resolves leg times)
            → JourneyScoringService.score → ranked options (AnalyticsEvent logged)
save      POST /journeys              → journeys + journey_legs persisted
start     POST /journeys/{id}/start   → active_journeys (+ state machine)
track     POST /active-journeys/{id}/location
            → JourneyTrackingService → journey_progress
            → DeviationDetectionService → deviation_events (when off-corridor)
recover    GET/POST …/recovery-options → RecoveryService (re-plan from current position)
            POST …/recovery-options/{id}/accept → rerouted journey legs
complete  POST …/complete → outcomes recorded (feeds analytics + reliability)
```

## 5. Frontend Structure (`frontend/src/`)

- `api/` endpoint registry (`endpoints.js`) + per-domain clients (auth, journeys, activeJourneys, reports, notifications, users, admin) over a shared `client.js`.
- `auth/AuthContext` (custom), `contexts/JourneyContext`, `i18n/` (LanguageContext + dictionaries, EN/AR).
- `components/ui/` (Button, Card, Badge, Alert, Input, Feedback, LocationPicker), `components/map/MapPanel.jsx` (**MapLibre GL JS**, real OSM tiles, origin/dest markers, stop markers, route polylines, user-location dot), `components/layout/PassengerLayout`.
- `pages/`: Landing, Home, Search, JourneySearch, JourneyResults (+ stale `.bak`), ActiveJourney, Deviation, Reports, Notifications, Profile, Admin×4, auth pages ×4, NotFound, Forbidden.
- `styles/`: tokens.css (design tokens), components.css, base.css.
- Tests: 13 suites; 6 currently failing (esbuild/maplibre regression).
- Dev hosts: frontend `127.0.0.1:5173`, API `127.0.0.1:8000`.

## 6. GTFS Importer — Current Capability vs Real-Feed Requirements

Existing `GtfsImportService` (works for small textbook feeds; **insufficient for the real T4C Cairo feed**):

| Aspect | Current | Required for real feed (mdb-3355) |
|---|---|---|
| File reading | Whole CSV into arrays | Streaming/chunked (shapes.txt = 532k rows) |
| Agencies→operators | Creates by name | Must link routes to **correct** operator via `agency_id` |
| Route→mode | All routes get `TransitMode::first()` | Map T4C convention: type1+CTA→bus, CTA_M→minibus, paratransit (type0/P_*)→microbus |
| Shapes | **All points attached to first variant (broken)** | Link shape_id → trip → variant (1:1 in this feed: 1,784/1,784) |
| Frequencies | Not imported | Feed is frequency-based — planner needs headway-aware departures |
| Calendar | Dates as-is | Demo operation requires date normalization (feed service window is historical) |
| Stops→areas | All to one default area | Geographic assignment (governorate areas) |
| Provenance | None | Source/license/version metadata per import |

## 7. External Data & Dependencies (verified 2026-09-06)

- **Map**: MapLibre GL JS (BSD-3) + OSM raster tiles via `VITE_MAP_TILES_URL` (default Stadia Stamen Toner Lite; key required in prod; must document/switch).
- **GTFS feed (verified, adopt)**: **Mobility Database mdb-3355** — Transport for Cairo consolidated Cairo feed. 11 agencies (CTA buses/minibuses, Mwasalat Misr, paratransit coop/orange microbus/blue 8-seater/Box, Green Bus, LTRA, Peugeot; NAT registered but no metro routes). **1,011 routes, 2,997 stops, 1,784 trips, 44,743 stop_times, 531,958 shape points, frequency-based service (6,432 frequency rows), 2 calendars**. License **CC-BY-NC-SA-2.0** (non-commercial OK for graduation project; attribution + share-alike obligations documented). No auth, direct zip. Latest dataset 2026-07-09; service window Jan–Dec 2025 (needs honest demo-date normalization).
- **Cairo Metro**: NOT in mdb-3355 (NAT has zero routes). Supplement from OSM route relations (ODbL) + published NAT headways, with separate provenance.

## 8. Technical Debt / Fragile Areas

1. **`resolveLegTimes` runs 2 queries per candidate leg** (`JourneyPlannerService.php:548`) — at Cairo network density this becomes thousands of queries per search. Must batch-preload schedules/stop-times with the network index.
2. **Planner ignores frequencies** — frequency-based feeds always hit the synthetic-timetable fallback (fixed 300s wait), making ETAs unrealistic with the real feed.
3. Frontend test regression (6 files) + `JourneyResults.jsx.bak` cruft.
4. `GtfsImportService::importShapes` attaches all geometry to one variant (broken).
5. Walking legs are straight-line haversine (documented circuity/corridor work pending).
6. Root-level stale audit reports (`FINAL_AUDIT_REPORT.md`, `FRONTEND_UPGRADE_REPORT.md`) diverge from actual state.
7. No data provenance tracking, no licenses/attributions doc yet.

## 9. Integration Points

- SPA ↔ API: bearer-token REST, `/api/v1`; CORS configured for 5173/8000 hosts.
- Map tiles: external provider, env-configured, needs attribution + offline/failure fallback.
- Future: OSM Overpass (metro extraction), no other external services planned (architecture decision: no microservices for V1).

## 10. Phase-0 Conclusion

The platform's engineering core (auth, planning, execution, deviation/recovery, community/trust, notifications, analytics — 218 green tests) is solid and must be preserved. The critical path to a credible product is now: **real data import (mdb-3355 + OSM metro), importer/planner upgrades to handle it, disruption-aware planning, frontend polish + test repair.** All upgrades are additive to the existing API contracts.

**READY FOR NEXT PHASE: YES** (research verification complete; implementation of data pipeline is the highest-value next step)
