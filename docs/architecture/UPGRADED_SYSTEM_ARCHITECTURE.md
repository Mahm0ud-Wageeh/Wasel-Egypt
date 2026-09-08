# Upgraded Wasel Egypt System Architecture

## 1. Overview and Philosophy

### Core Principle
> **Enhance, don't replace. Solve real problems, not imaginary ones.**

This architecture document describes the upgraded Wasel Egypt system that addresses all gaps identified in the gap analysis while preserving the solid foundations of the existing Laravel implementation. Every enhancement is justified by a real transportation problem it solves for Egyptian transit users.

### Current System (Baseline)
- Laravel 12 API (PHP 8.2+)
- Sanctum Authentication
- MySQL/PostgreSQL (via Eloquent)
- Deterministic Journey Planner (custom)
- GTFS Import capability (controller exists)
- React 18 + Vite Frontend
- 218 backend tests (presumably green)
- 51 frontend tests (13 suites, green)
- Design System with professional specifications (wasel-design-system.html, UIUX_DESIGN_SPEC.md)

### Upgraded System Vision
Professional, production-ready transit platform for Egypt with:
- Real Egypt geographic data (OSM) replacing synthetic coordinates
- Real interactive maps (MapLibre) replacing SVG placeholders
- Road-aware walking (vs straight lines)
- Comprehensive data coverage for credible demo
- Polished, branded, professional user experience
- Preserved backend architecture and API stability

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Wasel Egypt Upgraded Architecture                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        Frontend (React 18 + Vite)                  ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ ││
│  │  │ MapLibre GL │  │ Journey UI  │  │   Professional UX Layer     │ ││
│  │  │  (Maps)     │◄─┤   Flows    │◄─┤ Enhanced Visual Polish      │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ ││
│  │        ▲                 ▲                      ▲                    ││
│  │        └─────────────────┼──────────────────────┘                    ││
│  └──────────────────────────┼───────────────────────────────────────────┘│
│                             │ (API: /api/v1, authenticated via Sanctum)│
│  ┌──────────────────────────┼───────────────────────────────────────────┐│
│  │              Backend (Laravel 12 API)                               ││
│  │  ┌─────────────────────┐ │  ┌──────────────────────────────────────┐││
│  │  │   Core Services     │ │  │     Enhanced Journey Services        │││
│  │  │ • JourneyPlanner    │◄┼─►│ • Road-Aware Walking (Valhalla/OSM) │││
│  │  │ • JourneyService    │ │  │ • Map Matching (Optional/V2)         │││
│  │  │ • Deviation/Recovery│ │  │ • Disruption Impact (Data Quality)   │││
│  │  │ • Community/Trust   │ │  │ • Improved Scoring                   │││
│  │  │ • Analytics         │ │  └──────────────────────────────────────┘││
│  │  └─────────────────────┘ │                                            ││
│  │  ┌─────────────────────┐ │  ┌──────────────────────────────────────┐││
│  │  │   Data Layer        │ │  │    Data Pipeline (New)               │││
│  │  │ • Eloquent Models   │◄┼─►│ • OSM Extractor/Processor            │││
│  │  │ • GTFS Import       │ │  │ • GTFS Acquisition & Validation      │││
│  │  │ • MySQL/PostGIS     │ │  │ • Deduplication & Normalization      │││
│  │  └─────────────────────┘ │  │ • Quality Monitoring                 │││
│  │                          │  └──────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  External Data Sources:                                                 │
│  • OSM Egypt Extracts (Geofabrik, weekly)
│  • GTFS Feeds (Operators, Transitland/MobilityDB, alternative)
│  • (Future) GTFS-Realtime if available
│                                                                         │
│  External Services (Self-hosted where needed):                          │
│  • OSM Tile Server or Vector Tile Provider (for MapLibre)
│  • Valhalla OR OSRM (route engine for walk/cycle, if adopted)
│  • (Optional) OTP (journey planner microservice, if adopted)
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Architecture (Enhanced, Not Replaced)

### 3.1 Preserved Core

✅ **No Breaking Changes to Existing APIs**
- All routes in `routes/api.php` remain compatible
- Journey lifecycle (search→save→start→track→deviate→recover→complete) preserved
- Deviation/recovery contracts unchanged
- Trust/community/notifications/analytics/authorization untouched (unless justified improvement)

✅ **Preserved Domain Services**
- `App\Services\Journey\JourneyPlannerService` - Enhanced, not rewritten
- `App\Services\Journey\JourneyService` - Unchanged
- `App\Services\Journey\JourneyScoringService` - Enhanced with explainability
- `App\Services\Transit\*` - Unchanged
- All policies, middleware, resources preserved unless specific gap requires change

✅ **Database & Tests**
- Migrations preserved and extended, not replaced
- All 218 existing tests must remain green (passing)
- 51 frontend tests must remain green

### 3.2 Enhanced Backend Components

#### A. Road-Aware Walking Engine (High Value, New)

**Problem Solved**: Accurate walking distance/time for first/last mile and transfers. Straight-line distances underestimate real walking by 20-40% in urban areas with obstacles.

**Solution Integration**:

```
App\Services\Journey\RoadAwareWalkingService
  ├── Input: origin/destination lat/lng, OSM graph
  ├── Logic: Shortest path on OSM footway network (using Valhalla routing or custom graph)
  ├── Output: Actual distance_meters, duration_sec, geometry (polyline for map)
  └── Fallback: If no path found or OSM unavailable, use current haversine (with note)

Integration Point: JourneyPlannerService::assemblePlan() and buildNetworkIndex()
  - Replaces: GeoCalculator::distanceMeters/duration for walking legs
  - When: Only for walking segments (access, egress, transfer_walk)
  - Data Needed: OSM extract for footways, crossings, stairs, etc.
```

**Implementation Choices** (from OPEN_SOURCE_AND_API_RESEARCH.md):

1.  **Lightweight**: Enhance GeoCalculator to use OSM graph with Dijkstra/A* (simple, no external service, moderate accuracy)
2.  **Valhalla Microservice**: Deploy Valhalla tile service (more accurate, higher ops overhead, better handling)
3.  **OSRM Microservice**: Similar to Valhalla, but road-only focus

**Recommendation for Upgrade**: Start with option 1 (enhanced GeoCalculator + OSM graph) for fastest path, migrate to Valhalla if needed for V2. OSM data is the foundational requirement regardless.

**Files Touched**: `App/Services/Journey/GeoCalculator.php` (enhanced or supplemented), new `RoadAwareWalkingService.php`, OSM processing pipeline docs

#### B. Service Disruption Impact (High Value)

**Problem Solved**: Don't direct users to known disrupted services. Show alternatives that avoid disruptions.

**Solution**:

```
App\Services\Journey\DisruptionAwarePlannerExtension
  ├── Input: Service alerts affecting routes/stops, current journey options
  ├── Logic: Filter/penalize journey options that use disrupted services or score impact
  ├── Output: Filtered/ranked journey options, disruption notices for UI
  └── Integration: Pre-filter or post-scored penalty in JourneyPlannerService
```

**Implementation**: Check `service_alerts` table for active alerts overlapping journey route variants/stops; apply scoring penalty or warning flag. UI shows disruption banner on results.

**Files Touched**: `JourneyPlannerService.php` (add disruption check), `JourneyPlanResource.php` (include disruption flags)

#### C. Improved Journey Scoring Transparency (Nice to Have)

**Problem Solved**: Users don't understand why journey X was recommended.

**Solution**: Add `score_breakdown` to journey option payload

```php
// In plan output (App/Http/Resources/JourneyPlanResource.php):
'score' => 2.4531,
'score_breakdown' => [
  'time' => 0.85,      // normalized time component
  'walk' => 0.12,
  'transfers' => 0.30,
  'fare' => 0.15,
  'reliability' => 0.10,
  'bonus_penalty' => -0.10, // preferred mode bonus, etc.
  'explanation' => 'This journey is fastest despite one transfer' // human readable
]
```

**Priority**: Lower - Can be post-demo/docs addition. Frontend optionally displays.

#### D. Optional (V2) - Map Matching for Accurate Progress

**Problem Solved**: Accurate deviation detection and next-stop prediction.

**Solution**: `App\Services\Journey\MapMatchingService` matching GPS trace to OSM/Road + Transit route geometry.

**Priority**: Not required for initial professional demo (can add later). Mention as future enhancement in architecture.

---

## 4. Frontend Architecture (Major Polish + Real Maps)

### 4.1 Preserved Foundation

✅ **Stack**: React 18 + Vite (unchanged)
✅ **Auth**: AuthContext with token handling preserved
✅ **Routing**: react-router structure preserved
✅ **API Client**: `src/api/*` endpoints registry, interceptors
✅ **Styling**: `src/styles/tokens.css` (wasel design system tokens)
✅ **Components**: `components/ui/*` (buttons, inputs, cards, badges, alerts)
✅ **All 51 Frontend Tests**: Must remain green

### 4.2 Major Enhancement: Replacing Mock Map with Real Map

**Problem Solved**: Map is centerpiece of transit app; SVG placeholder is instantly recognizable as prototype.

**Solution**: Integrate MapLibre GL JS

#### Architecture:

```
frontend/src/components/map/

  MapPanel.jsx (Existing - BE REPLACED)
    └── Currently: SVG placeholder with mock route line/dots
    └── New: MapLibre instance

  Upgraded: RealMapPanel.jsx or MapPanel.jsx v2
    ├── MapLibre GL JS instance (npm: maplibre-gl)
    ├── Tile Source:
    │   ├── Primary: OSM vector tiles (free, attribution required)
    │   │   └── Options:
    │   │       ├── Self-hosted tileserver-gl or tileserver-gl-light
    │   │       └── Hosted vector tiles (e.g., Stadia Maps free tier, OpenFreeMap)
    │   └── Fallback: Raster OSM tiles (simpler, less pretty)
    ├── Data Layers:
    │   ├── Base map (streets, parks, water per design spec colors)
    │   ├── Transit stops (markers, 10px white dot, 2px mode-color ring)
    │   ├── Route polylines (5px mode color, dashed for walking/deviation)
    │   ├── Current journey polyline (highlighted legs)
    │   ├── User location (primary/600 dot + pulsing 24px halo, with accuracy)
    │   ├── Deviation marker (error triangle pin) if any
    │   └── Pins: origin (primary), destination (accent), next stop (banner)
    ├── Controls:
    │   ├── Recenter button (⌖) - flyTo user or route bounds
    │   ├── Layers button (⚙) - toggle layers (future, optional)
    │   ├── Zoom controls (+/-)
    │   └── Compass (if desired)
    ├── Interactions:
    │   ├── Pan, zoom, rotate
    │   ├── Stop marker click → show stop detail
    │   ├── Route click → highlight/select that journey option
    │   └── User location follow (optional tracking mode)
    ├── Responsive:
    │   ├── Mobile: Full-width map, bottom sheet overlaid (drag handle, snap points 30%/60%)
    │   └── Desktop: Map + sidebar layout (2-col, list or map toggle refined)
    └── Styling:
        └── Style JSON customized to match Wasel design tokens (map color vars)
```

#### Style Customization (Matching Wasel Design Spec):

- Canvas bg: #E8ECEF (ink surface)
- Roads: #FFFFFF (white)
- Water: #D5ECEC (nile/100)
- Parks: #E6F2E7 (success/50)
- Fonts: Cairo for labels

MapLibre style spec can replicate these directly.

#### Installation Decision (Per Research - No Blind Install):

Choose tile provider based on:

| Factor                | Option 1: Self-hosted (OTM/tile-server) | Option 2: Hosted Vector Tiles |
| --------------------- | --------------------------------------- | ----------------------------- |
| Cost                  | Free (requires server)                  | Free tier likely sufficient for demo, pay if scale |
| Maintenance           | Must update tiles, run tileserver      | Zero maintenance              |
| Performance           | Good if close to users, CDN edge maybe | Good, global CDN              |
| Egypt Coverage        | Full                                  | Full                          |
| Demo Suitability      | Good, but extra ops complexity for demo | Excellent, low overhead       |

**Recommendation for Upgrade**: Use hosted vector tiles for demo (e.g., Stadia Maps, OpenFreeMap, or MapTiler free tier). Self-hosting can be V2 decision when operational scale justifies it. Ensures focus on product polish, not devops.

**License/Cost**: MapLibre BSD-3, tiles ODbL with attribution, free tiers available - no licensing concerns.

**API Keys**: Stadia/MapTiler may require (free) API key; alternatives like OpenFreeMap require none. Document choice, store key in env var, not hardcoded.

**Files Touched**:
- `package.json` (add maplibre-gl)
- `src/components/map/MapPanel.jsx` (major replacement)
- `src/styles/tokens.css` (map color tokens already present, verify)
- `src/pages/*` that use MapPanel (props contract preserved; behavior expanded)
- `vite.config.js` (if needed for MapLibre worker handling)
- `.env.example` (add VITE_MAP_TILES_URL, VITE_MAP_STYLE_URL if needed)

#### Adopt / Evaluate / Reject (Map Decision):

✅ **ADOPT**: MapLibre GL JS + OSM vector tiles (hosted, free)
- Real maps solve severe gap
- No brainer: free, high quality, matches Mapbox API knowledge
- Decision made before major implementation

### 4.3 Frontend Polish: Achieving Professional Quality

#### Visual Refinement Pass

**Problem Solved**: Student-level polish undermines demo credibility.

**Work**:

1.  **Typography & Spacing**: Verify all screens use design tokens; fix inconsistencies (gaps, line heights, font weights)
2.  **Elevation & Shadows**: Apply correctly per card/button spec; don't rely on default browser
3.  **States Polish** (per 8-state matrix in UIUX spec):
    - Loading: Skeleton cards / shimmer (not just spinner)
    - Empty: Illustration + reason + CTA (not blank)
    - Error: Alert with retry (error/50 style)
    - Success: Toast (not just inline confirmation)
    - Validation: Red border + helper + focus first error
    - 401/403/409: Dedicated illustrative states

4.  **Iconography**: Audit emoji usage vs custom icons (mode glyphs M/B/R, verified check, etc.). Replace emoji where design spec defines specific glyph (keep emoji sparingly only where spec intended - e.g., empty state maybe). Use inline SVG or icon font.

5.  **Micro-interactions & Transitions**:
    - Card press feedback (scale .98)
    - Sheet slide-up
    - Tab/filters active glow
    - Debounce inputs (search, etc.)
    - Optimistic updates (save, like, etc.) with proper error revert
    - Page transitions (subtle fade/slide)

6.  **Information Hierarchy**: Ensure journey option cards scannable: primary = duration, secondary = transfers/modes, tertiary = walk/fare/score.

#### Public Homepage (New/Rebuilt)

**Problem Solved**: Insufficient landing/public experience for professional demo.

**Structure** (per requirements, full page  ~ above the fold  ~ workflow):

```
Public Landing / Home (logged out vs logged in branch)

  Navbar (professional: logo, nav links, CTA buttons, auth status)
  Hero (strong: headline solving Egyptian transit problem, journey planning CTA, visual (map or illustration), trust signals)
  Problem & Solution (text + icons for Egypt-specific transit pain points and Wasel's answer)
  Journey Planning CTA (prominent "Plan your journey" → Search, maybe with quick origin/dest inputs)
  Map/Visual Section (real MapLibre small demo map showing transit context for Egypt, not SVG placeholder)
  How It Works / Features (3-4 steps: search → compare → start → track→recover; icons, benefit copy)
  Transit Modes (chips/cards for metro/bus/minibus/microbus/rail/walking with descriptions)
  Service Alerts / Data Section (REAL backend data: GET /service-alerts/active, counts; shows system is alive and tracking reality)
  Community Trust Section (community reports count + trust indicators, maybe testimony/persona)
  Strong Final CTA (big button to start journey or sign up)
  Professional Footer (links, attribution for OSM, copyright, contact)
```

**Branch**: Logged out (Login/Register CTAs) vs Logged in (Home dashboard with active journey card, quick search entry, recent alerts)

**Data Integrity**: NO fake statistics. If backend says 2 active alerts, show 2. If 12 community verified reports, show 12. If empty, show empty state, not fabricated. Trust hinges on honesty.

**Responsive**: Mobile-first then horizontal expand at 768, 1024, 1440.

#### Journey Results Polish (Existing Pages Enhanced)

- Compare refinements:
  - Mode strip (colored dots) more distinctive
  - Score perhaps hidden behind "Details" or subtle (user wants quick decision, not numbers)
  - Fare, walk formatting consistent
  - Leg timeline more visual (rail rail + blocks)

#### Navigation & Shell

- App shell: `src/components/layout/AppShell.jsx` polish
- Mobile: bottom tab bar (5 tabs) + top app bar (title, back, overflow) refined
- Desktop: top navbar + sidebar (admin) responsive breakpoints
- Notifications bell badge (GET /notifications/unread-count)
- Profile avatar menu

#### Responsive Verification

- Must be tested on:
  - 390x844 (mobile spec)
  - 768 (tablet)
  - 1440 (desktop spec)
  - Chrome, Safari (iOS simulation), Firefox
- Touch targets >=44px, tap states

---

## 5. Data Architecture

### 5.1 Source Layer

```
SOURCE                              →  Raw Extract                            →  Validated
  ↓                                    ↓                                         ↓
Geofabrik Egypt PBF (weekly)       →  OSM pbf (15GB)                     →  osm-validator → normalized OSM (+ PostGIS if queue)
GTFS Feeds (Operators - TBD)       →  GTFS zips                           →  gtfs-validator → normalized GTFS
MobilityDB/Transitland (monthly)   →  Consolidated feeds (aggregated GTFS)→  consolidated-validator → enhanced datasets
(Government portals)               →  Various                               →  ad-hoc validator
```

### 5.2 Processing Pipeline

**Designed for Reproducibility: SOURCE → DOWNLOAD → VALIDATE → NORMALIZE → DEDUPLICATE → IMPORT → QUALITY CHECK → PUBLISH**

Detailed steps documented in `docs/data/EGYPT_TRANSIT_DATA_STRATEGY.md` - summary for upgrade:

1.  **OSM Egypt**: Download Geofabrik PBF → Validate (osmium, ogr) → Normalize (coordinate system, tag standardization, extract footways/stops) → Publish tiles/data via MapLibre source → Quality check (coverage stats)
2.  **GTFS**: Download from source(s) → Validate (FeedValidator / MobilityDB's validator) → Normalize (WGS84, stop snapping to OSM, mode mapping) → Deduplicate (geo+name for stops) → Import via `GtfsImportController` (incremental, external-id preserved) → Quality check (anomaly report: missing geometries, timing violations, discontinuities) → Publish to app (MySQL)

**Reproducibility**: Pipeline scripts versioned; provenance (source URL, download date, validator version, coverage) documented per import. Can re-run from DOWNLOAD step for fresh pull.

**Schedule**: OSM weekly, GTFS per-operator cadence (unknown until feeds identified), pipeline monitored.

### 5.3 Storage

- MySQL (existing): Transit data tables (stops, routes, variants, route_stops, schedules, stop_times, service_alerts, etc.) + user/journey/community/notification tables. **Add**: optional `osm_features` cache table if helpful for road-aware walking; not required for initial tile-based approach.
- Vector Tiles: Hosted (external) initially - no local storage needed for demo
- Raw PBF/zips: Local or S3-adjacent for reprocessing history (small demo scale, local ok)

### 5.4 Coverage Target for Upgrade/Demo

For professional demo, need at least:

| Area           | Stops (target) | Routes | Trips   | Reason                       |
| -------------- | -------------- | ------ | ------- | ---------------------------- |
| Greater Cairo  | 800 - 1500     | 30-50  | 1000+   | Core demo journeys           |
| Alexandria     | 300 - 500      | 15-25  | 500+    | Show handling second city    |
| (Stretch) Nile Delta | 200    | 10     | 300     | Shows scalability narrative  |

Actual numbers depend on feeds obtained; synthetic realistic pattern fills gaps where GTFS missing but OSM anchors stop locations truthfully. Must distribute to allow cross-city journey finds.

---

## 6. Integration & Deployment Architecture

### 6.1 Build & Deploy for Upgrade

**Backend**:

- No infrastructure change; deploy Laravel as existing (XAMPP or PHP-FPM + Nginx).
- Composer dependencies largely unchanged (add any PHP libs for GTFS/OSM processing only if needed; Valhalla service is external process, not composer package).
- Ensure `php artisan migrate:fresh --seed` and `php artisan test` green before enhancements; keep green throughout.

**Frontend**:

- MapLibre is JS package (`maplibre-gl`). Tile source is URL (configurable).
- Build (`npm run build`) bundles MapLibre correctly (worker handling via vite plugins if needed).
- Environment vars: `VITE_API_BASE_URL` (existing), plus `VITE_MAP_TILES_URL` / `VITE_MAP_STYLE_URL` (new).

**Optional Services (V2 Decision)**:

- Valhalla (if chosen for road-aware walking): Docker image `valhalla/valhalla`, tile building pipeline, served sidecar.
- OTP (if chosen for full planner): Docker image / JAR, GTFS/OSM ingest.
- Tileserver (if self-hosting): `maptiler/tileserver-gl` or similar.

**Recommendation**: For upgrade V1, **do not add new containerized services**. Focus on frontend map real + data load. Enhancements like road-aware walking can be added as simple service class before introducing microservice complexity. Architecture document anticipates but does not mandate microservice for upgrade scope.

### 6.2 Caching & Performance

- **Backend cache** (Redis/file if enabled) for planner network index, scoring ranges (already partially cached if sensible).
- **Frontend cache**: Query caching via approach in `AuthContext`/`JourneyContext` (stale-while-revalidate if appropriate, no extra lib required).
- **Map caching**: Browser caches vector tiles; CDN for hosted tiles provides edge caching.
- **Performance target**: Journey search < 2s even with Cairo-scale data (est. with current deterministic planner should hold; verify with load test).

---

## 7. Testing Strategy for Upgrade

### 7.1 Backend Tests (Must Remain Green)

- **Rule**: No existing test may be deleted or weakened to pass. Fixes improve backend, not mask issues.
- Tests verify: journey lifecycle, deviation, trust, notifications, analytics, transit CRUD, authorization.
- New tests may be added for:
  - Road-aware walking service (unit tests for OSM graph pathfinding vs haversine)
  - Disruption flagging/filtering
  - Data import idempotence
- Run `php artisan test` before each PR merge.

### 7.2 Frontend Tests (Must Remain Green)

- All 13 suites / 51 tests remain green. Fixing isolated test issues not required except real blockers.
- New tests for MapPanel (mock MapLibre if needed) are optional; existing tests not weakened.
- Manual browser checks required for every UI change (per final report includes browser checks).

### 7.3 Data Quality Checks

- Automated validation on each import (feed validator, geographic/temporal/relationship checks).
- Provenance logging per import (source, date, counts, issues).
- Manual spot check: 20 random stops on map vs known Egypt geography (Cairo squares/districts) - spot plausibility.

### 7.4 Browser & Device Checks

- Checklist: Chrome desktop, Firefox, Safari (or Chrome mobile emulation for 390 width), responsive breakpoints 390/768/1440.
- Verify: map loads, markers visible, journey search flow completes, active journey + recovery works, reports/notifications/profile, admin moderation.

---

## 8. Security and Compliance

- **Auth**: Sanctum (Bearer token) unchanged.
- **Authorization**: Role/permission middleware (`role:admin`, `permission:transit-data-edit`, `role:moderator,admin`) preserved. User data access: self-or-admin checks improved? Already patched if authorization gap existed.
- **Input Validation**: FormRequest classes preserved (add for any new endpoints).
- **XSS/CSRF**: SPA context; ensure MapLibre popups and user-generated content (reports) properly escaped.
- **Data Privacy**: User location handling; no extraneous tracking.
- **OSM ODbL**: Provide attribution (footer: "© OpenStreetMap contributors") as required.

---

## 9. Upgrade Implementation Phases (Aligned to Gap Analysis Priorities)

### Phase A: Foundation (Research Complete ✅)

- [x] Open-source & API research (`docs/research/OPEN_SOURCE_AND_API_RESEARCH.md`)
- [x] Egypt transit data strategy (`docs/data/EGYPT_TRANSIT_DATA_STRATEGY.md`)
- [x] Gap analysis (`docs/audit/WASEL_GAP_ANALYSIS.md`)
- [x] Upgraded architecture (this document)
- [ ] Demo scenario (next, `docs/demo/DEMO_SCENARIO.md`)

### Phase B: Critical Path to Professional Demo (3-4 Weeks Focus)

1.  **Real Map (Week 1)** - MapLibre + OSM vector tiles, full integration, responsive.
2.  **Visual Polish Sprint (Week 1-2, overlapping)** - Refine all screens, states, iconography, micro-interactions.
3.  **Data Load (Week 1-2, parallel)** - OSM Egypt, GTFS acquisition/generation for demo area, import.
4.  **Public Homepage Build (Week 2)** - Full landing experience with real data.
5.  **Flow Validation & Polish (Week 3)** - Journey lifecycle polish, edge cases.
6.  **Device/Browser Testing & Fixes (Week 3)** - Responsive, mobile primary.
7.  **Final Report & Decision: READY YES/NO (Week 4)** - Build, tests, browser checks, risks.

### Phase C: Distinguish Good → Excellent Demo (1-2 Weeks if Schedule Allows)

- Road-aware walking (enhanced GeoCalculator or Valhalla lightweight)
- Disruption scenario feature
- Scoring transparency, reliability indicators
- Extended data coverage (Alexandria)

### Phase D: Post-Demo / V2

- Map matching / accuracy
- GTFS-Realtime (if feed emerges)
- Microservice journey planner (OTP/Valhalla full) if justified
- Offline tracking policy

---

## 10. Architecture Decision Records (Summary)

| Decision | Options | Chosen | Rationale |
| -------- | --- | --- | --- |
| Frontend Map | Mock SVG vs MapLibre/Leaflet | **MapLibre + OSM vector** | Real maps required, MapLibre free, high quality, BSD, API compatible with spec |
| Tile Provider | Self-host vs Hosted free tier | **Hosted free tier for demo** | Lowest ops overhead, focus on product; self-host later if scale warrants |
| Road-Aware Walking | None vs Enhanced calca vs Valhalla/OSRM microservice | **Enhanced GeoCalculator with OSM graph (start), eval Valhalla if needed** | Solves high-value problem with minimal service complexity for upgrade |
| Journey Engine | Custom vs OTP/Valhalla microservice | **Enhance custom (disruption, road-walk), defer microservice** | Current deterministic planner is solid for demo scope; microservice adds ops not needed for graduation demos |
| Data Source | Synthetic only vs OSM+GTFS | **OSM (Geofabrik) + GTFS (multi-source) + MobilityDB eval** | OSM readily available, GTFS sourced per strategy, gives credible coverage scale |
| UI Component Library | Custom vs adopt transit UI kit | **Custom (existing spec is superior)** | Few transit UI kits match polish/spec; adopting would reduce quality |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---- | ---- | ---- |
| GTFS feed acquisition delays | Medium | High (demo data) | Fallout: realistic synthetic data patterned on Egyptian transit (still credible), document provenance; OSM covers base |
| MapLibre performance on low devices | Low | Medium | Use vector tiles optimized; test on mid-range Android simulation; have raster fallback style |
| Polish timeline overrun | Medium | High (demo quality) | Timebox polish with MVP polish bar, iterate; Phase C features can slip |
| Backend slows with real data volume | Low | Medium | Early load test (Cairo-scale); planner is O(n*m), should stay <2s; add cache index if needed |
| ODbL attribution forgotten | Low | Medium (compliance) | Add OSM attribution to map + footer now; it's required |
| Scope creep | Medium | High | Prioritize per Section 9 phases; defer anything not in Critical Path |

---

## 12. Appendix: Key File Map (Relevant to Upgrade)

**Backend (preserve/enhance, not rewrite):**

- `app/Services/Journey/JourneyPlannerService.php` — Enhanced (disruption, road-walk)
- `app/Services/Journey/GeoCalculator.php` — Enhanced or supplemented by RoadAwareWalkingService
- `App/Http/Resources/JourneyPlanResource.php` — Add disruption/score details (optional)
- `app/Http/Controllers/Api/V1/Transit/GtfsImportController.php` — Validated import pipeline
- `routes/api.php` — Unchanged (or additive only)
- `database/seeders/*` - Extended for realistic data

**Frontend (polish + map replacement):**

- `frontend/src/components/map/MapPanel.jsx` — Major: replace mock with MapLibre
- `frontend/src/pages/Landing.jsx` + `Home.jsx` — Major: professional public homepage
- `frontend/src/pages/JourneyResults.jsx`, `ActiveJourney.jsx`, `Deviation.jsx`, etc. — Polish pass
- `frontend/src/components/layout/AppShell.jsx` / `Header.jsx` — Navigation polish
- `frontend/src/styles/tokens.css`, `components.css`, `base.css` — Verify against wasel-design-system.html
- `frontend/package.json`, `vite.config.js` — MapLibre deps, worker config
- `frontend/.env.example`, `.env` — Map tile env vars

**Docs & Data (new):**

- `docs/research/OPEN_SOURCE_AND_API_RESEARCH.md` — Done
- `docs/data/EGYPT_TRANSIT_DATA_STRATEGY.md` — Done
- `docs/audit/WASEL_GAP_ANALYSIS.md` — Done
- `docs/architecture/UPGRADED_SYSTEM_ARCHITECTURE.md` — This document
- `docs/demo/DEMO_SCENARIO.md` — Next (concrete journeys that demo tells)
- `docs/data/PROVENANCE.md` — Per-import documentation (created during data pipeline implementation)

---

*Architecture version 1.0 — Aligned with approved MASTER UPGRADE PLAN. Ready for upgrade implementation after Documents Phase completes and stakeholders confirm plan.*