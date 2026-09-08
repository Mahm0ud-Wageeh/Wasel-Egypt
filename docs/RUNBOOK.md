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

# 1.5 Serve the API — MULTI-WORKER (critical for concurrent requests)
PHP_CLI_SERVER_WORKERS=6 php artisan serve --host=127.0.0.1 --port=8000
```

> **Demo note:** `php artisan serve` defaults to ONE worker; the app makes
> concurrent requests (map tiles + notifications + search). Always set
> `PHP_CLI_SERVER_WORKERS=6` for development/demos. Production (nginx+fpm)
> is unaffected.

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
`VITE_MAP_TILES_URL` (defaults to Stadia demo tier — **register a free
production key** and set it before any public deployment).

## 5. Verification checklist

```bash
php artisan test                        # backend: 246 green
cd frontend && npx vitest run            # frontend: 65 green
npm run build                           # production build clean
php artisan transit:quality-report      # CRITICAL: 0
```

Live smoke: open `http://127.0.0.1:5174/` → search "ميدان التحرير" →
pick place → destination "29.9773, 31.1325" → Find journeys → 3 real
options → details → save → start → live tracking.

## 6. Known operational notes

- **Auth rate limits:** login/register are throttled 5/min (by design).
- **Planner cache:** `php artisan cache:clear` after any data import.
- **CORS:** dev origins are allow-listed in `config/cors.php`; add
  production origins via `CORS_EXTRA_ORIGIN_1/2` env vars.
- **Demo credentials** (seeded): `admin@example.com / password`,
  `moderator@example.com / password`.
- **T4C data license (CC-BY-NC-SA):** non-commercial use — attribution is
  rendered in the app footer; do not remove (see
  `docs/demo/LICENSES_AND_ATTRIBUTIONS.md`). Licensing follow-up is
  deliberately deferred per project-owner decision.
- **No GTFS-Realtime for Egypt exists** — the ingestion interface
  (`gtfsrt:fetch`) is inert until `GTFS_RT_URL` is set. Never fabricate.
