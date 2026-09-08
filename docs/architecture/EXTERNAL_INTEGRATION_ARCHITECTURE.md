# External Integration Architecture

**Date:** 2026-09-07 · Companion: `docs/integration/INTEGRATION_STATUS.md`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ React SPA (MapLibre, token CSS)                                          │
│   LocationPicker ──► GET /api/v1/places/search  (proxy + throttle)       │
│   Journey flows   ──► existing /api/v1/journeys/* contracts (unchanged)  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ HTTPS (Sanctum bearer / public)
┌────────────────────────────────▼─────────────────────────────────────────┐
│ Laravel API (business layer — unchanged owner of all domain logic)       │
│                                                                          │
│  PlaceGeocoderService        GtfsRealtimeService (inert w/o feed URL)    │
│   ├ driver: Photon public    ├ composer: gtfs-realtime-bindings          │
│   ├ cache 60min/query        ├ maps ServiceAlerts → service_alerts       │
│   ├ in-process memo          └ disabled until services.gtfs_rt.url set   │
│   └ graceful failure → []                                                │
│                                                                          │
│  RoadAwareWalkingService (routing adapter boundary)                      │
│   └ OSRM driver (foot profile) ── fallback: haversine ×1.3 circuity      │
│      [adapter seam: a Valhalla/OTP driver may be added without           │
│       touching the planner or domain services]                           │
│                                                                          │
│  JourneyPlannerService (deterministic, explainable — system of record)   │
│  DeviationDetection / Recovery / Trust / Analytics (untouched)           │
│  transit:quality-report (reads real DB state, no fabrication)            │
└───────┬───────────────┬──────────────────┬──────────────────────────────┘
        │               │                  │
┌───────▼─────┐  ┌──────▼───────┐  ┌───────▼─────────────────────────────┐
│ OSRM :5001  │  │ MySQL        │  │ External (keyless, cache+throttle)  │
│ foot profile│  │ wasel_egypt  │  │ photon.komoot.io (geocode)          │
│ egypt PBF   │  │ 3025 stops…  │  │ [future] GTFS-RT URL (config)       │
└─────────────┘  └──────────────┘  └─────────────────────────────────────┘
```

## Failure behavior per dependency

| Dependency | Failure mode | System behavior |
|---|---|---|
| OSRM down | HTTP refused (5s timeout) | Walking legs fall back to straight-line ×1.3 circuity; `walk_source: "estimate"`; search succeeds |
| Photon/Place geocoder down | HTTP refused (5s timeout) | `places: []` in response; stop autocomplete continues; UI shows stops only |
| GTFS-RT unconfigured (default) | — | Service inert; scheduled data flows exactly as before |
| GTFS-RT configured but feed down | logged warning | Previous alerts remain; no fabrication; scheduled data unaffected |
| Mobility Database unreachable | import-time only | Existing imported data unaffected; provenance retains source version |
| Tile provider down | raster tile errors | MapLibre renders vector overlays on background; UI notice |

## Security posture

- No external API keys exist in the adopted stack (Photon public + self-hosted OSRM are keyless). If a keyed provider is ever adopted, its key lives in `.env` and all calls are backend-proxied — never shipped to React.
- `GET /places/search` is throttled (10 req/min/IP) and cached (60 min/query) to respect Photon's fair-use policy.
- All external calls use 5s timeouts and safe-empty failures; TLS verification never disabled.
- Import commands log provenance (`data_import_logs`) with source, version, license.

## Routing adapter seam

`RoadAwareWalkingService` is the established adapter boundary (OSRM driver +
haversine fallback). The planner and domain services depend on its return
contract, not on OSRM itself — a Valhalla/OTP driver can be added behind the
same interface without touching `JourneyPlannerService`, deviation, or
recovery logic. OTP2 migration is deliberately NOT taken: it would strand
Wasel's deviation/recovery domain logic (the project's differentiator).
