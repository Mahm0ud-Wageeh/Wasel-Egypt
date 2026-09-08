# End-to-End Integration Evidence — Multimodal Routing & Live Guidance

**Date:** 2026-09-07 · Purpose: master-prompt Phases 5–6 verification.
Everything below was executed against the live stack (Laravel API :8000,
OSRM foot :5001, Vite :5174, real Cairo dataset: 3,025 stops / 1,014
routes / 1,792 schedules).

## Phase 5 — Multimodal routing produces a coherent end-to-end journey

### Evidence A: Real multimodal option (HTTP, measured)

`POST /api/v1/journeys/search` (Tahrir 30.0444,31.2357 → Pyramids area
29.9773,31.1325, 10:00) returned 3 ranked options; the best option's legs:

```
walking  walking:  493 m, 18 geometry pts [osrm]           ← OSRM road route
transit  minibus:  15,307 m, 400 geometry pts [route_geometry]  ← GTFS shape
transit  bus:       2,773 m, 288 geometry pts [route_geometry]  ← GTFS shape
walking  walking:  1,208 m, 93 geometry pts [osrm]           ← OSRM road route
```

- Access + egress walking legs carry **road-following geometry from OSRM**
  (`walk_source: "osrm"`), not straight lines.
- Transit legs carry **real GTFS shape polylines** (`geometry_source:
  "route_geometry"`).
- The four legs chain into one itinerary with consistent times (departure
  → arrival on every leg) — a coherent point-to-point journey, not
  disconnected pieces.
- Metro direct option verified separately (Mar Girgis → Saad Zaghloul,
  Cairo Metro Line 1, 8 min, 0 m walk — the planner mixes metro, bus,
  minibus and microbus in one network).

### Evidence B: mode preference constraints work end-to-end

Avoided-mode filters (`avoided_modes`) flow through the same request and
change the option set (planner hard-filters variants; tests cover it:
`FrequencyAndDisruptionTest`, `JourneySearchTest`).

## Phase 6 — Live guidance & re-routing: implemented, tested, E2E-verified

### The protected domain logic (all test-covered)

| Capability | Implementation | Test coverage |
|---|---|---|
| Live progress + current leg + next stop | `JourneyTrackingService` (trackingState: leg index, progress %, nearest stop, next stop, stop events) | `JourneyExecutionTest`, `JourneyDeviationRecoveryTest` |
| Off-route deviation detection | `DeviationDetectionService` — corridor distance via `GeoCalculator::pointToSegmentDistanceMeters`, thresholds 250 m / 1,000 m (high) | `off_route_movement_triggers_a_deviated_state`, `no_further_detection_while_already_deviated` |
| Missed-stop detection | same service — missed-stop grace window + distance rules | `JourneyDeviationRecoveryTest` |
| Recovery/rerouting | `RecoveryService` — re-plans from the deviation point with widened 2 km walk radius, prefers transit options, atomic option persistence, delay vs original | `recovery options validation`, `a_rerouted_journey_can_be_deviated_again_and_completed` (double-deviation), plus `RoadAwareWalkingTest` (fallback) |
| Re-entry / resume | resume endpoint + can_continue gating (high severity blocks) | `user_can_resume_a_deviated_journey_when_severity_allows_it` |
| Notifications for the whole lifecycle | deviation → recovery-ready → rerouted → completed, ordered | `NotificationTest` (7 lifecycle cases) |

### Live E2E (executed in the browser, 2026-09-06/07)

1. Search Tahrir → Giza (real Arabic geocode origin "ميدان التحرير").
2. Select option → details drawer (timeline + score explanation) → Save
   (dedup: repeated click = 1 POST) → Start → navigated to
   `/active-journeys/3` (status `active`).
3. GPS ping on-route → progress 0% → 8%, next-stop pill updated.
4. Deviation ping (7.7 km off-corridor) → status `deviated`,
   deviation screen with severity/expected-stop/coordinates; resume
   correctly disabled (high severity).
5. "Find New Routes" → 3 recovery options with delay comparison and
   route-preview maps → accept → status `rerouted` → complete →
   notification feed shows the full ordered story.

## OSRM service audit (adapter layer, re-verified)

| Service | Result |
|---|---|
| `/route/v1/foot` | Ok — 493 m / 359 s (real walking pace ~1.37 m/s) |
| `/nearest/v1/foot` | Ok — snaps to "ميدان التحرير" at 39 m |
| `/table/v1/foot` | Ok — durations matrix 358.9 s |
| `/match/v1/foot` | Ok — 5-point trace matched, 5 tracepoints |

**Conclusion:** both Phase 5 (coherent multimodal end-to-end journeys) and
Phase 6 (live guidance + deviation/recovery actually implemented, tested and
browser-verified) are confirmed — not merely designed.
