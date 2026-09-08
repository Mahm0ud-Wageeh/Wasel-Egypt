# Open-Source Transit Solutions Research for Wasel Egypt

## Overview
This document researches open-source transit routing engines, map libraries, and data sources suitable for enhancing the Wasel Egypt transit platform. Each solution is evaluated based on official source, license, data/API license, maintenance, local requirements, cost, API keys, suitability for Wasel, exact integration point, and adoption recommendation.

---

## 1. OpenTripPlanner (OTP)

### Official Source
- Website: http://www.opentripplanner.org/
- GitHub: https://github.com/opentripplanner/OpenTripPlanner
- Documentation: http://docs.opentripplanner.org/

### License
- Apache License 2.0 (permissive open-source license)

### Data/API License
- Uses standard transit data formats (GTFS, OSM)
- No inherent restrictions on data usage beyond source data licenses

### Maintenance
- Active development community
- Regular releases (last release: 2023, with ongoing maintenance)
- Used by several transit agencies and municipalities worldwide

### Local Requirements
- Java 11+
- Memory-intensive (recommended 4GB+ RAM for moderate-sized regions)
- Requires pre-processing of GTFS and OSM data into a graph

### Cost
- Free to use (open-source)
- Infrastructure costs for deployment (server/memory)

### API Keys
- None required for core functionality
- May require API keys for external services (elevation, geocoding) if integrated

### Suitability for Wasel
- **High** - Specifically designed for multi-modal transit planning
- Supports GTFS (standard for Egyptian transit data)
- Can incorporate OSM data for walking/cycling routes
- Provides ISO 14895-compliant pedestrian routing
- Handles complex transfer rules and fare calculations

### Exact Integration Point
- Replace or supplement JourneyPlannerService in Laravel backend
- Could be deployed as a microservice consumed via API
- Integration point: `App\Services\Journey\JourneyPlannerService`

### Adoption Recommendation: **EVALUATE**
- Strong candidate for replacing custom journey planner
- Requires significant infrastructure investment (Java service)
- Would need to maintain compatibility with existing Laravel services
- Best for long-term scalability and advanced features

---

## 2. Valhalla (by Mapbox)

### Official Source
- Website: https://valhalla.github.io/
- GitHub: https://github.com/valhalla/valhalla
- Documentation: https://valhalla.github.io/valhalla/

### License
- BSD 3-Clause License (permissive open-source)

### Data/API License
- Works with GTFS, OSM, and custom data sources
- No inherent data license restrictions

### Maintenance
- Actively maintained by Mapbox and community
- Regular releases and issue resolution
- Used in production by various organizations

### Local Requirements
- C++14 compiler
- Moderate memory requirements (depends on region size)
- Requires building custom tiles from GTFS/OSM data

### Cost
- Free to use (open-source)
- Infrastructure costs for deployment
- Tile generation requires storage and compute

### API Keys
- None required for self-hosted instances
- Mapbox Valhalla API (hosted) requires API key

### Suitability for Wasel
- **High** - Specialized in pedestrian and transit routing
- Excellent multimodal routing capabilities
- Optimized for low-latency queries (<100ms typical)
- Supports transit schedules and transfers
- Good for pedestrian-focused routing in urban Egypt

### Exact Integration Point
- Similar to OTP: replace JourneyPlannerService
- Could be deployed as microservice
- Integration point: `App\Services\Journey\JourneyPlannerService`

### Adoption Recommendation: **EVALUATE**
- Excellent performance characteristics
- Requires C++ build environment and infrastructure
- May be lighter weight than OTP for Egypt-scale deployment
- Strong alternative to custom planner implementation

---

## 3. OSRM (Open Source Routing Machine)

### Official Source
- Website: http://project-osrm.org/
- GitHub: https://github.com/Project-OSRM/osrm-backend
- Documentation: http://project-osrm.org/docs/v5.24.0/api/

### License
- BSD 2-Clause License (permissive open-source)

### Data/API License
- Primarily designed for OSM data
- Can incorporate GTFS with preprocessing
- No inherent restrictions beyond source data licenses

### Maintenance
- Well-established project with stable releases
- Active maintenance and bug fixes
- Widely used in industry and research

### Local Requirements
- C++14 compiler
- High memory usage during preprocessing (RAM: 2-8x size of .osm.pbf)
- Lower memory usage for runtime serving

### Cost
- Free to use (open-source)
- Infrastructure costs for deployment
- Preprocessing can be computationally intensive

### API Keys
- None required for self-hosted instances
- Public OSRM demo servers have rate limits (not suitable for production)

### Suitability for Wasel
- **Medium** - Excellent for vehicle routing, less optimized for transit
- Primarily designed for car/truck/foot routing on road networks
- Transit support requires significant preprocessing workarounds
- Excellent for road-aware walking routes (uses OSM footways/crossings)
- Limited native transit schedule/time-table handling

### Exact Integration Point
- Could supplement journey planner for walking/cycling segments
- Integration point: `App\Services\Journey\JourneyPlannerService` (for walk/cycle legs)
- Would need to combine with transit-specific solution

### Adoption Recommendation: **REJECT** (for primary journey planning)
- Not optimized for transit scheduling and transfers
- Better suited as a walking/cycling routing engine complement
- Could be used for road-aware walking if transit handled elsewhere
- Primary journey planner should focus on transit-specialized solutions

---

## 4. MapLibre GL JS

### Official Source
- Website: https://maplibre.org/
- GitHub: https://github.com/maplibre/maplibre-gl-js
- Documentation: https://maplibre.org/maplibre-gl-js/docs/

### License
- BSD 3-Clause License (permissive open-source)

### Data/API License
- Renders vector/raster tiles from various sources
- Tile sources may have their own licenses (OSM, commercial providers)
- No inherent restrictions on the library itself

### Maintenance
- Fork of Mapbox GL JS v2.x (after Mapbox changed license)
- Actively maintained by community
- Regular releases and security updates
- Used by many organizations as Mapbox alternative

### Local Requirements
- JavaScript library (browser-based)
- Requires WebGL support in browser
- Moderate GPU/memory requirements for smooth rendering

### Cost
- Free to use (open-source)
- No licensing costs
- Tile serving costs depend on provider (free tiers available from some)

### API Keys
- None required for the library itself
- Tile providers may require API keys (e.g., Stadia Maps, Thunderforest)
- Free OSM tile servers available (with usage policies)

### Suitability for Wasel
- **High** - Excellent alternative to Mapbox GL JS
- Fully compatible with Mapbox GL JS API (easy migration)
- Supports vector tiles for smooth rendering and styling
- Good performance on mobile devices
- Allows custom styling to match Wasel Egypt design system

### Exact Integration Point
- Replace current mock MapPanel component
- Integration point: `frontend/src/components/map/MapPanel.jsx`
- Would require configuring tile source and style

### Adoption Recommendation: **ADOPT**
- Direct replacement for current mock map implementation
- Maintains same API as Mapbox GL JS (if currently considering that)
- No licensing costs
- Strong community support
- Enables real map functionality matching design specifications

---

## 5. Transitland / Mobility Database

### Official Source
- Website: https://transit.land/
- GitHub: https://github.com/transitland
- Documentation: https://docs.transit.land/
- Mobility Database: https://mobilitydatabase.org/

### License
- Various: Transitland tools mostly MIT, data depends on sources
- Mobility Database: CC0 1.0 Universal (public domain dedication) for compiled data

### Data/API License
- Aggregates GTFS, GTFS-Realtime, and other transit feeds
- Mobility Database provides cleaned, unified datasets
- Usage governed by original data source licenses
- Mobility Database compilations are CC0 (free to use)

### Maintenance
- Actively maintained project
- Regular updates to feeds and database
- Used by researchers, developers, and some transit agencies

### Local Requirements
- Varies by component:
  - Datastore: PostgreSQL + PostGIS
  - API: Node.js service
  - Can be run via Docker-compose
- Moderate resource requirements

### Cost
- Free to use (open-source tools)
- Infrastructure costs for self-hosting
- Mobility Database provides free downloads of regional/national extracts

### API Keys
- None required for self-hosted instances
- Transitland API (hosted) has free tier with rate limits
- Mobility Database downloads require no key

### Suitability for Wasel
- **High** - Excellent source for transit data in regions spotty GTFS coverage
- Mobility Database provides pre-compiled transit datasets
- Could supplement or verify Egyptian GTFS data
- Provides consistent identifiers across feeds
- Good for discovering available transit feeds in Egypt

### Exact Integration Point
- Data enrichment/validation layer
- Integration point: Could feed into GTFS import process
- `App\Services\Transit\GtfsImportController` or separate data validation service

### Adoption Recommendation: **EVALUATE**
- Valuable for data quality and coverage assessment
- Particularly useful if Egyptian GTFS data is incomplete or fragmented
- Mobility Database extracts could serve as baseline or validation source
- Requires evaluating actual Egyptian feed availability in the database

---

## 6. OpenStreetMap / Geofabrik

### Official Source
- OSM Website: https://www.openstreetmap.org
- Geofabrik Downloads: https://download.geofabrik.de/
- OSM Wiki: https://wiki.openstreetmap.org/
- Documentation: https://wiki.openstreetmap.org/wiki/Map_Features

### License
- Open Data Commons Open Database License (ODbL) 1.0
- Requires attribution and share-alike for derived databases
- Individual tiles/images may be CC-BY-SA 2.0 or similar

### Data/API License
- ODbL requires sharing-alike for substantial extracts
- Cartographic rendering (maps) has different terms
- OSM Foundation provides detailed licensing guidance

### Maintenance
- Massive global volunteer effort
- Continuous updates (minutely changes available)
- Quality varies by region (generally good in urban Egypt)
- Geofabrik provides regular extracts (typically weekly)

### Cost
- Free to download and use
- Attribution required per ODbL
- Infrastructure costs for hosting/serving extracts if needed

### API Keys
- None required for downloads
- OSM API (for editing) requires OAuth for write access
- Tile servers may have their own policies/keys

### Suitability for Wasel
- **High** - Essential for base map and walking/cycling routing
- Provides detailed road, footway, crossing, and public transport infrastructure
- Critical for road-aware walking routes and last-mile connectivity
- Egyptian coverage generally good in urban areas, improving elsewhere
- Can be used with Valhalla/OSRM/OTP for multimodal routing

### Exact Integration Point
- Base layer for map display (via MapLibre or similar)
- Routing graph input for pedestrian/cycling engines
- Integration points:
  - MapLibre: Tile source or vector tiles
  - Journey planning: OSM extract for walk/cycle legs
  - GTFS enhancement: OSM for stop location verification/improvement

### Adoption Recommendation: **ADOPT**
- Fundamental requirement for any serious transit application
- Provides essential geographic context
- Enables road-aware walking and precise stop placement
- Free with reasonable attribution requirements
- Should be core component of map and routing strategy

---

## 7. Strong Open-Source Transit UI Projects

### Survey of Notable Projects

#### A. Transitland React Components
- Source: https://github.com/transitland/transitland-react
- License: MIT
- Provides reusable React components for transit UIs
- Evaluation: Good for common patterns, but may not match Wasel's specific design

#### B. OpenTripPlanner UI (formerly TripGo)
- Source: Part of OTP project
- License: Apache 2.0
- Evaluation: Functional but dated UI; Would require significant theming to match Wasel

#### C. MobilityDB UI Components
- Source: Various community projects
- Evaluation: Limited availability; Mostly focused on backend/storage

#### D. Custom OSM-based Transit Apps
- Examples: Various city-specific transit apps using OSM + GTFS
- Evaluation: Show what's possible but rarely open-source complete solutions

### Assessment
- Few mature, production-ready open-source transit UI frameworks exist that match the sophistication of Wasel's approved design
- Most open-source transit UIs are either:
  1. Agency-specific and not easily generalizable
  2. Focused on specific functions (trip planning only) not full featured apps
  3. Lack the polish and mobile-first responsive design of Wasel's spec
- Recommendation: Continue with custom UI implementation following approved design spec
- Consider adopting specific UI components if they match requirements and quality

---

## Integration Recommendations Summary

### For Journey Planning Engine (High Priority)
1. **Primary Recommendation**: Evaluate OpenTripPlanner or Valhalla as replacement for custom JourneyPlannerService
   - OTP: Most feature-rich for transit, Java-based
   - Valhalla: Excellent performance, C++-based, strong pedestrian focus
   - Both would require microservice deployment and API integration layer

2. **Fallback**: Enhance current JourneyPlannerService with:
   - Better transit schedule interpolation (beyond synthetic fallback)
   - Improved transfer penalty modeling
   - Real-time delay incorporation (when available)

### For Mapping (High Priority)
1. **Adopt MapLibre GL JS** to replace current mock MapPanel
   - Provides real interactive maps
   - Matches design specifications through styling
   - Free and open-source
   - Well-maintained alternative to Mapbox GL JS

2. **Use OpenStreetMap (via Geofabrik extracts)** as base map data
   - Essential for accurate geography
   - Enables road-aware walking routes
   - Free with attribution requirement

### For Data Enhancement (Medium Priority)
1. **Evaluate Transitland/Mobility Database** for:
   - Validating Egyptian GTFS completeness
   - Supplementing spotty feed coverage
   - Providing consistent identifiers

### For Walking/Cycling Routing (Medium Priority)
1. **Consider OSRM or Valhalla** specifically for walk/cycle legs
   - If maintaining hybrid approach (custom transit + specialized walk/cycle)
   - Valhalla excels at pedestrian routing
   - OSRM excellent for pure road network routing

### UI Components
1. **Maintain custom implementation** following approved UI/UX design spec
2. **Evaluate specific component libraries** only if they:
   - Match Wasel's exact design requirements
   - Are actively maintained
   - Have MIT/BSD-style compatible licenses
   - Provide significant development time savings

---

## Risk Assessment

### Technical Risks
- **OTP/Valhalla Deployment**: Java/C++ infrastructure complexity vs current PHP Laravel
- **MapLibre Integration**: Learning curve for vector tile styling and performance optimization
- **Data Consistency**: Ensuring OSM, GTFS, and any external sources remain synchronized
- **Performance**: Ensuring routing response times meet UX requirements (<2s for search)

### Legal/Licensing Risks
- **OSM ODbL**: Must provide attribution and share-alike for substantial extracts
- **Compatibility**: All selected licenses (Apache 2.0, BSD, MIT) are commercially compatible
- **Data Sources**: Must verify licenses of any actual GTFS feeds obtained for Egypt

### Operational Risks
- **Infrastructure**: Increased operational overhead for new services
- **Expertise**: Team may need to learn Java/C++ for OTP/Valhalla maintenance
- **Updates**: Keeping external services updated with latest security patches

### Mitigation Strategies
- Start with MapLibre + OSM (lower risk, high immediate value)
- Pilot OTP/Valhalla in staging before production cutover
- Use Docker containers to isolate service dependencies
- Implement caching layers to reduce backend load
- Maintain ability to fall back to current implementation during transition

---

## Conclusion and Next Steps

### Immediate Actions (0-1 month)
1. **Adopt MapLibre GL JS** for frontend map replacement
2. **Integrate OpenStreetMap extracts** as base map layer
3. **Begin evaluating OTP and Valhalla** through proof-of-concept implementations
4. **Assess Transitland/Mobility Database** for Egyptian data coverage evaluation

### Medium-Term Actions (1-3 months)
1. **Select journey planning engine** (OTP vs Valhalla vs enhanced custom)
2. **Implement microservice wrapper** for chosen routing engine
3. **Integrate with Laravel backend** via service layer
4. **Validate with actual Egyptian GTFS/OSM data**

### Long-Term Actions (3-6 months)
1. **Optimize performance** and tuning for Egypt-specific usage patterns
2. **Add real-time capabilities** if GTFS-Realtime becomes available
3. **Consider contributions** back to open-source projects used

### Decision Framework
Adopt if: Solution provides clear value over current implementation, fits within technical capabilities, licensing compatible, and community/maintenance healthy.
Evaluate if: Solution shows promise but requires significant investment or has integration uncertainties.
Reject if: Solution doesn't solve Wasel's specific problems, creates unacceptable technical debt, or has incompatible licensing.

---
*Research conducted as part of Wasel Egypt frontend upgrade planning. All information subject to verification with actual implementation testing.*
---

## VERIFICATION ADDENDUM (2026-09-06)

Live verification superseded the "Egypt feed availability unknown" assumption above:

### ADOPTED: Mobility Database feed mdb-3355 (Transport for Cairo)
- **What**: Consolidated Greater Cairo GTFS Schedule feed — the direct successor of the historical Agyad feed (mdb-1825, deprecated).
- **Contents (verified by local inspection of the 2026-07-09 dataset)**: 11 agencies; 1,011 routes; 2,997 stops; 1,784 trips; 44,743 stop_times; 531,958 shape points; frequency-based service (6,432 frequency rows); 2 calendars (Daily, Weekdays).
- **Agency→mode reality**: CTA (244 routes), CTA_M minibus (107), Mwasalat Misr (18), Green Bus (2), LTRA_M (1) are formal scheduled services; P_O_14 orange microbus (511), P_B_8 blue 8-seater (70), COOP grey 29-seater (49), Box (9) are paratransit — the feed uses GTFS route_type non-standardly (0=paratransit, 1=formal), so **mapping must key on agency_id, not route_type**.
- **Cairo Metro**: agency NAT is registered but contributes **zero routes** — metro must come from OSM instead.
- **License**: CC-BY-NC-SA-2.0 — compatible with a non-commercial graduation project; requires attribution and share-alike for derived datasets (documented in docs/data/DATA_PROVENANCE.md).
- **Access**: no API key, direct zip: https://files.mobilitydatabase.org/mdb-3355/... (daily refresh). GTFS Validator v8.0.1: 0 errors, 8 warnings.
- **Caveat**: service calendar is historical (Jan–Dec 2025); demo operation requires a documented, clearly-flagged date normalization step (see data strategy).

### Verdicts carried forward
- MapLibre GL JS + OSM tiles: **ADOPTED** (already integrated in frontend).
- OSRM / Valhalla / OTP as separate services: **REJECT for V1** (ops overhead unjustified; planner enhancement path chosen instead — see architecture doc §3.2A).
- Transitland: **REJECT** (aggregator role fully covered by Mobility Database).
- OSM (Geofabrik/Overpass) for Cairo Metro lines + walking network: **ADOPT for metro extraction** (ODbL, attribution required).

---

## INTEGRATION RESEARCH ROUND 2 (2026-09-07) — Lead Integration Engineer

Live-verified verdicts for the Phase-1 candidate list. Baseline at research start: backend 232/0, frontend 64/0, search 1.60–1.84s, OSRM foot 2.5ms warm, Java 17 present, no Docker.

### Verdict table

| Technology | Verdict | Evidence |
|---|---|---|
| **Google Places / Geocoding API** | REJECT | Requires a billing account + API key (none available to the project); key-management + quota burden; Photon (Apache-2.0) covers the same need keylessly and was live-verified with Arabic queries (جامعة القاهرة → Cairo University 30.0268,31.2059; ميدان التحرير → exact Tahrir 30.0444,31.2357). Revisit if the team registers a billing account. |
| **Google Roads API (map matching)** | REJECT | Key + billing as above; OSRM `/match` (self-hosted, BSD-2) provides road matching at zero cost — audited working on :5001. |
| **Google Elevation API** | REJECT | No adopted use case; Cairo is low-relief for transit walking; adding a keyed dependency for cosmetic data violates the "real problem only" rule. |
| **Google Air Quality API** | REJECT | No concrete product feature; keyed; same reasoning. |
| **WeatherAPI (weather-aware walking penalty)** | REJECT (documented) | Requires account+key; deterministic value would only adjust walk ranking during rain/heat — real but marginal; adoption path documented (config-driven walk-penalty hook in JourneyScoringService is ready if a key is ever provided). Not installed speculatively. |
| **Transitland API** | REJECT | v1 Datastore API officially shut down (transit.land/documentation); superseded by Mobility Database which Wasel already uses (mdb-3355/3354). |
| **Mobility Database** | ADOPT (existing) + ** mdb-3354 Cairo Metro GTFS adopted (partial)** | mdb-3354 (dataset 2026-07-09, T4C): official NAT Lines 1–2, 108 stops, real `fare_attributes.txt`/`fare_rules.txt`, official shapes, 121 frequency rows. Full import would duplicate our OSM-derived Lines 1–2 (and it lacks Line 3 which OSM provides). Adoption: fares + schedule verification + provenance; OSM metro stays authoritative for topology/Line 3. License: T4C data terms (CC-BY-NC-SA family, same as mdb-3355). |
| **GTFS-Realtime (Egypt)** | NO FEED EXISTS → build clean ingestion interface | Extensive search: no Egyptian agency publishes GTFS-RT (vehicle positions/trip updates/service alerts). Cairo BRT real-time ambitions exist but data is proprietary app APIs. Action: implement a config-driven GTFS-RT ingestion service (official `mobilitydata/gtfs-realtime-bindings` PHP package, Apache-2.0) mapping ServiceAlerts → `service_alerts` table; disabled until a feed URL exists. No fabricated positions. |
| **OSRM (self-hosted)** | KEEP (audit passed) | foot profile active; route 2.5ms warm; nearest/match/table available for future map matching; caching+fallback already in `RoadAwareWalkingService`. |
| **Valhalla** | REJECT for this environment | No official Windows binaries; no Docker on the dev machine; WSL2 possible but adds a second routing runtime for capabilities (isochrones, better trace attributes) Wasel does not currently consume. OSRM covers route/match/table at measured latency. Revisit if isochrones become a feature. |
| **OpenTripPlanner 2** | EVALUATE → KEEP CURRENT planner (PoC runbook documented) | Java 17 present (OTP2 requires 17 ✓); LGPL; would provide true GTFS-multimodal RAPTOR routing. But adopting it would strand Wasel's differentiating domain logic (deviation detection, recovery, rerouting, trust integration) which is deeply tied to the custom planner's plan structures. Decision: keep the deterministic Wasel planner as the system of record; OTP2 runbook (PBF + GTFS → build → compare) documented for a supervised benchmark if the team chooses. |
| **otp-react-redux / otp-ui / Digitransit UI** | REJECT | UI kits coupled to OTP data shapes; adopting would replace the approved Wasel design system (violates product direction). |
| **MapLibre (map)** | KEEP | Already integrated; tile provider remains Stadia demo tier with documented production key path (LICENSES_AND_ATTRIBUTIONS.md). |
| **Overpass / Geofabrik / OSM** | ADOPT (existing) | Cairo Metro OSM import + egypt.osm.pbf already powering OSRM. |
| **Photon (geocoder)** | **ADOPT (public instance, keyless)** | Apache-2.0; live-verified Arabic results; backend-proxied with cache + throttle; self-host path documented (requires Java 21 + Nominatim-built index — production upgrade path). |

### Egypt data hunt results (Phase 2)

| Dataset | Status |
|---|---|
| mdb-3355 Greater Cairo buses/paratransit | Already imported (1,011 routes) |
| **mdb-3354 Cairo Metro (official)** | Downloaded + inspected 2026-09-07; adopted for fares/verification (see verdict table) |
| mdb-786 Cairo Metro (older) | Superseded by mdb-3354 — skipped |
| Alexandria tram/bus GTFS | **No published feed** — T4C/DT4A mapping reports only (transitforcairo.com/publications/dt4a-beyond-mapping); OSM remains the only Alexandria source; not imported (out of Cairo demo scope) |
| Egyptian GTFS-Realtime | **None exists** (verified via Mobility Database catalog + agency searches) — ingestion interface built instead |
| Fares | mdb-3354 `fare_attributes.txt`/`fare_rules.txt` = real NAT zone fares — extracted for the fare estimator |
