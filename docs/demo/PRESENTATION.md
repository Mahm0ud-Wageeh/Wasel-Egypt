# Wasel Egypt — Project Presentation (academic summary)

## Problem
Greater Cairo's transit spans disconnected worlds — metro, CTA buses, licensed
minibuses, paratransit microbuses — with no single source that plans a door-to-door
journey, tracks it, or recovers when reality deviates. Commuters guess; visitors
are lost.

## Solution
A bilingual (EN/AR, RTL-first) journey platform: plan multimodal trips with
transparent ranking, ride with live awareness, get rerouted from the actual
position on deviation, and consult real line/stop/departure information —
all backed exclusively by imported open data, never placeholders.

## Architecture
React 18 SPA (token CSS, lazy map bundle) → Laravel 12 REST API (Sanctum) →
MySQL (GTFS static) + self-hosted OSRM foot router. Photon geocoding is
proxied server-side (cached, throttled). Planning runs in Africa/Cairo
wall-clock against GTFS times; tracking/deviation math on instants.

## Data (all real, all attributed)
- Transport for Cairo GTFS via Mobility Database (mdb-3355): 3,025 stops,
  1,014 routes, 1,792 variants with schedules + geometry (CC-BY-NC-SA-2.0)
- Cairo Metro fares (mdb-3354, Oct-2024: 8/10/15/20 EGP), pure-metro only
- OpenStreetMap (stations, shapes, tiles) + OSM-relation metro Lines 1–3 (ODbL)

## Routing
Server-side planner: direct + one-transfer candidate expansion over the variant
graph, road-aware walking via OSRM (honest straight-line fallback labeled),
explainable scoring (time .40 / walk .20 / transfers .20 / fare .10 /
reliability .10), frequency-grid + exact-timetable departures.

## Journey execution
Saved journeys start into live tracking (progress %, next stop, ETA, GPS pings);
deviation detection (off-route corridor + missed-stop grace) fires typed,
severity-graded events; recovery generates reroutes from the live position;
accept flips the trip to `rerouted`; completion archives it. Every step
notifies the inbox.

## Intelligent deviation/recovery
Detection is spatial-first (corridor distance, arrival radius) with time-gated
missed stops; high severity disables unsafe resume; recovery re-plans from the
deviation point and reports delay-vs-original per option.

## Community/trust
Rider reports (delays, crowding, safety…) are moderated before going public;
verified reporters accumulate trust; public feed + service alerts surface live.

## Results (verified)
- Backend 274/274, frontend 118/118, production build green
- Real-browser E2E incl. save→start→deviate→recover→reroute→complete
- EN + AR at 390/768/1440, zero console errors
- Data quality report: 0 critical issues (3 documented warnings)
- Example: Mar Girgis → Saad Zaghloul, 6 min direct, 8 EGP, attributed

## Limitations
Metro-only fares; no realtime vehicle positions (none published for Cairo);
planning latency seconds warm (single-threaded dev server serializes);
OSM tiles suit demo volume (keyed provider needed at scale).

## Future work
GTFS-RT ingestion (reader built, inert), headway-aware transfers,
wheelchair constraints, push notifications, analytics dashboards.
