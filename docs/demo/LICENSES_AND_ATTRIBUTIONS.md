# Licenses and Attributions — Wasel Egypt

**Last updated:** 2026-09-06

Wasel Egypt is a non-commercial graduation project. Every external
component, library, dataset and tile source is listed here with its license
and the attribution we display in the product.

---

## 1. Datasets

| Dataset | Provider | License | Attribution shown |
|---|---|---|---|
| Greater Cairo GTFS (mdb-3355) | Transport for Cairo / Mobility Database | CC-BY-NC-SA-2.0 | Landing footer: "Transit data © Transport for Cairo (CC-BY-NC-SA)" |
| Cairo Metro lines/stations | OpenStreetMap contributors | ODbL-1.0 | Landing footer + map attribution: "© OpenStreetMap contributors" |
| Map tiles | OpenStreetMap raster tiles (default provider configurable via `VITE_MAP_TILES_URL`) | ODbL-1.0 | MapPanel attribution control |

**Compliance notes**

- CC-BY-NC-SA-2.0: use is non-commercial (graduation project ✔);
  attribution required (footer ✔); share-alike applies to the derived
  schedule dataset — derived data is stored in the project DB and its
  provenance documented in [DATA_PROVENANCE.md](data/DATA_PROVENANCE.md).
- ODbL: OSM-derived station coordinates/geometry are stored for the demo;
  they are not redistributed as a standalone database. Attribution is shown
  in the map and footer.
- The T4C feed's service calendar is historical (2025); Wasel anchors it to
  a documented demo window and never labels it "live" — see provenance doc.

## 2. Backend (Composer)

| Package | License |
|---|---|
| Laravel Framework | MIT |
| Laravel Sanctum | MIT |
| GuzzleHTTP (transitive) | MIT |

## 3. Frontend (npm)

| Package | License |
|---|---|
| react / react-dom | MIT |
| react-router-dom | MIT |
| maplibre-gl | BSD-3-Clause |
| vite / @vitejs/plugin-react | MIT |
| vitest / @testing-library/react | MIT / BSD-style |
| jsdom (test env) | MIT |

## 4. Map tile provider

Default tile URL is configurable through `VITE_MAP_TILES_URL`. The demo
default is **OpenStreetMap standard raster tiles** (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`,
ODbL — attribution shown in the map's compact attribution control). A
previous Stamen Toner Lite endpoint was retired because it now requires a
provider API key (401 without one). Production deployment with heavy
traffic must either register a provider API key via env (never hardcode)
or self-host tiles (e.g. tileserver-gl with OSM data). MapLibre GL JS
itself is BSD-3-Clause and imposes no tile obligations; the tile
provider's terms apply. NOTE: MapLibre raster sources do not expand
Leaflet's `{r}` retina token — tile URLs must use plain `{z}/{x}/{y}`.

## 5. Fonts

Cairo typeface (Google Fonts) — SIL Open Font License 1.1. Served via
Google Fonts CDN with `display=swap`.

## 5b. Road routing engine (adopted Phase C, 2026-09-06)

| Component | License | Notes |
|---|---|---|
| OSRM backend (v26.9.0, self-hosted) | BSD-2-Clause | http://project-osrm.org — self-hosted with the foot profile over OSM data; the public demo server is NOT used (car-profile answers + terms forbid production use). See docs/architecture/OSRM_SETUP.md. |

## 5c. Integration effort additions (2026-09-07)

| Component | License | Notes |
|---|---|---|
| Photon (geocoder, public instance photon.komoot.io) | Apache-2.0 (software); results derive from OSM (ODbL) | Proxied server-side via GET /api/v1/places/search; cached 60 min/query + throttled 10/min/IP per fair use. Self-host path documented (Java 21 + Nominatim index). |
| GTFS-Realtime wire-format reader (own code in GtfsRealtimeService) | Project license (MIT) | Dependency-free protobuf wire reader for the ServiceAlert subset; official google/gtfs-realtime-bindings rejected (needs protobuf PECL extension absent from XAMPP). Inert until a feed URL is configured. |
| mdb-3354 Cairo Metro GTFS (Transport for Cairo) | CC-BY-NC-SA-2.0 (T4C data terms) | **Fare matrix ADOPTED (Phase TFC1, 2026-09-08)**: fare_attributes/fare_rules → `system_config['tfc_metro_fares']` (Oct-2024 values 8/10/15/20 EGP, 53 stations L1+L2) consumed by FareEstimator for pure-metro journeys. Network data still NOT bulk-imported (would duplicate OSM-derived Lines 1–2; lacks Line 3). |
| TfC Digital Cairo 2017 — GTFSfullworking_Bus_Metro (github.com/transportforcairo/Transit---GCR-Digital-Cairo-2017-) | CC BY-NC 4.0 | Fare matrix ARCHIVED as fallback only (June-2018 values 3/5/7 EGP, 61 stations; `tfc:fare-import --legacy2018`). Not the active fare source. |

## 6. Not adopted (with reasons)

- **OpenTripPlanner / Valhalla / OSRM as services**: rejected for V1 —
  operational overhead for a local demo unjustified vs. the enhanced custom
  planner (documented in docs/architecture/UPGRADED_SYSTEM_ARCHITECTURE.md).
- **Transitland**: rejected — aggregator role fully covered by the
  Mobility Database.
- **No AI/ML components** — all planning, scoring and deviation logic is
  deterministic and explainable.

## 7. Attribution text blocks

**Landing footer (already implemented):**

> Transit data © Transport for Cairo (CC-BY-NC-SA)
> Map data © OpenStreetMap contributors

**Required on any public deployment:**

> "Wasel Egypt" and derived transit data: transit schedules derived from
> Transport for Cairo's GTFS feed (CC-BY-NC-SA-2.0) and OpenStreetMap
> (ODbL). Cairo Metro times are derived from published operating patterns
> and are not official real-time information.
