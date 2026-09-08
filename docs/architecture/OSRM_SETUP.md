# OSRM Setup — Self-Hosted Foot Routing Engine

**Component:** OSRM (Open Source Routing Machine) with the **foot** profile
over the Geofabrik Egypt OSM extract. Wasel uses it for road-aware walking
legs (distance, duration, road-following geometry).

- Engine: https://github.com/Project-OSRM/osrm-backend — BSD-2-Clause
- Profile: `profiles/foot.lua` (pedestrian rules: footways, crossings, steps)
- Data: Geofabrik Egypt extract — ODbL (© OpenStreetMap contributors)
- Port: `http://127.0.0.1:5001` (configurable via `OSRM_URL`)

## Architecture role

Laravel remains the business/API layer. `RoadAwareWalkingService`
(`app/Services/Journey/RoadAwareWalkingService.php`) calls OSRM over HTTP;
results are cached per coordinate pair (60 min). **If OSRM is down, the
planner silently falls back to straight-line estimates with a documented
×1.3 circuity allowance** — journey search never fails because of the
routing engine, and affected legs are marked `walk_source: "estimate"`.

## Local setup (Windows, native binaries — no Docker needed)

Binaries live in `storage/app/osrm/` (node_osrm v26.9.0 win32-x64 release):

```bash
cd storage/app/osrm

# 1. One-time data download (~178 MB Egypt extract)
curl -L -o egypt.osm.pbf https://download.geofabrik.de/africa/egypt-latest.osm.pbf

# 2. Build the foot-profile routing graph (extract → partition → customize)
./binding_napi_v8/osrm-extract.exe -p foot.lua egypt.osm.pbf
./binding_napi_v8/osrm-partition.exe egypt.osrm
./binding_napi_v8/osrm-customize.exe egypt.osrm

# 3. Run the HTTP server
./binding_napi_v8/osrm-routed.exe --algorithm mld -p 5001 egypt.osrm
```

Foot profile Lua dependencies (`profiles/lib/*.lua`) are already downloaded
into `storage/app/osrm/lib/`.

Linux/macOS equivalents: use the matching release binaries or
`docker run osrm/osrm-backend osrm-routed` with the same pipeline.

## Verification

```bash
# Walking speed sanity: ~1.4 m/s (NOT the 13 m/s car default!)
curl -s "http://127.0.0.1:5001/route/v1/foot/31.2357,30.0444;31.2315,30.0423?overview=full&geometries=geojson"
```

The public demo server (router.project-osrm.org) is **not used**: it routes
with the car profile regardless of the URL profile segment and its terms
prohibit production traffic — hence self-hosting.

## Failure behavior

| Scenario | Behavior |
|---|---|
| OSRM down / unreachable | `walkingRoute()` returns null; planner uses straight-line + ×1.3 circuity estimate; legs marked `estimate` |
| No pedestrian path between points (e.g. across the Nile with no bridge) | null → estimate fallback |
| Walk < 25 m straight-line | OSRM skipped entirely (no value added) |
| Slow response | 5 s HTTP timeout per call, results cached 60 min |

Set `OSRM_ENABLED=false` to force estimates (useful for benchmarking the
fallback path in isolation).
