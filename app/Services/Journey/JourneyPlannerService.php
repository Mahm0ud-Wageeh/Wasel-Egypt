<?php

namespace App\Services\Journey;

use App\Models\AnalyticsEvent;
use App\Models\RouteGeometry;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\ServiceAlert;
use App\Models\StopTime;
use App\Models\TransitStop;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Deterministic journey planner.
 *
 * Generates candidate journey plans (walking-only, direct transit, and
 * one-transfer transit) for an origin/destination pair, then scores and
 * ranks them via JourneyScoringService. The planner never persists data and
 * produces identical output for identical inputs (no randomness, stable
 * query ordering, tie-breaking on stable keys).
 */
class JourneyPlannerService
{
    /** Access/egress stop search radius when no preference overrides it. */
    public const DEFAULT_MAX_WALK_METERS = 1000;

    /**
     * Maximum boarding/alighting stops per endpoint. Dense paratransit
     * networks concentrate many local loops at the nearest stops; a larger
     * candidate pool is required to reach trunk services for cross-city
     * journeys.
     */
    public const MAX_STOP_CANDIDATES = 12;

    /** Maximum interchange stops examined per incoming variant. */
    public const MAX_INTERCHANGE_STOPS = 8;

    /** Default wait when boarding the first service or transferring. */
    public const DEFAULT_WAIT_SEC = 300;

    /** Hard cap on candidate plans before scoring. */
    public const MAX_CANDIDATE_PLANS = 40;

    /** Score penalty multiplier for plans using disrupted variants/stops. */
    public const DISRUPTION_PENALTY = 1.25;

    /**
     * Per-search memo of schedule lookups so repeated resolves of the same
     * variant (many candidates share variants) hit memory, not the database.
     */
    private array $scheduleMemo = [];

    /**
     * Per-search memo of variant → route polyline lookups for transit legs.
     */
    private array $geometryMemo = [];

    /**
     * Network index fingerprint for cache invalidation: any structural change
     * to variants or route_stops (import, admin edit) rotates the cache key.
     */
    private ?string $indexFingerprint = null;

    private ?array $cachedIndex = null;

    public function __construct(
        private JourneyScoringService $scorer,
        private FareEstimator $fares,
        private RoadAwareWalkingService $walking,
    ) {
    }

    /**
     * Search ranked journey options for a user.
     *
     * @param array $params Validated search parameters (origin/destination lat+lng,
     *                      optional requested_at, max_transfers, max_walk_distance_per_leg,
     *                      preferred_modes, avoided_modes, alternatives).
     * @return array ['origin' => ..., 'destination' => ..., 'requested_at' => ..., 'options' => [...]]
     */
    public function search(User $user, array $params): array
    {
        // Time-frame contract: GTFS static times (schedules, stop_times,
        // frequency windows, service calendars) are Cairo wall-clock times.
        // Planning MUST run in Africa/Cairo so "now" and requested_at line
        // up with the published service day. Carbon::parse keeps an explicit
        // offset when present (frontend "now" is UTC ISO) and assumes Cairo
        // wall time for naive input (frontend datetime-local) — both resolve
        // to the same Cairo wall clock for Cairo passengers.
        $requestedAt = isset($params['requested_at'])
            ? Carbon::parse($params['requested_at'], 'Africa/Cairo')->setTimezone('Africa/Cairo')
            : Carbon::now('Africa/Cairo');

        $prefs = $user->preferences()->first();

        $options = $this->plan(
            (float) $params['origin_lat'],
            (float) $params['origin_lng'],
            (float) $params['destination_lat'],
            (float) $params['destination_lng'],
            $prefs,
            $requestedAt,
            (int) ($params['alternatives'] ?? 3),
            [
                'max_transfers' => $params['max_transfers'] ?? null,
                'max_walk_distance_per_leg' => $params['max_walk_distance_per_leg'] ?? null,
                'preferred_modes' => $params['preferred_modes'] ?? null,
                'avoided_modes' => $params['avoided_modes'] ?? null,
            ],
        );

        // Usage analytics: a lightweight search event per planner search.
        AnalyticsEvent::create([
            'user_id' => $user->id,
            'event_type' => 'journey_search',
            'properties' => [
                'options_returned' => count($options),
                'alternatives' => (int) ($params['alternatives'] ?? 3),
            ],
            'occurred_at' => Carbon::now(),
        ]);

        return [
            'origin' => ['lat' => (float) $params['origin_lat'], 'lng' => (float) $params['origin_lng']],
            'destination' => ['lat' => (float) $params['destination_lat'], 'lng' => (float) $params['destination_lng']],
            'requested_at' => $requestedAt->toIso8601String(),
            'options' => $options,
        ];
    }

    /**
     * Build, score and rank journey plans.
     *
     * @return array Sorted list of plan structures.
     */
    public function plan(
        float $originLat,
        float $originLng,
        float $destinationLat,
        float $destinationLng,
        ?object $prefs,
        Carbon $requestedAt,
        int $optionCount = 3,
        array $overrides = [],
    ): array {
        $maxWalk = (int) ($overrides['max_walk_distance_per_leg']
            ?? $prefs?->max_walk_distance_per_leg
            ?? self::DEFAULT_MAX_WALK_METERS);
        $maxTransfers = (int) ($overrides['max_transfers'] ?? $prefs?->max_transfers ?? 3);
        $avoidedModes = $overrides['avoided_modes'] ?? $prefs?->avoided_modes ?? [];

        $this->scheduleMemo = [];
        $this->geometryMemo = [];
        $disruptions = $this->activeDisruptions($requestedAt);

        $plans = [];

        // Walking-only option when the whole trip fits in one walk.
        $directDistance = GeoCalculator::distanceMeters($originLat, $originLng, $destinationLat, $destinationLng);
        if ($directDistance <= $maxWalk) {
            $plans[] = $this->walkingPlan($originLat, $originLng, $destinationLat, $destinationLng, $prefs, $requestedAt);
        }

        if ($maxTransfers >= 0 && $directDistance > 0) {
            $plans = array_merge(
                $plans,
                $this->transitPlans(
                    $originLat,
                    $originLng,
                    $destinationLat,
                    $destinationLng,
                    $prefs,
                    $requestedAt,
                    $maxWalk,
                    $maxTransfers,
                    $avoidedModes,
                )
            );
        }

        // Fare is attached before scoring so the scorer knows whether it is available.
        // Duplicate signatures (identical variant/stop sequences) are dropped.
        $unique = [];
        foreach ($plans as $plan) {
            if (empty($plan['duplicate'])) {
                $unique[] = $plan;
            }
        }
        unset($plan);

        foreach ($unique as &$plan) {
            $plan['fare'] = $this->fares->estimate($plan);
        }
        unset($plan);

        $ranked = $this->scorer->score($unique, $prefs);

        // Disruption awareness: penalize and flag plans touching disrupted
        // variants/stops, then re-rank. Applied after base scoring so the
        // scorer's own weight contract stays intact.
        if ($disruptions['variants'] !== [] || $disruptions['stops'] !== []) {
            foreach ($ranked as &$plan) {
                $alerts = $this->planDisruptionAlerts($plan, $disruptions);
                if ($alerts !== []) {
                    $plan['disrupted'] = true;
                    $plan['alerts'] = $alerts;
                    $plan['score'] = round($plan['score'] * self::DISRUPTION_PENALTY, 4);
                }
            }
            unset($plan);

            usort($ranked, fn (array $a, array $b) => [$a['score'], $a['legs'][0]['departure_time']->getTimestamp()]
                <=> [$b['score'], $b['legs'][0]['departure_time']->getTimestamp()]);
        }

        return array_slice($ranked, 0, max(1, $optionCount));
    }

    /**
     * Single walking leg covering the whole trip.
     */
    private function walkingPlan(
        float $originLat,
        float $originLng,
        float $destinationLat,
        float $destinationLng,
        ?object $prefs,
        Carbon $requestedAt,
    ): array {
        $walk = $this->resolveWalk($originLat, $originLng, $destinationLat, $destinationLng, $prefs?->walk_speed);

        return [
            'legs' => [
                $this->walkingLeg(
                    null,
                    null,
                    $originLat,
                    $originLng,
                    $destinationLat,
                    $destinationLng,
                    $requestedAt->copy(),
                    $requestedAt->copy()->addSeconds($walk['duration_sec']),
                    $walk['distance'],
                    $walk['geometry'],
                    $walk['source'],
                ),
            ],
            'transfers' => [],
            'total_duration_sec' => $walk['duration_sec'],
            'total_transfers' => 0,
            'walk_distance_meters' => $walk['distance'],
            'reliability' => 1.0,
        ];
    }

    /**
     * Generate transit-based candidate plans (direct and one-transfer).
     *
     * Strategy: compute board-eligible variants for each endpoint (variants
     * genuinely calling at a stop within the walk radius), assemble direct
     * plans from variants boardable at both ends with correct stop order,
     * then one-transfer plans through interchanges: any stop after the
     * origin boarding position on an origin-boardable variant where a
     * dest-boardable variant can be boarded onwards. This finds real
     * cross-city journeys on dense networks where naive nearest-stop pairing
     * only ever meets local loops.
     */
    private function transitPlans(
        float $originLat,
        float $originLng,
        float $destinationLat,
        float $destinationLng,
        ?object $prefs,
        Carbon $requestedAt,
        int $maxWalk,
        int $maxTransfers,
        array $avoidedModes,
    ): array {
        $network = $this->networkIndex($avoidedModes);

        if ($network['variants'] === []) {
            return [];
        }

        $originStops = $this->stopsNear($originLat, $originLng, $maxWalk, $network['stops'], $prefs);
        $destStops = $this->stopsNear($destinationLat, $destinationLng, $maxWalk, $network['stops'], $prefs);

        if ($originStops === [] || $destStops === []) {
            return [];
        }

        // Board-eligible variant maps for each endpoint (single round).
        $originBoard = $this->boardableVariants($originStops, $network);
        $destBoard = $this->boardableVariants($destStops, $network);

        if ($originBoard === [] || $destBoard === []) {
            return [];
        }

        $plans = [];
        $seen = [];

        // ---- Direct plans: a variant boardable at an origin stop that also
        // serves a dest-near stop later in its sequence.
        foreach (array_intersect_key($originBoard, $destBoard) as $variantId => $originBoardings) {
            $variant = $network['variants'][$variantId];

            foreach ($originBoardings as $originStopId) {
                $originStop = $network['stops'][$originStopId];
                $posO = $variant['positions'][$originStopId] ?? null;
                if ($posO === null) {
                    continue;
                }

                foreach ($destBoard[$variantId] as $destStopId) {
                    $posD = $variant['positions'][$destStopId] ?? null;
                    if ($posD === null || $posO >= $posD) {
                        continue;
                    }
                    $destStop = $network['stops'][$destStopId];

                    $plans[] = $this->assemblePlan(
                        [$this->buildTransitLeg($variant, $originStop, $destStop, $requestedAt)],
                        $originStop,
                        $destStop,
                        $originLat,
                        $originLng,
                        $destinationLat,
                        $destinationLng,
                        $prefs,
                        $requestedAt,
                        $seen,
                    );

                    if (count($plans) >= self::MAX_CANDIDATE_PLANS) {
                        return $plans;
                    }
                }
            }
        }

        if ($maxTransfers < 1) {
            return $plans;
        }

        // ---- One-transfer plans: ride an origin-boardable variant forward
        // to any of its stops (the interchange), then a dest-boardable variant
        // from that interchange onwards. Interchange candidates are ranked by
        // destination proximity and bounded.
        $interchangeSets = [];

        foreach ($originBoard as $firstVariantId => $originBoardings) {
            $firstVariant = $network['variants'][$firstVariantId];

            foreach ($originBoardings as $originStopId) {
                $posO = $firstVariant['positions'][$originStopId] ?? null;
                if ($posO === null) {
                    continue;
                }

                // All stops after boarding are potential interchanges.
                foreach ($firstVariant['stops'] as $candidateStopId) {
                    $posI = $firstVariant['positions'][$candidateStopId] ?? null;
                    if ($posI === null || $posI <= $posO || $candidateStopId === $originStopId) {
                        continue;
                    }

                    // Any dest-boardable variant serving this interchange?
                    foreach ($network['stop_variants'][$candidateStopId] ?? [] as $secondVariantId) {
                        if ($secondVariantId === $firstVariantId || !isset($destBoard[$secondVariantId])) {
                            continue;
                        }

                        $interchangeSets[$candidateStopId][$firstVariantId . ':' . $originStopId][] = $secondVariantId;
                    }
                }
            }
        }

        if ($interchangeSets === []) {
            return $plans;
        }

        // Rank interchange stops by destination proximity; examine the best
        // bounded set (distinct stops), then assemble.
        $interchanges = [];
        foreach ($interchangeSets as $stopId => $void) {
            $interchanges[] = $network['stops'][$stopId];
        }
        usort($interchanges, fn (array $a, array $b) =>
            [GeoCalculator::distanceMeters($destinationLat, $destinationLng, $a['lat'], $a['lng']), $a['id']]
            <=> [GeoCalculator::distanceMeters($destinationLat, $destinationLng, $b['lat'], $b['lng']), $b['id']]);
        $interchanges = array_slice($interchanges, 0, self::MAX_INTERCHANGE_STOPS * 4);

        foreach ($interchanges as $interchange) {
            foreach (($interchangeSets[$interchange['id']] ?? []) as $legKey => $secondVariantIds) {
                [$firstVariantId, $originStopId] = explode(':', $legKey);
                $firstVariant = $network['variants'][$firstVariantId];
                $originStop = $network['stops'][$originStopId];
                $posO = $firstVariant['positions'][$originStopId] ?? null;
                $posI = $firstVariant['positions'][$interchange['id']] ?? null;

                if ($posO === null || $posI === null || $posO >= $posI) {
                    continue;
                }

                $leg1 = $this->buildTransitLeg($firstVariant, $originStop, $interchange, $requestedAt);

                foreach (array_unique($secondVariantIds) as $secondVariantId) {
                    $secondVariant = $network['variants'][$secondVariantId];
                    $posI2 = $secondVariant['positions'][$interchange['id']] ?? null;
                    if ($posI2 === null) {
                        continue;
                    }

                    foreach ($destBoard[$secondVariantId] as $destStopId) {
                        $posD = $secondVariant['positions'][$destStopId] ?? null;
                        if ($posD === null || $posI2 >= $posD) {
                            continue;
                        }
                        $destStop = $network['stops'][$destStopId];

                        $leg2 = $this->buildTransitLeg($secondVariant, $interchange, $destStop, $leg1['arrival_time']);

                        $plans[] = $this->assemblePlan(
                            [$leg1, $leg2],
                            $originStop,
                            $destStop,
                            $originLat,
                            $originLng,
                            $destinationLat,
                            $destinationLng,
                            $prefs,
                            $requestedAt,
                            $seen,
                        );

                        if (count($plans) >= self::MAX_CANDIDATE_PLANS) {
                            return $plans;
                        }
                    }
                }
            }
        }

        return $plans;
    }

    /**
     * Board-eligible variants for one endpoint: variant_id => list of
     * endpoint-near stops where it genuinely calls (single round, no
     * expansion — keeps boarding semantics unambiguous).
     */
    private function boardableVariants(array $stops, array $network): array
    {
        $boardable = [];

        foreach ($stops as $stop) {
            foreach ($network['stop_variants'][$stop['id']] ?? [] as $variantId) {
                $boardable[$variantId][$stop['id']] = $stop['id'];
            }
        }

        foreach ($boardable as $variantId => $boarding) {
            $boardable[$variantId] = array_values($boarding);
        }

        return $boardable;
    }

    /**\n     * Combine transit legs/s, access/egress walks and transfers into a plan.
     *
     * @param array $seen Signature set used to drop duplicate plans.
     */
    private function assemblePlan(
        array $transitLegs,
        array $originStop,
        array $destStop,
        float $originLat,
        float $originLng,
        float $destinationLat,
        float $destinationLng,
        ?object $prefs,
        Carbon $requestedAt,
        array &$seen,
    ): array {
        $walkSpeed = $prefs?->walk_speed ?? 'average';
        $legs = [];
        $transfers = [];

        // Access walk from the requested origin to the first boarding stop.
        $accessWalk = $this->resolveWalk($originLat, $originLng, $originStop['lat'], $originStop['lng'], $walkSpeed);
        $legs[] = $this->walkingLeg(
            null,
            $originStop['id'],
            $originLat,
            $originLng,
            $originStop['lat'],
            $originStop['lng'],
            $requestedAt->copy(),
            $requestedAt->copy()->addSeconds($accessWalk['duration_sec']),
            $accessWalk['distance'],
            $accessWalk['geometry'],
            $accessWalk['source'],
        );

        $legCount = count($transitLegs);
        foreach ($transitLegs as $index => $leg) {
            if ($index > 0) {
                $previous = $transitLegs[$index - 1];
                $sameStop = $previous['to_stop']['id'] === $leg['from_stop']['id'];

                if ($sameStop) {
                    $waitSec = max(0, $leg['departure_time']->getTimestamp() - $previous['arrival_time']->getTimestamp());
                    $transfers[] = [
                        'from_leg_index' => count($legs) - 1,
                        'to_leg_index' => count($legs),
                        'transfer_type' => 'waiting',
                        'transfer_duration_sec' => $waitSec,
                        'from_lat' => $previous['to_lat'],
                        'from_longitude' => $previous['to_lng'],
                        'to_lat' => $leg['from_lat'],
                        'to_longitude' => $leg['from_lng'],
                    ];
                } else {
                    // Interchange on foot between two nearby stops.
                    $transferWalk = $this->resolveWalk($previous['to_lat'], $previous['to_lng'], $leg['from_lat'], $leg['from_lng'], $walkSpeed);
                    $walkDuration = $transferWalk['duration_sec'];

                    $transfer = [
                        'from_leg_index' => count($legs) - 1,
                        'to_leg_index' => count($legs),
                        'transfer_type' => 'transfer_walk',
                        'transfer_duration_sec' => $walkDuration,
                        'from_lat' => $previous['to_lat'],
                        'from_longitude' => $previous['to_lng'],
                        'to_lat' => $leg['from_lat'],
                        'to_longitude' => $leg['from_lng'],
                    ];

                    $walkFrom = Carbon::instance($previous['arrival_time']);
                    $transferLeg = $this->walkingLeg(
                        $previous['to_stop']['id'],
                        $leg['from_stop']['id'],
                        $previous['to_lat'],
                        $previous['to_lng'],
                        $leg['from_lat'],
                        $leg['from_lng'],
                        $walkFrom,
                        $walkFrom->copy()->addSeconds($walkDuration),
                        $transferWalk['distance'],
                        $transferWalk['geometry'],
                        $transferWalk['source'],
                    );
                    $legs[] = $transferLeg;
                    $transfer['to_leg_index'] = count($legs) - 1;
                    $transfers[] = $transfer;
                }
            }

            $legs[] = $leg;
        }

        $lastTransit = $transitLegs[$legCount - 1];

        // Egress walk from the final alighting stop to the requested destination.
        $egressWalk = $this->resolveWalk($lastTransit['to_lat'], $lastTransit['to_lng'], $destinationLat, $destinationLng, $walkSpeed);
        $legs[] = $this->walkingLeg(
            $destStop['id'],
            null,
            $lastTransit['to_lat'],
            $lastTransit['to_lng'],
            $destinationLat,
            $destinationLng,
            Carbon::instance($lastTransit['arrival_time']),
            Carbon::instance($lastTransit['arrival_time'])->addSeconds($egressWalk['duration_sec']),
            $egressWalk['distance'],
            $egressWalk['geometry'],
            $egressWalk['source'],
        );

        $walkDistance = array_sum(array_map(
            fn (array $leg) => $leg['type'] === 'walking' ? $leg['distance_meters'] : 0,
            $legs
        ));

        $totalDuration = max(0, $lastTransit['arrival_time']->getTimestamp() - $requestedAt->getTimestamp());

        $plan = [
            'legs' => $legs,
            'transfers' => $transfers,
            'total_duration_sec' => $totalDuration,
            'total_transfers' => count($transfers),
            'walk_distance_meters' => $walkDistance,
            'reliability' => array_sum(array_map(fn (array $leg) => $leg['reliability'], $transitLegs)) / $legCount,
        ];

        // De-duplicate identical journeys (same variant sequence and stops).
        $signature = implode('|', array_map(
            fn (array $leg) => $leg['type'] === 'transit'
                ? $leg['route_variant_id'].':'.$leg['from_stop']['id'].':'.$leg['to_stop']['id']
                : 'walk',
            $legs
        ));

        if (isset($seen[$signature])) {
            // Still return the plan; the caller may deduplicate. Marked as duplicate.
            $plan['duplicate'] = true;
        }
        $seen[$signature] = true;

        return $plan;
    }

    /**
     * Resolve a walking segment: road-aware route from OSRM when available
     * (actual distance, duration and geometry), otherwise the documented
     * straight-line fallback. The OSRM HTTP failure path returns null and is
     * silently absorbed here — a routing-engine outage must never break
     * search.
     *
     * @return array {
     *   @var int    $distance
     *   @var int    $duration_sec
     *   @var array|null $geometry [[lat,lng],...] road polyline or null for fallback
     *   @var string $source 'osrm'|'estimate'
     * }
     */
    private function resolveWalk(float $fromLat, float $fromLng, float $toLat, float $toLng, ?string $walkSpeed = null): array
    {
        $route = $this->walking->walkingRoute($fromLat, $fromLng, $toLat, $toLng);

        if ($route !== null) {
            return [
                'distance' => (int) $route['distance_meters'],
                'duration_sec' => (int) $route['duration_sec'],
                'geometry' => $route['geometry'],
                'source' => 'osrm',
            ];
        }

        // Documented fallback: straight-line haversine with a circuity
        // allowance (urban walking overestimates by ~30% vs roads).
        $distance = (int) round(GeoCalculator::distanceMeters($fromLat, $fromLng, $toLat, $toLng) * 1.3);

        return [
            'distance' => $distance,
            'duration_sec' => GeoCalculator::walkingDurationSec($distance, $walkSpeed ?? 'average'),
            'geometry' => null,
            'source' => 'estimate',
        ];
    }

    /**
     * Build a walking leg structure.
     */
    private function walkingLeg(
        ?int $fromStopId,
        ?int $toStopId,
        float $fromLat,
        float $fromLng,
        float $toLat,
        float $toLng,
        Carbon $departure,
        Carbon $arrival,
        int $distance,
        ?array $geometry = null,
        string $walkSource = 'estimate',
    ): array {
        return [
            'type' => 'walking',
            'mode' => 'walking',
            'route_variant_id' => null,
            'route' => null,
            'agency_id' => null,
            'from_stop' => $fromStopId ? ['id' => $fromStopId] : null,
            'to_stop' => $toStopId ? ['id' => $toStopId] : null,
            'from_lat' => $fromLat,
            'from_lng' => $fromLng,
            'to_lat' => $toLat,
            'to_lng' => $toLng,
            'departure_time' => $departure,
            'arrival_time' => $arrival,
            'duration_sec' => max(1, $arrival->getTimestamp() - $departure->getTimestamp()),
            'distance_meters' => $distance,
            'geometry' => $geometry,
            'walk_source' => $walkSource,
            'reliability' => 1.0,
        ];
    }

    /**
     * Build a transit leg between two stops of a variant, with a real
     * scheduled departure when one exists, otherwise a synthetic timetable.
     * Carries the variant's real route polyline (from route_geometry) when
     * stored; legs built from variants without geometry render as straight
     * stop-to-stop lines on the map (documented fallback).
     */
    private function buildTransitLeg(
        array $variant,
        array $fromStop,
        array $toStop,
        Carbon $earliestDeparture,
    ): array {
        [$departure, $arrival] = $this->resolveLegTimes($variant, $fromStop, $toStop, $earliestDeparture);

        $distance = $this->variantLegDistance($variant, $fromStop['id'], $toStop['id']);
        $geometry = $this->variantGeometry($variant['id']);

        return [
            'type' => 'transit',
            'mode' => $variant['mode'],
            'route_variant_id' => $variant['id'],
            'route' => $variant['route'],
            'agency_id' => $variant['agency_id'],
            'from_stop' => $fromStop,
            'to_stop' => $toStop,
            'from_lat' => $fromStop['lat'],
            'from_lng' => $fromStop['lng'],
            'to_lat' => $toStop['lat'],
            'to_lng' => $toStop['lng'],
            'departure_time' => $departure,
            'arrival_time' => $arrival,
            'duration_sec' => max(60, $arrival->getTimestamp() - $departure->getTimestamp()),
            'distance_meters' => $distance,
            'geometry' => $geometry,
            'geometry_source' => $geometry !== null ? 'route_geometry' : 'stop_to_stop',
            'reliability' => $variant['reliability'],
        ];
    }

    /**
     * Memoized variant polyline lookup (route_geometry.geometry is a
     * [[lat,lng],...] JSON array). One batched query keeps per-leg cost low.
     */
    private function variantGeometry(int $variantId): ?array
    {
        if (!array_key_exists($variantId, $this->geometryMemo)) {
            $row = RouteGeometry::where('route_variant_id', $variantId)->value('geometry');

            $this->geometryMemo[$variantId] = is_array($row) && count($row) >= 2 ? $row : null;
        }

        return $this->geometryMemo[$variantId];
    }

    /**
     * Determine departure/arrival datetimes for a transit leg.
     *
     * Looks for an active schedule with stop times covering both stops in
     * order. Exact-timetable schedules use their stored departure/arrival.
     * Frequency-based schedules (GTFS frequencies.txt, stored as
     * frequency_windows) compute the next headway-grid departure at/after the
     * earliest departure and derive the arrival from the template stop-time
     * offsets. Falls back to a synthetic timetable (fixed wait + mode speed)
     * when no usable schedule exists. Results are memoized per variant.
     *
     * @return array [Carbon departure, Carbon arrival]
     */
    private function resolveLegTimes(array $variant, array $fromStop, array $toStop, Carbon $earliestDeparture): array
    {
        $memoKey = $variant['id'] . ':' . $fromStop['id'] . ':' . $toStop['id'] . ':' . $earliestDeparture->getTimestamp();

        if (isset($this->scheduleMemo[$memoKey])) {
            return $this->scheduleMemo[$memoKey];
        }

        $resolved = $this->doResolveLegTimes($variant, $fromStop, $toStop, $earliestDeparture);
        $this->scheduleMemo[$memoKey] = $resolved;

        return $resolved;
    }

    private function doResolveLegTimes(array $variant, array $fromStop, array $toStop, Carbon $earliestDeparture): array
    {
        $travelDate = $earliestDeparture->copy()->startOfDay();

        $schedules = Schedule::where('route_variant_id', $variant['id'])
            ->where('is_active', true)
            ->where('start_date', '<=', $travelDate->toDateString())
            ->where(function ($query) use ($travelDate) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', $travelDate->toDateString());
            })
            ->orderBy('id')
            ->get();

        foreach ($schedules as $schedule) {
            $stopTimes = StopTime::where('schedule_id', $schedule->id)
                ->whereIn('transit_stop_id', [$fromStop['id'], $toStop['id']])
                ->orderBy('sequence')
                ->get()
                ->keyBy('transit_stop_id');

            $board = $stopTimes->get($fromStop['id']);
            $alight = $stopTimes->get($toStop['id']);

            if (!$board || !$alight || $alight->sequence <= $board->sequence) {
                continue;
            }

            $boardDeparture = $board->departure_time ?? $board->arrival_time;
            $alightArrival = $alight->arrival_time ?? $alight->departure_time;
            if ($boardDeparture === null || $alightArrival === null) {
                continue;
            }

            // Frequency-based service: next headway-grid departure.
            $windows = $schedule->frequency_windows;
            if (is_array($windows) && $windows !== []) {
                $resolved = $this->resolveFrequencyDeparture(
                    $travelDate,
                    $windows,
                    $boardDeparture,
                    $alightArrival,
                    $earliestDeparture
                );
                if ($resolved !== null) {
                    return $resolved;
                }

                continue;
            }

            $departure = $this->combineDateAndTime($travelDate, $boardDeparture);
            $arrival = $this->combineDateAndTime($travelDate, $alightArrival);

            if ($departure === null || $arrival === null) {
                continue;
            }

            if ($departure->lessThan($earliestDeparture)) {
                continue;
            }

            return [$departure, $arrival];
        }

        // Synthetic fallback timetable.
        $departure = $earliestDeparture->copy()->addSeconds(self::DEFAULT_WAIT_SEC);
        $distance = $this->variantLegDistance($variant, $fromStop['id'], $toStop['id']);
        $duration = (int) max(120, ceil($distance / GeoCalculator::transitSpeedMps($variant['mode'])));

        return [$departure, $departure->copy()->addSeconds($duration)];
    }

    /**
     * Compute the next headway-grid departure at/after $earliestDeparture
     * within the schedule's frequency windows, deriving the arrival from the
     * template stop-time offsets (stop_times of a frequency trip describe the
     * first vehicle of the window).
     */
    private function resolveFrequencyDeparture(
        Carbon $travelDate,
        array $windows,
        string $boardTime,
        string $alightTime,
        Carbon $earliestDeparture
    ): ?array {
        $templateBoard = $this->combineDateAndTime($travelDate, $boardTime);
        $templateAlight = $this->combineDateAndTime($travelDate, $alightTime);

        if ($templateBoard === null || $templateAlight === null) {
            return null;
        }

        $travelSeconds = $templateAlight->getTimestamp() - $templateBoard->getTimestamp();

        usort($windows, fn (array $a, array $b) => strcmp($a['start_time'], $b['start_time']));

        foreach ($windows as $window) {
            $windowStart = $this->combineDateAndTime($travelDate, $window['start_time']);
            $windowEnd = $this->combineDateAndTime($travelDate, $window['end_time']);
            $headway = max(60, (int) $window['headway_secs']);

            if ($windowStart === null || $windowEnd === null || $windowEnd->lessThan($earliestDeparture)) {
                continue;
            }

            // Snap up to the headway grid measured from the window start.
            $offset = max(0, $earliestDeparture->getTimestamp() - $windowStart->getTimestamp());
            $snapped = $windowStart->copy()->addSeconds((int) (ceil($offset / $headway) * $headway));

            if ($snapped->greaterThan($windowEnd)) {
                continue;
            }

            return [$snapped, $snapped->copy()->addSeconds($travelSeconds)];
        }

        return null;
    }

    /**
     * Active service disruptions at the requested time, indexed by variant
     * and stop, for disruption-aware ranking.
     */
    private function activeDisruptions(Carbon $at): array
    {
        $alerts = ServiceAlert::query()
            ->where('active_period_start', '<=', $at)
            ->where('active_period_end', '>=', $at)
            ->with(['serviceAlertRoutes', 'serviceAlertStops'])
            ->get();

        $byVariant = [];
        $byStop = [];

        foreach ($alerts as $alert) {
            $summary = [
                'id' => $alert->id,
                'header_text' => $alert->header_text,
                'severity' => $alert->severity,
                'consequence' => $alert->consequence,
            ];

            foreach ($alert->serviceAlertRoutes as $alertRoute) {
                $byVariant[$alertRoute->route_variant_id][$alert->id] = $summary;
            }
            foreach ($alert->serviceAlertStops as $alertStop) {
                $byStop[$alertStop->transit_stop_id][$alert->id] = $summary;
            }
        }

        return ['variants' => $byVariant, 'stops' => $byStop];
    }

    /**
     * Alerts touching any transit leg of a plan (disrupted variant boarding
     * stop or alighting stop).
     */
    private function planDisruptionAlerts(array $plan, array $disruptions): array
    {
        $alerts = [];

        foreach ($plan['legs'] as $leg) {
            if ($leg['type'] !== 'transit') {
                continue;
            }

            foreach ($disruptions['variants'][$leg['route_variant_id']] ?? [] as $alert) {
                $alerts[$alert['id']] = $alert;
            }
            foreach ([$leg['from_stop'], $leg['to_stop']] as $endpoint) {
                if ($endpoint === null || !isset($endpoint['id'])) {
                    continue;
                }
                foreach ($disruptions['stops'][$endpoint['id']] ?? [] as $alert) {
                    $alerts[$alert['id']] = $alert;
                }
            }
        }

        return array_values($alerts);
    }

    /**
     * Combine a travel date with a HH:MM:SS time string.
     * Returns null for out-of-range times such as GTFS "25:30:00".
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

        return $travelDate->copy()->setTime((int) $parts[0], (int) $parts[1], (int) ($parts[2] ?? 0));
    }

    /**
     * Sum of great-circle distances between consecutive stops of the leg.
     */
    private function variantLegDistance(array $variant, int $fromStopId, int $toStopId): int
    {
        $fromPos = $variant['positions'][$fromStopId];
        $toPos = $variant['positions'][$toStopId];
        $network = $this->networkIndex([]);

        $legStopIds = array_filter(
            $variant['stops'],
            fn (int $stopId) => $variant['positions'][$stopId] >= $fromPos
                && $variant['positions'][$stopId] <= $toPos
        );

        $distance = 0.0;
        $previous = null;
        foreach ($legStopIds as $stopId) {
            if ($previous !== null) {
                $distance += GeoCalculator::distanceMeters(
                    $network['stops'][$previous]['lat'],
                    $network['stops'][$previous]['lng'],
                    $network['stops'][$stopId]['lat'],
                    $network['stops'][$stopId]['lng'],
                );
            }
            $previous = $stopId;
        }

        return (int) max(1, round($distance));
    }

    /**
     * Cached network index. The fingerprint covers structural mutations of
     * variants and route_stops, so imports and admin edits invalidate the
     * cache automatically; avoided-mode sets are part of the cache key so
     * filtered copies stay consistent.
     */
    private function networkIndex(array $avoidedModes): array
    {
        sort($avoidedModes);
        $key = 'planner:network:' . md5(implode('|', $avoidedModes));

        $fingerprint = $this->indexFingerprint();

        if ($this->cachedIndex !== null && $this->indexFingerprint === $fingerprint) {
            // Same process, same data: the in-memory copy is authoritative.
            return $this->filterIndexByAvoidedModes($this->cachedIndex, $avoidedModes);
        }

        $cached = Cache::store('file')->get($key . ':' . $fingerprint);

        if ($cached !== null) {
            $this->cachedIndex = $cached;

            return $this->filterIndexByAvoidedModes($this->cachedIndex, $avoidedModes);
        }

        $index = $this->buildNetworkIndex([]);
        $this->cachedIndex = $index;
        $this->indexFingerprint = $fingerprint;

        Cache::store('file')->put($key . ':' . $fingerprint, $index, now()->addHours(12));

        return $this->filterIndexByAvoidedModes($index, $avoidedModes);
    }

    /**
     * Structural fingerprint of the network tables. Cheap MAX(id) +
     * COUNT(*) probes instead of hashing row content; any insert/update
     * bumping id or count rotates the fingerprint.
     */
    private function indexFingerprint(): string
    {
        if ($this->indexFingerprint !== null) {
            return $this->indexFingerprint;
        }

        $variantStamp = (int) (DB::table('route_variants')
            ->selectRaw('COALESCE(MAX(id),0) AS max_id, COUNT(*) AS total')
            ->first()->max_id ?? 0)
            . '_' . (DB::table('route_variants')->count());

        $routeStopStamp = DB::table('route_stops')
            ->selectRaw('COALESCE(MAX(id),0) AS max_id, COUNT(*) AS total')
            ->first();
        $routeStopStamp = $routeStopStamp->max_id . '_' . $routeStopStamp->total;

        $stopStamp = DB::table('transit_stops')
            ->selectRaw('COALESCE(MAX(id),0) AS max_id, COUNT(*) AS total')
            ->first();
        $stopStamp = $stopStamp->max_id . '_' . $stopStamp->total;

        return $this->indexFingerprint = md5("v={$variantStamp}|rs={$routeStopStamp}|s={$stopStamp}");
    }

    /**
     * Remove avoided-mode variants (and stops left unserved) from a full
     * index without rebuilding it.
     */
    private function filterIndexByAvoidedModes(array $index, array $avoidedModes): array
    {
        if ($avoidedModes === []) {
            return $index;
        }

        $variants = [];
        $stopVariants = [];
        $servedStops = [];

        foreach ($index['variants'] as $id => $variant) {
            if (in_array($variant['mode'], $avoidedModes, true)) {
                continue;
            }

            $variants[$id] = $variant;
            $servedStops += array_fill_keys(array_keys($variant['positions']), true);
        }

        foreach ($index['stop_variants'] as $stopId => $variantIds) {
            foreach ($variantIds as $variantId) {
                if (isset($variants[$variantId])) {
                    $stopVariants[$stopId][] = $variantId;
                }
            }
        }

        $stops = array_intersect_key($index['stops'], $servedStops);

        return ['variants' => $variants, 'stops' => $stops, 'stop_variants' => $stopVariants];
    }

    /**
     * Index the route variant network: ordered stops per variant, mode,
     * operator, reliability, plus a stop -> variants lookup.
     */
    private function buildNetworkIndex(array $avoidedModes): array
    {
        $variants = [];
        $stops = [];
        $stopVariants = [];

        $variantModels = RouteVariant::with([
            'route.transitMode',
            'route.transitOperator',
            'routeStops.transitStop',
        ])
            ->where('active', true)
            ->orderBy('id')
            ->get();

        foreach ($variantModels as $variantModel) {
            $route = $variantModel->route;

            if (!$route || $route->deleted_at !== null || !$route->active) {
                continue;
            }

            $modeName = $route->transitMode->name ?? 'bus';

            if (in_array($modeName, $avoidedModes, true)) {
                continue;
            }

            $orderedStops = $variantModel->routeStops
                ->filter(fn ($routeStop) => $routeStop->transitStop !== null)
                ->sortBy('sequence')
                ->values();

            if ($orderedStops->count() < 2) {
                continue;
            }

            $positions = [];
            $stopData = [];
            foreach ($orderedStops as $index => $routeStop) {
                $transitStop = $routeStop->transitStop;
                $positions[$transitStop->id] = $index;
                // Ordered stop ids only; names/coords resolve from $stops.
                $stopData[] = $transitStop->id;
                $stopVariants[$transitStop->id][] = $variantModel->id;
                $stops[$transitStop->id] = [
                    'id' => $transitStop->id,
                    'name' => $transitStop->name,
                    'lat' => (float) $transitStop->latitude,
                    'lng' => (float) $transitStop->longitude,
                    'wheelchair_accessible' => (bool) $transitStop->wheelchair_accessible,
                ];
            }

            $variants[$variantModel->id] = [
                'id' => $variantModel->id,
                'mode' => $modeName,
                'agency_id' => $route->transit_operator_id,
                'reliability' => (float) ($variantModel->reliability_score ?? 1.0),
                'route' => $route ? [
                    'id' => $route->id,
                    'short_name' => $route->short_name,
                    'long_name' => $route->long_name,
                    'type' => $route->type,
                ] : null,
                'stops' => $stopData,
                'positions' => $positions,
            ];
        }

        return ['variants' => $variants, 'stops' => $stops, 'stop_variants' => $stopVariants];
    }

    /**
     * Stops within walking distance of a point, nearest first.
     */
    private function stopsNear(float $lat, float $lng, int $maxWalk, array $stops, ?object $prefs): array
    {
        $wheelchairOnly = $prefs?->wheelchair_accessible ?? false;

        $candidates = [];
        foreach ($stops as $stop) {
            if ($wheelchairOnly && !$stop['wheelchair_accessible']) {
                continue;
            }

            $distance = GeoCalculator::distanceMeters($lat, $lng, $stop['lat'], $stop['lng']);
            if ($distance <= $maxWalk) {
                $stop['walk_distance'] = $distance;
                $candidates[] = $stop;
            }
        }

        usort($candidates, fn (array $a, array $b) => [$a['walk_distance'], $a['id']] <=> [$b['walk_distance'], $b['id']]);

        return array_slice($candidates, 0, self::MAX_STOP_CANDIDATES);
    }
}
