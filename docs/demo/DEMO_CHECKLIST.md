# Wasel Egypt — Deterministic Demo Checklist

**Audience:** anyone demoing the product (evaluator, stakeholder, new developer).
**Preconditions:** backend + data + OSRM + frontend running per `docs/RUNBOOK.md`;
test account registered (any email works — use a fresh one per demo run).

All scenarios below were executed against the live database during QA
(2026-09-10). Expected results are stable representative outputs — exact
minutes may shift ±2 with the clock; structure (modes, transfers, fare
presence) is deterministic.

Conventions: EN UI unless marked AR. Times shown are Cairo wall clock.

---

## D1. Landing → search entry (guest)
1. Open `/` → hero shows origin/destination fields + "Plan your journey".
2. Origin: type `Tahrir` → pick **"Ali Abdel Halim St. & Tahrir St."** (stop).
3. Destination: type `29.9773, 31.1325` (coordinates paste works).
4. Submit → redirected to `/login` (search API is authenticated).
5. Log in → lands on `/search` with **both fields pre-filled**.
**Expect:** no data entry repeated; validation messages appear if submitted empty.

## D2. Journey search + compare (Mar Girgis → Saad Zaghloul, metro)
1. On `/search`: origin `30.0079, 31.2297`, destination `30.0279, 31.2358`
   (or pick the stops by name). Press **Now**, then **Find journeys**.
2. **Expect (~2–5 s):** `/journeys/results` with 3 options; first card
   **Direct, ~6–11 min, `8 EGP`** + line
   "Fare: Cairo Metro, recorded Oct 2024 (TfC via Mobility Database)".
3. Map shows the **mode-colored route**, origin (blue ring) + destination
   (gold) pins, stop dots, legend, grouped controls. No console errors.

## D3. Route details + fare honesty
1. Click the first option → drawer: timeline (Walk → Metro · Line 1 → Walk),
   score bars, **Save journey** (Start disabled until saved).
2. Non-metro options show **no fare and no attribution** (expected: the fare
   matrix covers pure-metro journeys only — never invented).

## D4. Line page (`/routes/1012` = Line 1)
1. Header: Line 1, operator, mode dot, reliability; direction tabs
   (New Marg / Helwan Metro); map traces the line shape with stop dots.
2. Frequency card shows real windows (e.g. "Every 5 min, 07:00 – 10:00");
   35 ordered stops (Tahrir Square #17 … Helwan Metro #35).
3. **Stop panel:** click any stop dot → serving lines + live next departures
   ("2 min / 8 min / 13 min" style) or an honest "no timetable" note.
4. **Set as origin** → `/search` prefilled (guests via login first).

## D5. Current location → search
1. On `/search`, clear the origin → crosshair button appears → click it,
   grant permission → origin becomes **"My current location"** with the
   "Using your current location" meta; map shows the halo dot + recenters.
2. Deny permission → honest message, manual entry unaffected.

## D6. Save → start → track → deviate → recover → complete
1. From results drawer: **Save journey** (~30–60 s backend re-plan; spinner
   shows) → "Saved to your trips" → **Start journey** → `/active-journeys/:id`
   with progress bar, next stop, live map.
2. **Simulate deviation** (GPS demo card) → auto-opens `/deviation` with
   severity, expected stop, detection coordinates.
3. **Find New Routes** (~1–2 min) → 3 recovery options with delay badges →
   **Use this route** → status `rerouted` + new itinerary.
4. **Complete journey** (confirm dialog) → toast + redirect home.
5. `/notifications`: entries for journey-started + deviation detected
   (unread badge increments).

## D7. Arabic + responsive
1. Toggle **العربية** anywhere → full RTL mirror ( hero, planner, drawer,
   timeline, map controls, stop panel, route page), Arabic countdowns.
2. Resize 1440 → 768 → 390: no horizontal overflow; results map becomes a
   bottom sheet ("View on map"); drawer becomes full-width sheet.

## D8. Honest states to show (all real)
- Unknown line `/routes/999999` → designed 404 card (no fake line).
- Variant without geometry → stops list, no invented polyline.
- Stop variant without timetable → "no timetable data", no fake minutes.
- Geolocation denied → message + manual entry.
- Map engine failure → static fallback panel; routing still works below it.

## Timing cheat-sheet (measured, local machine)
- Stop/route/departure reads: < 1 s · Autocomplete: < 1 s
- Journey search (3 alts): 1–5 s · Save: 30–60 s · Recovery gen: 1–2 min
- Never poll: all waits are single requests with loading states.
