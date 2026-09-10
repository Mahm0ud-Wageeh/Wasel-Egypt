# Wasel Egypt — Intelligent Public Transit Journey Platform

**Wasel** (واصل — "to arrive / stay connected") is a graduation project: a complete,
real-data public transit platform for Greater Cairo. It plans multimodal journeys
across the network Cairenes actually ride (metro, bus, minibus, microbus, rail,
walking), tracks them live, detects deviations, and recovers with reroutes —
in English and Arabic (full RTL).

- **Backend:** 274/274 tests · **Frontend:** 118/118 tests (21 files)
- **Live data:** ~3,025 stops · ~1,014 routes · ~1,792 active variants
- **Verified:** real-browser E2E, EN + AR, 390 / 768 / 1440 px, zero console errors

## Problem → product

Cairo's transit is fragmented across formal (metro, CTA buses) and informal
(minibus, microbus) modes with no single journey source. Wasel fuses them into
one plan: search once, compare ranked options with fares and reliability, ride
with live awareness, and get rerouted from where you actually are — not where
you should be — when reality deviates.

## Key features

- **Multimodal journey planning** — direct + transfer options with explainable
  scoring (time 40%, walking 20%, transfers 20%, fare 10%, reliability 10%)
- **Cairo Metro fares** — real Oct-2024 fare matrix (8/10/15/20 EGP) with
  source attribution on every fare; non-metro legs honestly show no fare
- **Live journey execution** — progress, next stop, ETA, GPS pings
- **Deviation detection + recovery** — off-route/missed-stop events, severity,
  resume rules, generated reroute options from the live position
- **Stop experience** — stop panel with serving lines + live next departures,
  set-as-origin/destination hand-off into the planner
- **Route/line pages** — variants, directions, stored geometry on the map,
  real GTFS frequency windows, ordered stops, plan-from-stop
- **Community reports + trust** — moderated rider reports feed live alerts
- **Current location** — permission-safe geolocation with reverse-geocoded
  labels, accuracy halo, full denied/timeout/unavailable handling
- **Bilingual UI** — 489 EN/AR string keys at enforced parity, RTL-first CSS

## Architecture

```
Browser (React 18 SPA, MapLibre GL) ──REST──▶ Laravel 12 API (Sanctum)
        │                                            │
        │ OSM raster tiles                    ┌──────┴───────┐
        │ Photon (via backend proxy)          │  MySQL (GTFS │
        └────────────────────────────▶ OSRM foot profile (self-hosted, road-aware walking)
```

- **Journey planning** runs server-side (`JourneyPlannerService`) against
  GTFS static data in the **Africa/Cairo wall-clock frame**; disruption-aware
  ranking; per-search memos + fingerprint-invalidated network cache.
- **Tracking/deviation** (`JourneyTrackingService`, `DeviationDetectionService`)
  work on instants + spatial corridors; severity-gated resume rules.
- **Map** renders base tiles + mode-colored route polylines (variant/OSRM
  geometry), stop layers, nearby-stops viewport layer, user halo —
  all from backend data, no invented geometry.
- **Frontend** is a token-CSS design system (no CSS framework), lucide icons,
  lazy-loaded map bundle with a pinned same-origin web worker.

## Technology stack

| Layer | Tech |
|---|---|
| API | Laravel 12, Sanctum tokens, MySQL (SQLite for tests) |
| SPA | React 18, React Router 6, Vite 5, Vitest + Testing Library |
| Map | MapLibre GL JS 6.7 (raster OSM default, configurable) |
| Routing engine | Self-hosted OSRM `foot` profile over OSM Egypt extract |
| Geocoding | Photon, proxied + cached + throttled server-side |
| i18n | EN/AR dictionaries generated from JSON (parity enforced in CI tests) |
| PWA | Offline app shell (service worker; API/tiles never cached) |

## Real data sources

| Source | Use | License |
|---|---|---|
| Transport for Cairo GTFS via Mobility Database (mdb-3355) | Network: routes, stops, schedules | CC-BY-NC-SA-2.0 |
| TfC metro fares via Mobility Database (mdb-3354) | Fare matrix, pure-metro only | CC-BY-NC-SA-2.0 |
| OpenStreetMap | Station coordinates, geometries, map tiles, Photon results | ODbL-1.0 |
| Cairo Metro OSM relations | Lines 1–3 shapes | ODbL-1.0 |

Attribution is shown in the product (landing footer, map control, per-fare
credit). Full provenance: `docs/data/DATA_PROVENANCE.md`; licenses:
`docs/demo/LICENSES_AND_ATTRIBUTIONS.md`. No fares, schedules, realtime, or
analytics are fabricated — unavailable data renders honest empty states.

## Screenshots / demo

Follow [`docs/demo/DEMO_CHECKLIST.md`](docs/demo/DEMO_CHECKLIST.md) (8 scripted
scenarios with expected results) and [`docs/demo/FINAL_DEMO_FLOW.md`](docs/demo/FINAL_DEMO_FLOW.md)
for the professor walkthrough. Production rollout: [`docs/demo/PRODUCTION_CHECKLIST.md`](docs/demo/PRODUCTION_CHECKLIST.md).

## Local setup

Requires PHP 8.2+, Composer, Node 18+, MySQL (or SQLite for a quick look).

```bash
# 1. Backend
composer install
cp .env.example .env            # then set DB_* (see docs/RUNBOOK.md)
php artisan migrate
php artisan db:seed             # modes, roles, operators, admin
php artisan serve --host=127.0.0.1 --port=8000

# 2. Transit data (one-time; archived sources in storage/app/gtfs-sources)
php artisan gtfs:import --help  # buses/paratransit (mdb-3355)
php artisan tfc:fare-import     # metro fare matrix (mdb-3354)

# 3. OSRM walking engine (optional but recommended; planner degrades honestly without it)
#    see docs/architecture/OSRM_SETUP.md, default http://127.0.0.1:5001

# 4. Frontend
cd frontend && npm install && npm run dev   # http://127.0.0.1:5173
```

Full from-scratch instructions (migrations, seeding, imports, verification):
[`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Testing

```bash
php artisan test          # backend: 274 tests
cd frontend && npm test   # frontend: 118 tests, 21 files
cd frontend && npm run build   # production build (+ PWA + map worker assets)
```

Key suites: journey planning/scoring/execution/deviation-recovery, planner
reachability, geocoder proxy, stop-info bbox/departures/reverse, navigation,
search validation, option rendering + fare attribution, geolocation hook,
landing search, EN/AR parity.

## Limitations

- Metro fare matrix only (Oct-2024); bus/paratransit fares don't exist in any
  source and are never guessed.
- No realtime vehicle feed exists for Cairo — times derive from published
  schedules/frequencies, never labeled "live".
- Planning latency is seconds on warm cache (cold full-network planning can
  take longer; covered by loading states; serve PHP concurrently, never with
  single-threaded `php artisan serve`, in production).
- OSM standard tiles suit demo volume; production traffic needs a keyed tile
  provider or self-hosted tileserver.

## Future work

Realtime GTFS-RT ingestion (reader already built, inert until a feed URL is
configured), headway-aware transfer scoring, wheelchair-routing constraints,
push notifications, network-wide analytics dashboards.

## License & attribution

Non-commercial graduation project. Transit data © Transport for Cairo
(CC-BY-NC-SA-2.0); map data © OpenStreetMap contributors (ODbL). See
`docs/demo/LICENSES_AND_ATTRIBUTIONS.md`.
