# Wasel Egypt — Final Demo Flow (professor walkthrough, ~12 minutes)

**Setup (before the audience arrives):** backend + MySQL + OSRM + `npm run dev`
per `docs/RUNBOOK.md`. Open `http://127.0.0.1:5173/` in a fresh profile
(guest state). Keep DevTools closed; open it only if asked about errors
(console is clean). Cairo wall-clock morning shows the product best.

Use a fresh test account per run (register in 20 s). All data below is the
real imported network — nothing is staged.

---

## Act 1 — The problem in one search (3 min)
1. **Landing.** Point out: the hero is a working planner, not a poster —
   origin/destination autocomplete over real stops + places, current-location
   button, swap.
2. Type origin `Tahrir`, pick **Ali Abdel Halim St. & Tahrir St.**
   Destination: paste `29.9773, 31.1325`. Submit as guest → login wall →
   explain the API is authenticated → log in → fields arrive **pre-filled**.
3. **Find journeys** → 3 ranked options with durations, transfers, reliability.

## Act 2 — Trust the answer (3 min)
1. Open the first option: timeline (Walk → transit → Walk), score bars with
   the documented weights, **Save journey** → **Start journey**.
2. Metro case (Mar Girgis → Saad Zaghloul): point at **`8 EGP`** and the
   attribution line *"Fare: Cairo Metro, recorded Oct 2024 (TfC via Mobility
   Database)"*. Then a bus option: **no fare shown** — state explicitly:
   *"We show no fare where no source exists. We never invent prices."*

## Act 3 — The network is real (2 min)
1. `/routes/1012` (Line 1): 35 ordered stops New Marg → Helwan, both
   directions, stored shape on the map, real frequency windows
   ("Every 5 min, 07:00 – 10:00").
2. Click any stop dot → **stop panel**: serving lines + live next departures
   with minute countdowns → **Set as origin** → planner prefilled.

## Act 4 — It survives reality (3 min)
1. Active journey → **Simulate deviation** → deviation page: severity,
   expected stop, detection coordinates.
2. **Find New Routes** → 3 recovery options with delay badges →
   **Use this route** → status flips to `rerouted` with the new itinerary.
3. **Complete journey** → notifications inbox gains entries (badge count).

## Act 5 — One language, every screen (1 min)
Toggle **العربية**: full RTL mirror including timeline, drawer, map
controls, stop panel. Resize to 390 px: bottom-sheet map, no overflow.

## If something is slow
- First search/save/recovery runs full-network planning (seconds on warm
  cache; save/recovery re-plan, ~30–120 s) — loading states cover every wait.
- Never concurrent long requests against single-threaded `php artisan serve`
  during a demo; production uses concurrent PHP (see production checklist).

## Lines to land
- "Every number on screen traces to GTFS, OSM, or Photon — nothing is mocked."
- "Where data doesn't exist (bus fares, realtime positions), the UI says so."
- "Morning searches work because planning runs in Cairo wall-clock time."
