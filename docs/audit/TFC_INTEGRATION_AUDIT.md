# TFC Integration Audit — Phase TFC1

**Date:** 2026-09-07/08 · **Auditor pass:** INSPECT → COMPARE → DECIDE → IMPLEMENT → TEST → BROWSER VERIFY → DOCUMENT

## 1. Repositories investigated (20 — full org sweep, transportforcairo)

| # | Repo | Purpose | Freshness | License | Classification |
|---|------|---------|-----------|---------|----------------|
| 1 | GCR-Transit-Data | 2019 GTFS CTA-Paratransit (602 routes, 2,222 stops, 181k shapes) + GIS shapefiles | 2020-03 | CC BY 4.0 | REJECT (network) — stale subset of Wasel's mdb-3355 (2026) |
| 2 | Metro-GTFS | 2016 metro GTFS (189 platforms, 6 trips) | 2016-10 | CC BY-NC 4.0 | REJECT — superseded by OSM 2026 metro; no fares; README admits estimated schedules |
| 3 | Transit---GCR-Digital-Cairo-2017- | 2018 Bus+Metro GTFS **with fare files** + GIS | 2020-03 | CC BY-NC 4.0 | **VALIDATION/BACKUP fare source** — 61-station complete matrix (3/5/7 EGP, June 2018) |
| 4 | tfc_tools | QGIS plugin suite (gis2gtfs, flow estimation) | 2026-07 | GPL-2.0 | RESEARCH ONLY (tooling) |
| 5 | route-id-editor | DuckDB/GeoParquet SDI→GTFS pipeline | 2026-07 | NOASSERTION | RESEARCH ONLY — emits **Abidjan** (AMUGA) data, not Cairo |
| 6 | loom_qgis | QGIS plugin wrapping LOOM map suite | 2026-08 | GPL-3.0 (+LOOM © Univ. Freiburg) | RESEARCH ONLY (viz) — alternative renderer, MapLibre stays |
| 7 | loom_binaries | Pre-built LOOM binaries | 2026-05 | GPL-3.0 | REJECT (viz infra) |
| 8 | loom-windows-port | LOOM Windows build | 2026-05 | GPL-3.0 | REJECT (viz infra) |
| 9 | mobile_otp_viewer | Portable OTP for **Abidjan** | 2026-03 | none | REJECT — wrong city |
| 10 | shp-write | JS shapefile writer | 2023-05 | BSD-3 | REJECT (micro-utility) |
| 11 | simwrapper | Data viz framework | 2025-09 | GPL-3.0 | REJECT (generic viz) |
| 12 | matsim-libs | Agent-based simulation | 2025-09 | GPL-2.0 | REJECT (simulation framework) |
| 13 | eqasim-java | MATSim extensions | 2025-09 | GPL-2.0 | REJECT (simulation) |
| 14 | wri-numo_access-analysis | Accessibility study code | 2023-05 | none | RESEARCH ONLY (methodology) |
| 15 | geonode | GeoNode platform fork | 2021-10 | NOASSERTION | REJECT (infra fork) |
| 16 | geonode-docker | GeoNode docker | 2021-10 | MIT | REJECT (infra) |
| 17 | postgis-docker | PostGIS docker | 2021-05 | MIT | REJECT (infra) |
| 18 | graphhopper-map-matching-docker | GH map matching | 2021-03 | MIT | REJECT (infra) |
| 19 | country-to-bbox | JS bbox util | 2022-06 | MIT | REJECT (micro-utility) |
| 20 | ivy | Video vehicle counting | 2020-05 | MIT | REJECT (traffic CV research) |

## 2. Fare findings (exhaustive)

**Searched across all 20 repos + both GTFS bundles:** `fare_attributes`, `fare_rules`, `fare_products`, `fare_leg_rules`, `fare_media`, `fare_transfers`, `transfers.txt`, README/license text.

| Source | fare_attributes | fare_rules | Coverage | Prices | Status |
|---|---|---|---|---|---|
| **mdb-3354** (Mobility Database, TfC Cairo Metro GTFS v1.1.1, 2024-10-28; already archived locally since Phase C) | M_1=8, M_2=10, M_3=15, M_4=20 EGP (agency NAT) | 6,766 rows | 53 stations (Lines 1+2 complete), 2,756 ordered pairs (=53×52, complete at station level) | **Oct 2024** | **IMPORTED (primary)** |
| Digital Cairo 2017 `GTFSfullworking_Bus_Metro` | M_1=3, M_2=5, M_3=7 EGP | 3,658 rows | 61 stations (incl. 2018 Line-3 stub Attaba–Al-Ahram), complete symmetric | June 2018 | Archived (backup; `--legacy2018` option) |
| GCR-Transit-Data 2019 | none (404) | none | — | — | Absent |
| Metro-GTFS 2016 | none (404) | none | — | — | Absent |
| Bus/paratransit fares | — | — | **0 non-metro fare rules exist anywhere in the org** (verified: every fare row references metro stations) | — | Not available — never invented |

**Zone-id mechanics (mdb-3354):** each station has two zone_ids (one per direction platform). fare_rules rows reference either platform's zone, so the apparent zone-level directional asymmetry (3,500 one-way) cancels completely at station level — 53×52 = 2,756 ordered pairs, 0 gaps. Spot-verified: Helwan↔El-Marg = M_4 (20 EGP) both ways; Mar Girgis↔Saad Zaghloul = M_1 (8 EGP) both ways.

**Honesty labels:** fares carry `as_of: 2024-10` and a note that they are recorded source data, not current prices. 2018 matrix documented as fallback only.

## 3. Realtime findings

No GTFS-Realtime feed exists for Cairo in any TfC repo (no `.pb` files, no realtime URLs, no alert feeds). Wasel's existing `GtfsRealtimeService` (inert-until-configured) remains the correct posture. No changes.

## 4. GIS/map findings

GCR-Transit-Data and Digital Cairo 2017 ship Stops/Trips shapefiles (2017–2019, central Cairo focus). Wasel already has per-variant geometry for **1,792/1,792 variants** from mdb-3355 shapes.txt (quality report: 0 empty/single-point). The shapefiles would add nothing measurable — REJECT. LOOM is a schematic-map renderer — replacing MapLibre is out of scope. No tile/geometry changes made.

## 5. Wasel comparison (field level)

| Dimension | Wasel current | TfC source | Decision |
|---|---|---|---|
| Stops | 3,025 (mdb-3355 2026 + OSM metro) | 2,222 (2019) / 1,490 (2018) / 108 (mdb-3354 metro) | Keep current — strictly newer/larger |
| Routes | 1,014 | 602 (2019) / 258 (2018) | Keep current |
| Metro structure | OSM 2026: 3 lines, 8 variants, 86 station stops | mdb-3354: L1+L2 only (2024); 2017: L1+L2+L3-stub | Keep current; **station identity match via nearest-coordinate ≤500m** for fare mapping: 53/53 mdb-3354 stations matched, 61/61 2018 stations matched (of 65 parents) |
| Schedules | 1,792 frequency-based (real + NAT-derived metro) | frequency-based (same paradigm) | Keep current |
| Fares | absent (null → "—" in UI) | real metro O-D matrix (2024) | **IMPORT (this phase)** |
| Geometry | 1,792/1,792 variants with shapes | shapefiles 2017-19 | Keep current |

Identity mapping quality (mdb-3354 → Wasel): all 53 stations matched within 500m by nearest-coordinate; Wasel Line-3 2026 stations intentionally have no fare rows (honest null).

## 6. What was imported / rejected

**IMPORTED:** Cairo Metro fare matrix (mdb-3354, Oct 2024) as `system_config['tfc_metro_fares']` — single JSON row: 53 stations, 2,756 ordered pairs, 4 fare classes (8/10/15/20 EGP), full provenance metadata. Consumed by `FareEstimator`.

**Transformations:** (a) stops.txt zone_ids → station names → Wasel stop_ids via nearest-coordinate (≤500m, unique-nearest); (b) dedupe lowest-fare per ordered pair; (c) reverse-direction fill (defensive — proved unnecessary: matrix already complete at station level); (d) pure-metro journeys only — any non-metro transit leg ⇒ fare=null (no partial totals; bus/paratransit fares do not exist in any source).

**REJECTED:** every network dataset (older/duplicate of mdb-3355), all GIS shapefiles, all tooling/viz/simulation repos. Documented in §1.

## 7. Data count deltas

| Table | Before | After | Δ |
|---|---|---|---|
| transit_stops | 3,025 | 3,025 | 0 |
| routes | 1,014 | 1,014 | 0 |
| route_variants | 1,792 | 1,792 | 0 |
| schedules | 1,792 | 1,792 | 0 |
| stop_times / route_stops | 44,967 | 44,967 | 0 |
| route_geometry | 1,792 | 1,792 | 0 |
| system_config | 5 | 6 | +1 (`tfc_metro_fares`) |
| data_import_logs | 5 | 7 | +2 (fare imports 2024 + 2018-trial, append-only history) |

## 8. Product impact (end-to-end)

- FareEstimator: null → real metro fares. `plan['fare'] = {amount, currency:'EGP', source:'tfc_metro_fares'}` for pure-metro journeys; null otherwise (honest).
- Scoring: fare weight (0.10) now active when fares present; still redistributes to time when null.
- Frontend (no code change required): results cards show "· 8 EGP", details dialog shows "Fare: 3→8 EGP" row, why-ranked bar updated — all previously built fare-ready components now render real data.
- API contract: `fare` field shape unchanged (amount/currency + optional source tag).

## 9. Verification results

- Backend: **252/252 passed** (1,740 assertions) — 246 baseline + 6 new `TfcFareEstimatorTest`.
- Frontend: **65/65 passed**; production build clean (unchanged).
- `php artisan transit:quality-report`: **CRITICAL: 0** (unchanged, 2 pre-existing warnings).
- Reference searches (BEFORE → AFTER):
  - Mar Girgis→Saad Zaghloul: 3 options, metro direct fare null → **8 EGP** (M_1), duration/transfers unchanged; latency ~1.0s cold (vs 1.45s BEFORE — same ballpark; no regression).
  - Helwan→Tahrir: 3 options, metro full-line fare null → **15 EGP**; mixed metro+bus option null (correct — not pure metro).
  - Tahrir→Giza: 3 options, all mixed-mode → fare null in BEFORE and AFTER (correct — no bus fare data exists).
- Browser (MapLibre + fare UI): results card shows "8 EGP" badge; details dialog Fare row "8 EGP"; flagship save→start→active-tracking loop re-verified working; map tiles 200; no new console errors (Vite HMR ws errors are dev-only, pre-existing).

## 10. Remaining gaps / limitations

1. Fares are Oct-2024 recorded values — Egypt's metro fares change; refresh = re-download mdb-3354 + `php artisan tfc:fare-import`.
2. Line 3's 2026 stations (Rod El-Farag branch etc.) have no fare rows (outside both matrices) → those journeys show null fare. The 2018 matrix's Line-3 stub (Attaba–Al-Ahram) was NOT used because its prices (3/5/7) are 6 years older than the primary matrix (would mix price eras dishonestly).
3. Bus/minibus/microbus/rail fares: **no source data exists anywhere** — documented, not invented.
4. No realtime/alert feeds exist for Cairo — documented.

## 11. Files changed this phase

- `app/Console/Commands/TfcFareImport.php` (new) — `tfc:fare-import [--files=] [--legacy2018] [--dry-run]`
- `app/Services/Journey/FareEstimator.php` — metro O-D matrix consumption, pure-metro honesty contract
- `tests/Feature/Journey/TfcFareEstimatorTest.php` (new) — 6 tests
- `storage/app/gtfs-sources/tfc-digital-cairo-2017/` (new archive: fare_attributes/fare_rules/stops/feed_info)
- `docs/audit/TFC1_DECISION_TABLE.md`, this file, `docs/data/DATA_PROVENANCE.md`, `docs/demo/LICENSES_AND_ATTRIBUTIONS.md`, `docs/RUNBOOK.md` (updates)
- DB: +1 system_config row, +2 data_import_logs rows (provenance). **No new tables, no migrations, no composer/npm dependencies.**
