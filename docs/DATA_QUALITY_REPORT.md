# Transit Data Quality Report — 2026-09-10

Read-only audit of the live MariaDB dataset (~3,025 stops / 1,014 routes /
1,792 active variants). **No records were modified, deleted, or overwritten** —
findings are documented for a future, deliberate cleanup pass with provenance
preserved (GTFS mdb-3355, Transport for Cairo, CC-BY-NC-SA).

## Overall verdict
The dataset is structurally healthy: no orphaned relations, no broken stop
sequences, no out-of-bounds coordinates, and every active variant has schedules
and stored geometry. The findings below are minor and localized.

## Findings

### F1 — True duplicate stops (5 pairs, LOW volume)
Same name AND near-identical coordinates (< ~11 m):
| Stop | Ids |
|---|---|
| Obour Market - South | #38 ~ #392 |
| Obour Market station | #39 ~ #2443 |
| Obour Market | #40 ~ #41 |
| Bus Stop 43 (Al Matareyya) | #60 ~ #174 |
| Mafareq | #72 ~ #73 |

Impact: possible duplicate pins at extreme zoom in Obour Market area; planner
dedupe-by-id unaffected (different ids). **No action taken** — merging requires
foreign-key remapping (route_stops, stop_times, journey_legs…) and should be
a deliberate migration, not a silent edit.

### F2 — Same-name stops at different locations (8 names, EXPECTED)
"Moneeb ×16", "Abboud ×10", "Giza Square ×9", "Roxy ×8", "Saqr Quraish ×8",
"Imbaba ×8", "Moassasa ×7", "Salam Station ×7" — these are real Cairo
phenomena: multiple minibus stands around one landmark share its name. Not
duplicates; no action. (Search UX already dedupes suggestions by id+coords.)

### F3 — Stacked coordinates (1 pair, NEGLIGIBLE)
"Mohamed Farid St. & Al Mathan St." — two records at exactly
(30.168118, 31.411206). Same class as F1.

### F4 — One variant with a single route_stop
One active-variant candidate has < 2 stops (a variant needs ≥ 2 to be
traversable). The planner requires ≥ 2 ordered stops to use a variant, so it
is already excluded from routing automatically. The line page filters empty
stop lists the same way. Documented, not deleted.

### F5 — Stop names are English/Latin only
All 3,025 stop names are Latin-script (TfC GTFS feed `stop_name` verbatim —
transit_stops has a single `name` column, no `name_ar`).
Consequence: Arabic *stop-name* LIKE search returns 0 rows.
Arabic *place* search works fully (server-proxied Photon geocoder returns
"ميدان التحرير" etc.), so Arabic users DO get usable autocomplete — via the
places section, not the stops section. Verified E2E: Arabic query
"ميدان التحرير" → 6 real place results.
Adding `name_ar` would require a curated translation source; none is
verifiable today, so none was invented. Candidate future task: TfC/OSM
name:ar tags import with provenance.

### F6 — Direction field is "loop" for metro variants
GTFS direction_id for the TfC metro feed imports as `loop` for both Line 1
variants; the real direction signal is `headsign` ("New Marg" /
"Helwan Metro"). The line page therefore surfaces headsign as the direction
label (correct UX), not the raw direction enum.

## Checks that PASSED (no action needed)
- Coordinates: 0 stops outside Egypt bounds; 0 NULLs.
- Stop sequences: 0 duplicate (variant, sequence) rows; ordering intact.
- Orphans: 0 route_stops without variants; 0 stop_times without schedules.
- Schedules: 1,792/1,792 active variants have ≥ 1 active schedule;
  0 active schedules without stop_times. 1,765 frequency-based + 28 exact.
- Geometry: 0 active variants without stored polylines.
- Fares: unchanged, verified metro-only (mdb-3354, Oct 2024, key
  `tfc_metro_fares`); bus/minibus/microbus fares correctly absent.
- Service alerts: 0 currently active (empty state verified).

## Sources & licenses (unchanged)
- GTFS Greater Cairo: Mobility Database feed mdb-3355 — © Transport for Cairo,
  CC-BY-NC-SA. Stop names imported verbatim from `stops.txt`.
- Cairo Metro fares: Mobility Database feed mdb-3354 (Oct 2024) — the only
  priced mode; all others render honest "unavailable" states.
- Map data © OpenStreetMap contributors (tiles + Photon geocoding proxy).
