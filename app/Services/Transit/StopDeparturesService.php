<?php

namespace App\Services\Transit;

use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitStop;
use Carbon\Carbon;

/**
 * Next departures at a stop (public stop info panel).
 *
 * The departure-resolution logic mirrors JourneyPlannerService's
 * resolveFrequencyDeparture/stop-time pass (same schedules +
 * stop_times + frequency_windows sources, same headway-grid
 * semantics) but is exposed per-stop for the map stop panel:
 * for each active variant serving the stop, the next departure
 * at/after "now" within the service day.
 *
 * Honesty rules (same as the planner):
 * - Only schedules active on the travel date are considered.
 * - Frequency services return headway-grid departures; exact
 *   timetables return their stored times.
 * - When a variant has no usable schedule, it is listed WITHOUT
 *   a departure time (estimates are never invented) — the panel
 *   shows it as "no timetable data" rather than a fake minute.
 */
class StopDeparturesService
{
    /** Max upcoming departures returned per variant. */
    private const PER_VARIANT_LIMIT = 3;

    /**
     * Upcoming departures at $stop, grouped per serving variant.
     *
     * @return array<int, array{
     *   route_variant_id: int,
     *   headsign: string|null,
     *   mode: string,
     *   route_id: int|null,
     *   route_short_name: string|null,
     *   route_long_name: string|null,
     *   route_color: string|null,
     *   departures: array<int, array{time: string, source: 'timetable'|'frequency'}>,
     *   has_timetable: bool,
     * }>
     */
    public function upcomingDepartures(TransitStop $stop, ?Carbon $from = null, int $limitPerVariant = self::PER_VARIANT_LIMIT): array
    {
        // Same time-frame contract as the planner: GTFS times are Cairo
        // wall-clock, so "now" is Cairo wall time (see JourneyPlannerService).
        $from ??= Carbon::now('Africa/Cairo');
        $travelDate = $from->copy()->startOfDay();

        // Serving variants: active route stops on the stop, with their route + mode.
        $routeStops = $stop->routeStops()
            ->with(['routeVariant.route.transitMode'])
            ->get()
            ->filter(fn ($rs) => $rs->routeVariant && $rs->routeVariant->active && $rs->routeVariant->route)
            ->sortBy(fn ($rs) => $rs->routeVariant->id)
            ->values();

        $results = [];

        foreach ($routeStops as $routeStop) {
            $variant = $routeStop->routeVariant;
            $route = $variant->route;

            $entry = [
                'route_variant_id' => $variant->id,
                'headsign' => $variant->headsign,
                'mode' => $route->transitMode->name ?? 'bus',
                'route_id' => $route->id,
                'route_short_name' => $route->short_name,
                'route_long_name' => $route->long_name,
                'route_color' => $route->color,
                'departures' => [],
                'has_timetable' => false,
            ];

            $departures = $this->variantDeparturesAtStop(
                $variant->id,
                $stop->id,
                $travelDate,
                $from,
                $limitPerVariant
            );

            if ($departures !== []) {
                $entry['departures'] = $departures;
                $entry['has_timetable'] = true;
            }

            $results[] = $entry;
        }

        return $results;
    }

    /**
     * Resolve the next departures of one variant at one stop.
     *
     * @return array<int, array{time: string, source: string}>
     */
    private function variantDeparturesAtStop(int $variantId, int $stopId, Carbon $travelDate, Carbon $from, int $limit): array
    {
        $schedules = Schedule::where('route_variant_id', $variantId)
            ->where('is_active', true)
            // whereDate normalizes across drivers: MySQL stores pure dates,
            // sqlite stores "YYYY-MM-DD 00:00:00" after Carbon binding, and a
            // plain string comparison of "2026-09-09 00:00:00" <= "2026-09-09"
            // is false on sqlite. (Same semantics as the planner's date check.)
            ->whereDate('start_date', '<=', $travelDate->toDateString())
            ->where(function ($query) use ($travelDate) {
                $query->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $travelDate->toDateString());
            })
            ->orderBy('id')
            ->get();

        $departures = [];

        foreach ($schedules as $schedule) {
            $stopTime = StopTime::where('schedule_id', $schedule->id)
                ->where('transit_stop_id', $stopId)
                ->first();

            if (!$stopTime || $stopTime->departure_time === null) {
                continue;
            }

            $windows = $schedule->frequency_windows;

            if (is_array($windows) && $windows !== []) {
                // Frequency service: next headway-grid departures from the
                // window start, identical semantics to the planner.
                foreach ($windows as $window) {
                    $windowStart = $this->combineDateAndTime($travelDate, $window['start_time'] ?? null);
                    $windowEnd = $this->combineDateAndTime($travelDate, $window['end_time'] ?? null);
                    $headway = max(60, (int) ($window['headway_secs'] ?? 0));

                    if ($windowStart === null || $windowEnd === null || $headway < 60) {
                        continue;
                    }

                    $offset = max(0, $from->getTimestamp() - $windowStart->getTimestamp());
                    $first = $windowStart->copy()->addSeconds((int) (ceil($offset / $headway) * $headway));

                    for ($i = 0; $i < $limit; $i++) {
                        $candidate = $first->copy()->addSeconds($i * $headway);
                        if ($candidate->greaterThan($windowEnd) || $candidate->lessThan($from)) {
                            break;
                        }
                        $departures[] = [
                            'time' => $candidate->toISOString(),
                            'source' => 'frequency',
                        ];
                    }
                }

                continue;
            }

            // Exact timetable: the stored trip time for today.
            $departure = $this->combineDateAndTime($travelDate, $stopTime->departure_time);
            if ($departure !== null && $departure->greaterThanOrEqualTo($from)) {
                $departures[] = [
                    'time' => $departure->toISOString(),
                    'source' => 'timetable',
                ];
            }
        }

        // Earliest first, cap at limit.
        usort($departures, fn ($a, $b) => strcmp($a['time'], $b['time']));

        return array_slice($departures, 0, $limit);
    }

    /**
     * Combine a travel date with a HH:MM[:SS] GTFS time string.
     * Returns null for out-of-range values such as "25:30:00".
     */
    private function combineDateAndTime(Carbon $travelDate, ?string $time): ?Carbon
    {
        if (!$time) {
            return null;
        }

        $parts = explode(':', $time);

        if (count($parts) < 2 || (int) $parts[0] > 23) {
            return null;
        }

        return $travelDate->copy()->setTime((int) $parts[0], (int) ($parts[1] ?? 0), (int) ($parts[2] ?? 0));
    }
}
