# Final Real-World Product QA — Wasel Egypt

**Date:** 2026-09-10 · **Method:** real-passenger audit, live backend (3,025 stops /
1,014 routes / 1,792 variants), headless-Chromium CDP verification, EN + AR,
390 / 768 / 1440 px.

Rule enforced throughout: fix only real bugs/blockers end-to-end; no invented
data; Matrix/importer/TFC2 untouched; duplicate records documented, not deleted.

---

## 1. Real blockers found (all fixed + verified)

### B1. Schedule frame shifted +3h — dawn searches showed phantom multi-hour waits
- **Symptom:** Mar Girgis → Saad Zaghloul (3 metro stops) returned **3h 01m**;
  Tahrir → Pyramids **4h 28m**. Stop departures likewise showed first trips
  hours late. Daytime searches looked fine, hiding the bug.
- **Root cause:** GTFS static times are Cairo wall-clock, but the planner and
  departures service ran in UTC (`Carbon::parse` / `Carbon::now()` under
  `app.timezone = UTC`). Before ~08:30 local, every request fell in the
  pre-service gap and waited for 05:30-UTC grid departures.
- **Fix (end-to-end, 3 backend lines + frontend defaults):**
  - `JourneyPlannerService::search` interprets `requested_at` in
    `Africa/Cairo` (explicit offsets preserved as instants; naive input =
    Cairo wall). Disruption checks are instant-based → unchanged behavior.
    Tracking progress uses timestamps → unchanged. Persisted leg times now
    carry `+03:00`, so displayed clocks are true wall time.
  - `StopDeparturesService` defaults `$from` to Cairo now.
  - Frontend `cairoWallTime()` helper for "Now" defaults (naive wall =
    backend contract); manual datetime-local input already wall time;
    stored `+03:00` echoes sliced for the input.
- **Verified:** same dawn scenario now returns **6 min direct + 8 EGP**;
  departure "minutes away" sane; backend 274/274.
- **Tests:** existing time-sensitive journey tests re-expressed their
  wall-clock intent via naive format (same scenarios, no behavior change);
  new contract test (`naive_requested_at_is_planned_in_cairo_wall_time`).

### B2. Route-page stops invisible on the map
- `MapPanel` used `stops` prop ONLY when no itinerary existed; RouteDetail
  passes a polyline-only itinerary + stop list → 0 stop dots rendered.
- **Fix:** merge itinerary stops + explicit stops (deduped). Verified:
  **54 stop dots** tracing Line 1 live.

### B3. StopPanel refetch + focus-steal loop
- Inline `stop={{...}}` prop got a fresh identity on every MapPanel render
  (zoom state), re-running departures fetch + `focus()` on each gesture.
- **Fix:** memoized `selectedStop` on stable key.

### B4. Stop→planner hand-off dead on the route page
- StopPanel action buttons called an `onSelectStop` prop RouteDetail never
  passed. **Fix:** wired to the prefill contract (origin + destination).
- **Guest gap found while verifying:** `ProtectedRoute`/`Login` dropped
  router state, losing the prefill after login. **Fix:** state passthrough
  in both guards + forward in Login. Verified guest round-trip:
  route stop → login → `/search` prefilled "New Marg".

### B5. Misleading line-dot colors
- StopPanel fell back to metro-red for every colorless route (microbuses
  shown as metro); RouteDetail mode lookup was case-sensitive.
- **Fix:** serving-mode color fallback + lowercase normalization.

## 2. UX issues found (fixed — small, contained)
- Mobile "View on map" toggle also rendered on desktop → hidden ≥900 px.
- Planner advanced-toggle icon had identical branches → proper rotate.
- Results `alternatives`/`stops` arrays rebuilt every render → memoized
  (stops GL layer teardown churn).
- Landing footer headings/links hardcoded EN → keyed (footer.*).
- Results/ActiveJourney hardcoded strings → existing i18n keys (EN text
  identical; +13 new `results.*`/`footer.*` keys, 489 parity).

## 3. Data issues
- **B1 timezone frame** (fixed, above). No fabricated times anywhere:
  variants without timetables render "no timetable" states (verified).
- Documented duplicates left untouched per instructions.

## 4. API issues
- None (all new endpoints validated; throttle/caching preserved).
- Noted: single-threaded `php artisan serve` serializes long planning
  requests — local-dev only, production uses concurrent PHP.

## 5. Accessibility issues
- Fixed: StopPanel focus-theft loop (B3).
- Verified: skip link, combobox keyboard nav, dialog roles/labels,
  focus-visible rings, touch targets, RTL mirror incl. drawer/timeline/map.

## 6. Performance issues
- Fixed: results map-input memoization; StopPanel refetch loop.
- Verified idle: zero API polling on results (StrictMode dev double-fetch only).
- Known cost (unchanged): full-network planning 30–60 s per search/save;
  covered by loading states; no action taken (backend architecture decision).

## 7. Files changed
Backend: `JourneyPlannerService.php`, `StopDeparturesService.php`,
`JourneySearchTest.php` (+1 test), `JourneyApiTest.php`,
`JourneyDeviationRecoveryTest.php`.
Frontend: `api/journeys.js`, `pages/JourneySearch.jsx`, `pages/RouteDetail.jsx`,
`pages/Login.jsx`, `routes/guards.jsx`, `components/map/MapPanel.jsx`,
`components/ui/StopPanel.jsx`, `i18n/en.json` + `ar.json` (+dictionaries),
`__tests__/journeyPrefill.test.jsx` (new).

## 8. Tests / build / browser verification
- Backend **274/274** (1844+ assertions), frontend **118/118 (21 files)**,
  `vite build` green with worker assets.
- Browser (CDP, real backend): scenarios A–G incl. guest prefill round-trip,
  save→start→deviate→recover→reroute→complete, notifications (2 real),
  nearby-stops (93), geolocation granted/denied, EN+AR, 390/768/1440 —
  **zero console errors** throughout.

## 9. Remaining non-blocking polish (documented, not started)
- Alternative-option diversity (near-duplicate 14/15-min options on some O/Ds).
- Arabic pluralization simplified in relative times ("11 دقيقة" for all counts).
- OSM tile CDN throttled once under heavy verification load (environmental).
- Save latency (~30–45 s backend re-plan) — architecture-level, out of scope.

## Final status: FEATURE COMPLETE WITH NON-BLOCKING POLISH
