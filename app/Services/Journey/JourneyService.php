<?php

namespace App\Services\Journey;

use App\Models\Journey;
use App\Models\JourneyLeg;
use App\Models\Transfer;
use App\Models\AnalyticsEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Persists a planned journey (from JourneyPlannerService) as a Journey with
 * ordered JourneyLegs and the Transfer connections between transit legs.
 */
class JourneyService
{
    /**
     * Create a Journey from a scored plan structure.
     *
     * @param array $plan Plan structure produced by JourneyPlannerService.
     * @param array $searchParams origin/destination/requested_at of the search.
     */
    public function createFromPlan(User $user, array $plan, array $searchParams): Journey
    {
        return DB::transaction(function () use ($user, $plan, $searchParams) {
            $journey = Journey::create([
                'user_id' => $user->id,
                'origin_lat' => $searchParams['origin_lat'],
                'origin_lng' => $searchParams['origin_lng'],
                'destination_lat' => $searchParams['destination_lat'],
                'destination_lng' => $searchParams['destination_lng'],
                'requested_at' => $searchParams['requested_at'],
                'total_duration_sec' => $plan['total_duration_sec'],
                'total_transfers' => $plan['total_transfers'],
                'walk_distance_meters' => $plan['walk_distance_meters'],
                'score' => $plan['score'],
                'status' => 'planned',
            ]);

            $legIds = [];
            foreach ($plan['legs'] as $index => $leg) {
                $legModel = JourneyLeg::create([
                    'journey_id' => $journey->id,
                    'route_variant_id' => $leg['type'] === 'transit' ? $leg['route_variant_id'] : null,
                    'transit_stop_from_id' => $leg['from_stop']['id'] ?? null,
                    'transit_stop_to_id' => $leg['to_stop']['id'] ?? null,
                    'from_lat' => $leg['from_lat'],
                    'from_lng' => $leg['from_lng'],
                    'to_lat' => $leg['to_lat'],
                    'to_lng' => $leg['to_lng'],
                    'sequence' => $index + 1,
                    'departure_time' => $leg['departure_time'],
                    'arrival_time' => $leg['arrival_time'],
                    'duration_sec' => $leg['duration_sec'],
                    'distance_meters' => $leg['distance_meters'],
                    'geometry' => $leg['geometry'] ?? null,
                    'geometry_source' => $leg['geometry_source'] ?? (!empty($leg['geometry']) ? 'route_geometry' : 'stop_to_stop'),
                    'leg_steps' => $leg['leg_steps'] ?? null,
                    'mode' => $leg['mode'],
                    'agency_id' => $leg['agency_id'],
                    'leg_score' => $plan['score'],
                ]);

                $legIds[] = $legModel->id;
            }

            foreach ($plan['transfers'] as $transfer) {
                Transfer::create([
                    'journey_id' => $journey->id,
                    'from_leg_id' => $legIds[$transfer['from_leg_index']],
                    'to_leg_id' => $legIds[$transfer['to_leg_index']],
                    'transfer_type' => $transfer['transfer_type'],
                    'transfer_duration_sec' => $transfer['transfer_duration_sec'],
                    'from_lat' => $transfer['from_lat'],
                    'from_longitude' => $transfer['from_longitude'],
                    'to_lat' => $transfer['to_lat'],
                    'to_longitude' => $transfer['to_longitude'],
                ]);
            }

            $this->recordCreated($journey);

            return $journey;
        });
    }

    /**
     * Record journey creation for usage analytics.
     */
    private function recordCreated(Journey $journey): void
    {
        AnalyticsEvent::create([
            'user_id' => $journey->user_id,
            'event_type' => 'journey_created',
            'properties' => ['journey_id' => $journey->id],
            'occurred_at' => now(),
        ]);
    }
}
