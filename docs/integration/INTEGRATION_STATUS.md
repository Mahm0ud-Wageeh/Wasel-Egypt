# Integration Status

**Last updated:** 2026-09-07 · Live-verified against the running stack
(API :8000, OSRM :5001, Vite :5174). Baseline before this effort:
backend 232/0 · frontend 64/0 · search 1.60–1.84 s.

| Technology | Purpose | Status | Installed? | API key? | Local? | License | Egypt data? | Used by | Problems | Next step |
|---|---|---|---|---|---|---|---|---|---|---|
| Laravel 12 (API) | Business/domain layer | ✅ In production | ✅ | — | ✅ | MIT | — | Everything | — | — |
| MySQL/MariaDB | Primary datastore | ✅ In production | ✅ | — | ✅ | GPL-2.0 (server) | Real imported data | Everything | — | — |
| MapLibre GL JS | Map rendering | ✅ In production | ✅ npm | — | ✅ | BSD-3 | Real route/stop geometry | Search results, Active Journey, Deviation | Tile provider is external | Production tile key or self-host tiles |
| Stadia Maps (raster tiles) | Basemap tiles | ✅ Demo tier | — | Free key on signup (none used in demo) | ✗ (CDN) | Provider terms (attribution shown) | Egypt tiles | MapPanel | Demo-tier limits | Register production key via env |
| **OSRM v26.9 (self-hosted)** | Road routing: route/nearest/table/match (foot profile) | ✅ In production | ✅ native binaries | — | ✅ (storage/app/osrm) | BSD-2-Clause | Egypt OSM extract (ODbL) | RoadAwareWalkingService | — | Map-match GPS traces (match service verified) |
| **Photon (geocoding)** | Arabic/Latin place autocomplete | ✅ In production (public instance, proxied) | ✗ (keyless HTTP) | — | Public now; self-host needs Java 21 + Nominatim index | Apache-2.0 | Real OSM Egypt places (Arabic verified live) | GET /places/search → LocationPicker | Public-instance fair use (cache 60 min + throttle 10/min applied) | Self-host with Java 21 for production |
| **Mobility Database mdb-3355** | Greater Cairo buses/paratransit GTFS | ✅ Imported | ✅ | — | ✅ (imported) | CC-BY-NC-SA-2.0 | 1,011 routes, 2,997 stops, 44,743 stop times | Planner, map, analytics | Historical calendar → documented demo window | Refresh via `gtfs:import` |
| **Mobility Database mdb-3354** | Official Cairo Metro GTFS (NAT) | ⚠️ Adopted (fares + verification) | ✅ downloaded+inspected | — | ✅ (source zip) | T4C data terms (CC-BY-NC-SA family) | Lines 1–2, 108 stops, real fare_attributes | Fare reference + schedule verification | Full import would duplicate OSM-derived Lines 1–2; lacks Line 3 | Fare-table schema if real fares become a feature |
| OSM (Overpass + Geofabrik PBF) | Metro topology, road network | ✅ In production | ✅ (egypt.osm.pbf) | — | ✅ | ODbL | Cairo Metro lines 1–3, all roads | OSRM graph, metro import | Metro geometry is station-to-station | Way-level geometry import |
| **GTFS-Realtime ingestion** | Future live feeds (vehicle positions, trip updates, alerts) | 🧪 Interface ready, INERT | ✅ (service + command + tests) | — (feed-dependent) | ✅ (config-driven) | Own code (MIT project) | **No Egyptian GTFS-RT feed exists (verified)** | `gtfsrt:fetch` | No feed to consume today | Point `GTFS_RT_URL` at a future feed |
| OpenTripPlanner 2 | Multimodal GTFS+OSM routing | 🔍 EVALUATE (not adopted) | ✗ | — | Possible (Java 17 present; runbook in research doc) | LGPL-2.1 | Compatible (our GTFS+PBF) | — | Would strand Wasel's deviation/recovery domain logic | Supervised PoC benchmark only, if requested |
| Valhalla | Routing/matching/isochrones | ❌ REJECTED | ✗ | — | ✗ (no Windows native, no Docker; WSL possible) | BSD-2-Clause | Compatible | — | Second routing runtime for unused capabilities | Revisit if isochrones become a feature |
| Google Places / Geocoding / Roads / Elevation / Air Quality | Location search, matching, elevation, air quality | ❌ REJECTED | ✗ | Required (+billing) | Cloud | Google ToS | Yes | — | No project billing account; Photon+OSRM cover the same needs keylessly | Revisit if team registers billing |
| WeatherAPI (weather-aware walking) | Walk-time comfort adjustment | ❌ REJECTED (documented) | ✗ | Required | Cloud | Provider terms | Egypt coverage exists | — | No key; marginal, speculative feature | If adopted: key in env, deterministic walk penalty in scorer, feature-flagged |
| Transitland API | Feed discovery | ❌ REJECTED | ✗ | — | Cloud | — | — | — | v1 API shut down; superseded by Mobility Database | — |
| otp-react-redux / otp-ui / Digitransit UI | Transit UI kits | ❌ REJECTED | ✗ | — | — | Mixed OSS | — | — | Coupled to OTP data shapes; would replace the approved design system | — |

## Verified live this effort (2026-09-07)

- **Arabic geocoding end-to-end**: typed `ميدان التحرير` / `جامعة القاهرة` in the
  planner → proxied through `GET /api/v1/places/search` → geocoded
  coordinates → real journey options (Tahrir Square → Cairo University,
  3 options). Cached server-side (60 min) + throttled (10/min/IP).
- **OSRM services**: route (493 m / 359 s foot), nearest (snaps to
  "ميدان التحرير", 39 m), table, match (5-point trace) — all `Ok`.
- **GTFS-RT parser**: 6 binary-fixture tests (Translation nesting,
  TimeRange tags, route/stop entity selectors, inert-when-unconfigured,
  fetch-failure safety).
- **Data quality**: `transit:quality-report` — CRITICAL 0, WARNINGS 2 over
  3,025 stops / 1,014 routes / 1,792 schedules / 44,967 route stops.
