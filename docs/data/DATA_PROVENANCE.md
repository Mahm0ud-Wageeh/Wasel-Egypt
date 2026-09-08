# Data Provenance — Wasel Egypt

**Last updated:** 2026-09-08

Every dataset inside Wasel Egypt is traceable to its source, license and
import date through the `data_import_logs` table and this document. Nothing
is presented as "live" or "official" that is not.

---

## 1. Datasets currently imported

### 1.1 Greater Cairo GTFS — Mobility Database mdb-3355

| Field | Value |
|---|---|
| Source | Transport for Cairo consolidated feed (successor of deprecated mdb-1825) |
| URL | https://mobilitydatabase.org/feeds/gtfs/mdb-3355 |
| Dataset used | mdb-3355-202607092128 (fetched 2026-07-09) |
| License | **CC-BY-NC-SA-2.0** — non-commercial use permitted (graduation project), attribution required, share-alike for derived datasets |
| Contents | 1,011 routes, 2,997 stops, 1,784 trips (frequency-based, 6,432 frequency rows), 44,743 stop times, 531,958 shape points, 10 active agencies |
| Agencies | CTA, CTA-licensed minibus, Mwasalat Misr, Green Bus, LTRA minibus, orange 14-seat microbus cooperative, blue 8-seat paratransit, grey 29-seat cooperative, Box paratransit, Peugeot |
| Validation | GTFS Validator v8.0.1: 0 errors, 8 warnings |
| Imported | 2026-09-06 via `php artisan gtfs:import` |
| Normalization applied | (a) **agency→mode mapping keyed on agency_id** (the feed uses route_type non-standardly: 0=paratransit, 1=formal road service); (b) **demo service window** re-anchored to 2026-09-01 → 2027-09-01 because the feed's calendar (Jan–Dec 2025) is historical — recorded in every schedule's `notes` as a demo window, never labeled "live"; (c) overnight GTFS times (>24h) wrapped modulo 24h; (d) shape geometry decimated to ≤400 points per variant |
| Integrity | Idempotent on `gtfs_stop_id` / `gtfs_route_id` / `gtfs_trip_id`; re-import updates, never duplicates; user content untouched |

### 1.2 Cairo Metro — OpenStreetMap

| Field | Value |
|---|---|
| Source | OpenStreetMap route relations (metro lines 1, 2, 3) via Overpass API |
| Relations | 421705/2826217 (Line 1), 421706/7927231 (Line 2), 2063304/7686561/17625744/17625746 (Line 3 incl. Rod El-Farag branch) |
| License | **ODbL-1.0** — attribution "© OpenStreetMap contributors" required; derived data stored internally, not redistributed |
| Contents | 3 lines, 8 directional variants (Line 3 has two legitimate branches), 28 new stations; 190 stations proximity-linked (≤150 m) to existing GTFS stops creating real bus↔metro interchanges |
| Schedules | **DERIVED, NOT OFFICIAL**: National Authority for Tunnels published operating pattern (service ~05:30–23:30; ~5 min peak / ~7 min off-peak / ~10 min evening headways) encoded as frequency windows. Every schedule row notes its derived nature. |
| Imported | 2026-09-06 via `php artisan osm:metro-import` |
| Station names | `name:en` preferred; native Arabic preserved in source |

### 2.1 Cairo Metro fares — Mobility Database mdb-3354 (Phase TFC1)

| Field | Value |
|---|---|
| Source | mdb-3354 (Cairo Metro GTFS, Transport for Cairo), feed v1.1.1 (2024-10-28) |
| URL | https://mobilitydatabase.org/feeds/gtfs/mdb-3354 |
| Files | fare_attributes.txt (M_1=8 / M_2=10 / M_3=15 / M_4=20 EGP, agency NAT), fare_rules.txt (6,766 zone pairs), stops.txt (station coordinates) |
| Coverage | 53 stations — Lines 1 + 2 complete; 2,756 ordered pairs (complete at station level) |
| As-of | **October 2024** — recorded TfC data, displayed as such; never claimed current |
| Fallback | TfC Digital Cairo 2017 matrix (June 2018, 3/5/7 EGP, 61 stations) archived at storage/app/gtfs-sources/tfc-digital-cairo-2017 (`--legacy2018`) |
| Normalization | zone_id → station name → Wasel stop_id by nearest-coordinate (≤500 m, unique-nearest); lowest fare per ordered pair; reverse-direction fill (defensive); **pure-metro journeys only** — any non-metro transit leg returns null (bus/paratransit fares exist in no source) |
| Stored as | `system_config['tfc_metro_fares']` (single JSON row: matrix + provenance) |
| Imported | 2026-09-08 via `php artisan tfc:fare-import` |
| Full audit | docs/audit/TFC_INTEGRATION_AUDIT.md |

---

## 2. Provenance tracking in the system

The `data_import_logs` table (migration `2026_09_06_020001`) records, per
import: source identifier, dataset URL, dataset version, license, the exact
normalization options applied (mode map, date window), imported row counts,
status and timestamp.

```
mysql> SELECT source, dataset_version, license, status, imported_at FROM data_import_logs;
+--------------------+---------------------+-----------------+----------+
| mobilitydb:mdb-3355| mdb-3355-202607092128 | CC-BY-NC-SA-2.0 | completed | ...
| osm:cairo-metro    | osm-2026-09-06      | ODbL-1.0        | completed | ...
+--------------------+---------------------+-----------------+----------+
```

## 3. Honest-data rules

1. **No synthetic data mixed into real feeds.** The GTFS feed and the OSM
   metro layer are imported as-is (with the documented normalizations only).
2. **Demo date normalization is explicit.** Schedules carry a note naming the
   demo window; the UI never claims real-time arrival data.
3. **Derived schedules are labeled.** Metro frequency windows are derived
   from published operating patterns, not an official GTFS feed — noted on
   every metro schedule row.
4. **Statistics shown in the product come from the live database** (landing
   page stop/route counts, alert lists, report feeds) — no fabricated
   numbers.
5. **Re-imports are idempotent and non-destructive** to user content
   (reports, favorites, journeys, trust).

## 4. Refresh procedure

```bash
# 1. GTFS (buses + paratransit)
php artisan gtfs:import <path-or-url-to-mdb-3355-zip> \
  --source-name=mobilitydb:mdb-3355 \
  --source-url=https://mobilitydatabase.org/feeds/gtfs/mdb-3355 \
  --source-version=<dataset-timestamp> \
  --license=CC-BY-NC-SA-2.0 \
  --service-start=2026-09-01 --service-end=2027-09-01 \
  --agency-mode-map='{"CTA":"bus","CTA_M":"minibus","MM":"bus","GRN":"bus","LTRA_M":"minibus","P_O_14":"microbus","P_B_8":"microbus","COOP":"minibus","BOX":"microbus","PGT":"microbus","NAT":"metro"}'

# 2. Metro (re-download from Overpass or pass --file with a saved response)
php artisan osm:metro-import --service-start=2026-09-01 --service-end=2027-09-01

# 3. Metro fares (mdb-3354 archive or a freshly downloaded copy)
php artisan tfc:fare-import            # 2024 matrix (8/10/15/20 EGP)
# php artisan tfc:fare-import --legacy2018   # 2018 fallback matrix (3/5/7 EGP)

# 4. Clear the planner network cache so it rebuilds from the new data
php artisan cache:clear
```
