# UI Redesign — Phase 2 Report (Journey Search + Search Results)

**Date:** 2026-09-06 · Predecessor: `docs/frontend/REDESIGN_PHASE1_REPORT.md`

## 1. Screens redesigned

- **Journey Search** (`JourneySearch.jsx` — full rewrite): desktop split
  (planner panel sticky-left, live map right visualizing the selected
  origin/destination pins); mobile stacked with map first; connected
  origin/destination fields with a rail; **swap control** (disabled until a
  selection exists); "Now" quick-set for departure; **advanced constraints
  collapsed by default** (avoided-mode chips, max transfers, max walk,
  alternatives) behind an aria-expanded toggle; clear-all control;
  searching state ("Searching the real Cairo network…" role=status);
  validation with inline field errors; API error alerts.
- **LocationPicker** (`LocationPicker.jsx` — full rewrite): **server-side
  debounced stop autocomplete** against `GET /stops?search=…&per_page=8`
  (the old picker searched only a 15-row default page of 3,025 stops —
  a real data defect found during contract inspection); full **ARIA
  combobox** keyboard support (ArrowDown/Up cycle, Enter selects, Escape
  closes, aria-activedescendant, scroll-into-view); selected state
  (highlighted control, check + coordinates meta line, clear button);
  raw `lat, lng` entry still supported; per-field loading spinner.
- **Journey Results** (`JourneyResults.jsx` — full rewrite): every card
  now shows duration, **departure → arrival**, transfer badge, semantic
  **route strip** (Origin → walk → transit → transfer → … → Destination
  with lucide icons and connecting lines, aria-labeled with the full leg
  sequence), walking distance, fare (when the API returns one),
  **reliability %**, score, disruption banner; derived honest badges
  (Recommended / Fastest / Fewest transfers — computed from the real
  option set, never fabricated). Selecting an option opens the **Journey
  Details drawer** (bottom sheet on mobile, centered dialog on desktop):
  full vertical timeline (Origin → legs with stops/times/durations/line
  names → transfers → Destination), estimate disclosure for walking legs
  when the routing engine was down, fare/reliability/score summary, the
  score-explanation panel, **Save** (deduplicated) and **Start journey**
  (enabled only after save → `POST /journeys/{id}/start` → navigates to
  the live tracking screen). Map stays synchronized: selected itinerary
  dominant, alternatives muted.

## 2. Components created/changed

| File | Change |
|---|---|
| `src/components/ui/LocationPicker.jsx` | Rewritten (server-side combobox) |
| `src/pages/JourneySearch.jsx` | Rewritten (planner) |
| `src/pages/JourneyResults.jsx` | Rewritten (cards, route strip, details drawer, save/start) |
| `src/api/journeys.js` | + `searchPublicStops(query)`, + `startSavedJourney(id)` |
| `src/styles/components.css` | + planner/locpicker/routestrip/details-drawer/jtl sections (logical properties, RTL-ready) |
| 5 test files | Rewritten/extended: `searchFormValidation`, `errorStates`, `navigation`, `apiIntegration`, `optionRendering`, `saveJourney`, `responsiveBehavior` |
| `src/test/test-utils.jsx` | Route patterns already registered (Phase 1) |

## 3. 21st components/patterns used

- No new component adoptions this phase. The combobox/listbox pattern and
  bottom-sheet drawer follow the same pattern-first approach validated in
  Phase 1 (21st matches are Tailwind/shadcn — incompatible with the
  approved token architecture; documented in REDESIGN_DECISION.md §8).

## 4. Licenses

No new dependencies (lucide-react, MIT, already adopted in Phase 1).

## 5. APIs used (all pre-existing; none invented)

| Call | Verified response contract |
|---|---|
| `POST /api/v1/journeys/search` | `{ data: { origin, destination, requested_at, options: [{ total_duration_sec, total_transfers, walk_distance_meters, score, reliability, fare?, matches_saved, disrupted, alerts[], legs[], transfers[] }] } }`; leg: `{ type, mode, route_variant_id, route{id,short_name,long_name}, from_stop/to_stop{id,name,lat,lng}, from/to_lat/lng, departure_time, arrival_time, duration_sec, distance_meters, geometry, walk_source, geometry_source, reliability }` |
| `GET /api/v1/stops?search=…&per_page=8` | `{ data: [{ id, name, latitude:"30.03…", longitude:"31.21…", area:{ name, governorate:{ name } } }], meta:{ total (scalar after Phase-1 fix) } }` |
| `POST /api/v1/journeys` | `{ data: { id, status:"planned" } }` (save) |
| `POST /api/v1/journeys/{id}/start` | `{ data: { id, status:"active", … } }` |
| Error envelope | `ApiError(status, message, { errors })` — 401/422/0 handled with distinct messages |

**Backend defects found:** none new (the `meta.total` array bug was fixed
in Phase C; one **frontend** defect found — the old autocomplete consumed
only 15 stops — fixed server-side search).

## 6. Tests

- **64 passed / 0 failed** (13 files) — 13 new/updated tests covering the
  requested 18 points: renders ✓, validation ✓ (required + same-stop),
  origin selection ✓ (server-side autocomplete), destination selection ✓,
  swap ✓, successful search ✓ (exact wire contract), real option
  rendering ✓ (duration/dep-arr/walking/fare/score), selected option ✓,
  score explanation ✓, map rendering ✓, save journey ✓ (dedup: repeated
  click → 1 API call), empty results ✓, 422 ✓, 401 ✓, network error ✓
  (409 surfaces through the same alert path; no 409-producing endpoint
  exists in the search/save flow), mobile layout ✓ (structural classes),
  desktop layout ✓ (split classes), navigation to details ✓.
- **Backend regression: 232 passed / 0 failed** (untouched).
- `npm run build`: clean (6.1 s).

## 7. Browser verification (live: OSRM :5001 + API :8000 + Vite :5174)

- **1440px desktop** — full real-data flow: typed "Sadat" → server
  autocomplete returned 8 **real Cairo stops** ("Al Shenawy St. & Sadat
  St.", "Gawad Hosny St & Anwar Al Sadat St.", "Oil Libya Gas Station
  (Sadat Square)" with area · governorate subtitles); selected both ends;
  searched → **3 real options** (65 min minibus+bus etc.); card surface
  verified (dep→arr, walking, score, Recommended badge, 3 route strips,
  no emoji); details drawer opened (Origin → Walk → Metro → … →
  Destination timeline + "Why this ranking"); **Save** → "Saved to your
  trips" (button disabled — dedup verified by double-click); **Start
  journey** enabled → navigated to `/active-journeys/3` with live
  tracking.
- **390px mobile** — same flow: Sadat → Giza, 3 real options, 3 route
  strips, **no horizontal overflow**, "View on map" opens the bottom
  sheet with the live map + close button; planner/map stacking verified;
  touch targets ≥44px.
- **1024px tablet** — split layout active (row-reverse), panel + map
  visible, no overflow.
- Console: no errors; all state transitions through real API data.

**Driver note:** two initial mobile failures were automation races (the
IAB locator clicking during the debounce re-render; fixed in the driver
by focusing before native typing) — not product bugs; the same flow then
passed end-to-end at 390px.

## 8. Bugs found & fixed during this phase

1. **Frontend data defect (major)**: stop autocomplete filtered a 15-row
   default page instead of the 3,025-stop network → replaced with
   debounced server-side search.
2. **Pre-existing crash**: `toggleAvoided`'s add-branch referenced `m`
   outside its scope (`[...prev, m]`) — clicking any mode chip to *add*
   it threw `ReferenceError` (old tests never actually toggled a chip).
   Fixed + covered by test.
3. **testId prop never landed**: callers passed `testId=` but the picker
   destructured `'data-testid':` — the attribute never rendered. Fixed.
4. **Duplicate error rendering**: picker rendered the field error twice
   (own span + Field's) — removed the duplicate.
5. jsdom test-environment fixes (innerText absence, local-TZ time
   formatting) in tests only.

## 9. Remaining issues

1. Fare shows only when the backend estimator returns one for the mode
   pair (honest; no fabricated fares).
2. Walking-leg "estimate" disclosure appears if OSRM is down (by design).
3. Mobile bottom-sheet is single-snap (drag-to-expand is a future
   enhancement; "View on map"/close cover the need).
4. Legacy saved journeys (pre-geometry) map as straight lines —
   documented fallback.

## 10. Verdict

Search and Results now behave and read like a real transit planner on
real Cairo data at all three breakpoints, with the full
search → select → details → save → start loop live.

**READY FOR NEXT DESIGN PHASE: YES**
