# Wasel Egypt — From-Scratch Runbook

**Date:** 2026-09-07 · Goal: a new team member can run the whole project
by following this document alone.

## 0. Prerequisites

| Requirement | Notes |
|---|---|
| Windows 10/11 (or Linux equivalents) | XAMPP or PHP 8.2+ + MySQL/MariaDB |
| PHP >= 8.2 with `pdo_mysql`, `mbstring`, `zip`, `curl`, `openssl` | XAMPP default covers all |
| MySQL / MariaDB | any recent version |
| Node.js >= 18 (npm) | for the React frontend |
| Java 17+ | optional — only for OTP2 PoC |
| ~2 GB free disk | OSM extract + OSRM graph + GTFS sources |

## 1. Backend

```bash
# 1.1 Get the repo and install PHP deps
cd "Wasel Egypt"
php composer.phar install

# 1.2 Configure environment
copy .env.example .env        # then edit DB_* to your MySQL creds
# Required keys already defaulted: DB, OSRM_URL, GEOCODING_URL
# GTFS_RT_URL / GTFS_RT_ENABLED stay empty/false (no Egyptian RT feed exists)

# 1.3 Create the database and run migrations
php artisan key:generate
# mysql: CREATE DATABASE wasel_egypt;
php artisan migrate --force

# 1.4 Seed reference data (governorates, roles, permissions, modes, operators)
php artisan db:seed --force

# 1.5 Serve the API (native Windows: single worker)
php artisan serve --host=127.0.0.1 --port=8000
```

On Linux/WSL, use `PHP_CLI_SERVER_WORKERS=6 php artisan serve --host=127.0.0.1 --port=8000`
for concurrent development requests. PHP's worker mode is not supported on native
Windows: run verification sequentially there. Production uses nginx/PHP-FPM,
not `artisan serve`. Map tiles are fetched from the tile provider, not Laravel.

## 2. Real transit data (one-time import)

```bash
# 2.1 GTFS — Greater Cairo buses/paratransit (mdb-3355)
php artisan gtfs:import storage/app/gtfs-sources/mdb-3355-latest.zip \
  --source-name=mobilitydb:mdb-3355 \
  --source-url=https://mobilitydatabase.org/feeds/gtfs/mdb-3355 \
  --source-version=<dataset-timestamp> \
  --license=CC-BY-NC-SA-2.0 \
  --service-start=2026-09-01 --service-end=2027-09-01 \
  --agency-mode-map='{"CTA":"bus","CTA_M":"minibus","MM":"bus","GRN":"bus","LTRA_M":"minibus","P_O_14":"microbus","P_B_8":"microbus","COOP":"minibus","BOX":"microbus","PGT":"microbus","NAT":"metro"}'

# 2.2 Cairo Metro — OSM relations (Lines 1–3)
php artisan osm:metro-import --service-start=2026-09-01 --service-end=2027-09-01

# 2.3 Cairo Metro fares — mdb-3354 fare matrix (Oct-2024 values, Phase TFC1)
#    reads the archived copy at storage/app/gtfs-sources/mdb-3354 by default
php artisan tfc:fare-import
#    fallback matrix (June-2018 values) if ever needed:
#    php artisan tfc:fare-import --legacy2018

# 2.4 Verify data quality (real numbers, no fabrication)
php artisan transit:quality-report
```

Full provenance and license obligations: `docs/data/DATA_PROVENANCE.md`.
Fare audit trail (sources searched, what was rejected and why): `docs/audit/TFC_INTEGRATION_AUDIT.md`.

## 3. OSRM — self-hosted road routing (walking legs)

Binaries are vendored in `storage/app/osrm/` (node_osrm v26.9.0 win32-x64,
BSD-2-Clause). Full guide: `docs/architecture/OSRM_SETUP.md`. Summary:

```bash
cd storage/app/osrm
# one-time (already done in the repo: egypt.osm.pbf + built graph exist)
# ./binding_napi_v8/osrm-extract.exe -p foot.lua egypt.osm.pbf
# ./binding_napi_v8/osrm-partition.exe egypt.osrm
# ./binding_napi_v8/osrm-customize.exe egypt.osrm

# run the routing server
./binding_napi_v8/osrm-routed.exe --algorithm mld -p 5001 egypt.osrm
```

Sanity check (expect ~1.37 m/s walking):
`curl "http://127.0.0.1:5001/route/v1/foot/31.2357,30.0444;31.2315,30.0423?overview=false"`

## 4. Frontend

```bash
cd frontend
npm install
npm run dev        # Vite on 127.0.0.1:5173 (auto-increments if taken)
# production build:
npm run build       # outputs dist/ with PWA manifest + service worker
```

`.env` (frontend): `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`,
`VITE_MAP_TILES_URL` defaults to keyless OpenStreetMap standard raster
(Stadia's endpoint now requires an API key and returns 401 without one).
Configure a provider-authorized production URL before public deployment
at real traffic volume, for example:

```dotenv
VITE_MAP_TILES_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
# or: VITE_MAP_TILES_URL=https://tiles.example.com/your-style/{z}/{x}/{y}.png?api_key=YOUR_PRODUCTION_TILE_KEY
```

This is a placeholder, not a working key. Vite variables are public browser
configuration: use provider-side domain restrictions and never put private
credentials in them. Rebuild the frontend after changing them. Do not add a
Leaflet retina placeholder. Keep the service worker app-shell-only: never cache
API responses or map tiles.

## 5. Verification checklist

```bash
php artisan test                        # record fresh passed/failed totals
cd frontend && npx vitest run            # record fresh passed/failed totals
npm run build                           # production build clean
php artisan transit:quality-report      # CRITICAL: 0
```

Live smoke: open `http://127.0.0.1:5173/` → search "ميدان التحرير" →
pick place → destination "29.9773, 31.1325" → Find journeys → 3 real
options → details → save → start → live tracking.

## 6. Known operational notes

- **Rate limits:** login/register are throttled at 5 requests/minute;
  `/api/v1/places/search` at 10/minute. Respect HTTP 429 responses during checks.
  Route declarations in `routes/api.php` are the source of truth.
- **Planner cache:** `php artisan cache:clear` after any data import.
- **CORS:** configure the exact production SPA origin (scheme, host and port)
  using `CORS_EXTRA_ORIGIN_1` and, if needed, `CORS_EXTRA_ORIGIN_2` in the backend
  environment. Refresh cached configuration after deployment. A single
  `CORS_EXTRA_ORIGIN` variable is not consumed by this project.
- **Production accounts:** change all seeded administrator and moderator default
  passwords before public access. Never commit production passwords or keys.
- **Fare refresh:** `php artisan tfc:fare-import --dry-run` validates the archived
  mdb-3354 source; `php artisan tfc:fare-import` re-imports it idempotently and logs
  provenance. Re-importing the same archive does not make its fares current:
  they remain recorded October 2024 prices. A genuinely newer feed requires
  verified provenance/date support in the import command before use. Do not
  enable `--legacy2018` for the active demo or invent ground fares.
- **Stale development servers (Windows):** stop the project terminals first.
  Inspect the process listening on 8000/5173 with
  `Get-NetTCPConnection -State Listen -LocalPort 8000,5173`, then inspect its
  `OwningProcess` with `Get-Process -Id <PID>`. Stop only the confirmed stale
  project process with `Stop-Process -Id <PID>` (use `-Force` only if needed).
  Restart plain `php artisan serve --host=127.0.0.1 --port=8000` from the root
  and `npm run dev -- --strictPort` from `frontend/` in separate terminals.
  Confirm OSRM on 5001, run `php artisan cache:clear`, then probe the API.
  Do not terminate unrelated Node/PHP processes.
- **T4C data license (CC-BY-NC-SA):** non-commercial use — attribution is
  rendered in the app footer; do not remove (see
  `docs/demo/LICENSES_AND_ATTRIBUTIONS.md`). Licensing follow-up is
  deliberately deferred per project-owner decision.
- **No GTFS-Realtime for Egypt exists** — the ingestion interface
  (`gtfsrt:fetch`) is inert until `GTFS_RT_URL` is set. Never fabricate.
