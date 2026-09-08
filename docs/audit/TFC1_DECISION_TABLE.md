# TFC1 Decision Table — Transport for Cairo Integration

Auditor: Wasel Egypt Phase TFC1 (2026-09-07/08) — INSPECT → COMPARE → DECIDE

## Repositories investigated (20, full org sweep via GitHub API)

| Repo | What it is | Freshness | License | Classification | Justification |
|------|-----------|-----------|---------|----------------|---------------|
| **Transit---GCR-Digital-Cairo-2017-** | 2018 GTFS (Bus+Metro+Paratransit) **with fare_attributes.txt + fare_rules.txt** + GIS shapefiles | 2020-03 (data: 2018) | CC BY-NC 4.0 | **PARTIAL IMPORT (fares only)** | Only public source of real Cairo fare data found: 61-station metro origin-destination matrix, M_1=3 / M_2=5 / M_3=7 EGP. Feed itself (2018) is a stale subset of what Wasel already has from mdb-3355 (2026) — only the fare matrix has value Wasel lacks. |
| **GCR-Transit-Data** | 2019 GTFS CTA-Paratransit (7 agencies, 602 routes, 2,222 stops, 181k shapes, frequency-based) + GIS Stops/Trips shapefiles | 2020-03 | CC BY 4.0 (World Bank project) | **REJECT (network data)** | Wasel's mdb-3355 (fetched 2026-07) is the *same TfC GCR feed family*, newer version, already imported (3,025 stops / 1,014 routes). Re-importing 2019 would be a regression (602 routes vs 1,014; 2,222 stops vs 3,025; 2019 calendar windows). |
| **Metro-GTFS** | 2016 metro-only GTFS (189 platform stops, 6 trips, frequency-based) | 2016-10 | CC BY-NC 4.0 | **REJECT** | Fully superseded: Wasel metro comes from OSM 2026 (3 lines, 86 stations, newer than 2016 Line-3 state). README itself says "all schedule data are estimations". No fare files. |
| tfc_tools | QGIS plugin suite (gis2gtfs, flow estimation) | 2026-07 | GPL-2.0 | **RESEARCH ONLY** | Desktop GIS tooling for producing feeds; Wasel consumes finished feeds via its own importer. No importable data. |
| route-id-editor | DuckDB/GeoParquet SDI GeoPackage → AMUGA route IDs + validated GTFS | 2026-07 | NOASSERTION | **RESEARCH ONLY** | Pipeline tooling for TfC's internal SDI; the AMUGA feed it emits is Abidjan (AMUGA = Abidjan), not Cairo. No public Cairo dataset inside. |
| loom_qgis / loom_binaries / loom-windows-port | LOOM transit map generation suite (QGIS plugin + Windows port) | 2026-05..08 | GPL-3.0 | **RESEARCH ONLY (viz)** | Generates schematic transit maps. Wasel already has its MapLibre rendering with real geometry; LOOM is an alternative renderer, not a data source. Replacing MapLibre is out of scope (baseline rule). |
| mobile_otp_viewer | Portable OTP 1.4.0 bundle — **Abidjan** data | 2026-03 | none (bundle) | **REJECT** | Different city (Abidjan, Côte d'Ivoire — AMUGA project). Contains Abidjan OSM+GTFS only. |
| Transit…Digital Cairo GIS shapefiles (Stops/Trips .shp) | 2017-2018 GIS layers | 2018 | CC BY-NC 4.0 | **REJECT** | Same vintage as rejected GTFS; Wasel already has per-variant geometry for all 1,792 variants from mdb-3355 shapes.txt (quality report: 1,792/1,792 with geometry, 0 critical). Shapefiles would not improve anything measurable. |
| ivy | Video-based vehicle counting (computer vision) | 2020-05 | MIT | **REJECT** | Traffic counting research tool; no transit data, no integration point for Wasel's scope. |
| wri-numo_access-analysis | Accessibility study scripts (R/Python, hexgrids) | 2023-05 | none | **RESEARCH ONLY** | Analysis methodology for access studies; not a data source. Could inspire future analytics phase. |
| simwrapper | Data viz framework fork | 2025-09 | GPL-3.0 | **REJECT** | Generic viz dashboarding; Wasel admin analytics already implemented. |
| matsim-libs / eqasim-java | Agent-based transport simulation | 2025-09 | GPL-2.0 | **REJECT** | Simulation frameworks, far outside Wasel's product scope. |
| geonode / geonode-docker / postgis-docker / graphhopper-map-matching-docker / shp-write / country-to-bbox / loom_binaries | Infrastructure forks & micro-utilities | 2021-2026 | MIT/GPL | **REJECT** | Forks of upstream infra; no Cairo data. |

## Fare investigation (exhaustive, per source)

Searched keywords across all 20 repos + both GTFS bundles: `fare_attributes`, `fare_rules`, `fare_products`, `fare_leg_rules`, `fare_media`, `fare_transfers`, `transfers.txt`, plus README/LICENSE mentions.

**Findings:**
- **Digital Cairo 2017 `20180906_GTFSfullworking_Bus_Metro`: HAS fare_attributes.txt + fare_rules.txt.**
  - `fare_attributes`: M_1=3 EGP, M_2=5 EGP, M_3=7 EGP, agency NAT (metro), payment_method=1.
  - `fare_rules`: 3,658 origin→destination pairs covering **61 metro stations** (complete 61×61 matrix, both directions, includes reverse pairs).
  - Semantics: Cairo Metro's 2018 zonal fare structure (3 EGP short hop / 5 EGP medium / 7 EGP full-line).
  - README: "including the new fare structure accurate as of June 2018".
- GCR-Transit-Data 2019: NO fare files (404 on all fare_* + transfers).
- Metro-GTFS 2016: NO fare files.
- All other repos: no transit fare data (not data repos).
- Bus/minibus/paratransit fares: **NOT present anywhere in the org** — fare_rules rows are 100% metro (verified: 0 non-metro rows).

**Caveat (documented, honest):** fares are June-2018 values. Cairo Metro fares changed since (2021: 5/7/10 EGP era). Wasel will display them labeled as historical TfC data, NOT as current prices — display string will carry no claim of current accuracy, provenance recorded. DO NOT invent newer prices.

## Stop-identity comparison (TfC 2018 stations vs Wasel metro stops)

- TfC unique parent stations: 65 (61 in fare matrix + Line-3 2018 platforms).
- Coordinate match (haversine) to nearest Wasel metro stop:
  - 60/65 within 150m; 63/65 within 200m.
  - Remaining: Shubra El-Kheima→Moassasa 231m (OSM places the station node slightly off; same station), Abbassiya→Abbaseya 456m (TfC node position vs OSM entrance; same station).
  - Fare-matrix stations (61): 59 match ≤200m, 2 match ≤500m with unambiguous 1:1 nearest candidates.
- **Decision: match by nearest-coordinate with 500m hard cap, deterministic (unique nearest), and record the TfC stop_id on the mapping.** The 61/61 mapping is complete and unambiguous.

## IMPORT decision (what is justified)

**IMPORT: metro fare matrix only** → stored as a new `system_config` row (`tfc_metro_fares_2018`) consumed by FareEstimator:
- Wasel already has: FareEstimator with graceful null fallback, scoring weight (0.10) that redistribulates when null, frontend fare badges/cards/detail fields. All render "—" today because `journey_fare_config` is absent.
- Fares are real, licensed (CC BY-NC 4.0 — non-commercial graduation project = compliant), and attributable.
- Minimal blast radius: one config row + FareEstimator gains a metro stop-pair lookup; planner/scoring/frontend untouched (they already consume `plan['fare']`).

**Fare scope decision (honesty):** metro legs only. Walking legs = 0. Bus/minibus/microbus legs = NOT priced (no source data exists — documented). Journeys with non-metro transit legs will show the metro portion only when a metro leg exists, and will NOT show a total that silently omits the unpriced legs' cost. Presentation: fare only emitted when ALL transit legs are metro (pure-metro journeys), OR per-leg metro fare is summed only over metro legs and response marks `partial: true` if other modes present. Simplest honest contract: emit fare only for journeys where every transit leg is metro; otherwise null. This prevents misleading totals. (Decision: pure-metro-only.)

**REJECT everything else** — see table. No new tables, no migrations, no new GTFS import, no MapLibre/tile changes, no planner changes.

## Baseline safety

- No API contract changes (fare field already exists in options payload).
- No frontend changes required for basic display (already implemented: `option.fare.amount / currency`).
- Command is idempotent (upsert by config_key), reversible (delete row), and provenance-logged to data_import_logs like existing imports.
