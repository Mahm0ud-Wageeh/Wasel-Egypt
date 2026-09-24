<?php

namespace App\Services\Journey;

use App\Models\Journey;
use App\Models\JourneyLeg;
use App\Models\JourneyLegTransfer;
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
            // Find first and last transit stops
            $originStopId = null;
            $destStopId = null;
            foreach ($plan['legs'] as $leg) {
                if (($leg['type'] ?? '') === 'transit' && !empty($leg['from_stop']['id'])) {
                    if (!$originStopId) {
                        $originStopId = $leg['from_stop']['id'];
                    }
                    $destStopId = $leg['to_stop']['id'] ?? $destStopId;
                }
            }

            $journey = Journey::create([
                'user_id' => $user->id,
                'origin_stop_id' => $originStopId,
                'dest_stop_id' => $destStopId,
                'origin_lat' => $searchParams['origin_lat'],
                'origin_lng' => $searchParams['origin_lng'],
                'dest_lat' => $searchParams['destination_lat'] ?? $searchParams['dest_lat'] ?? null,
                'dest_lng' => $searchParams['destination_lng'] ?? $searchParams['dest_lng'] ?? null,
                'destination_lat' => $searchParams['destination_lat'] ?? $searchParams['dest_lat'] ?? null,
                'destination_lng' => $searchParams['destination_lng'] ?? $searchParams['dest_lng'] ?? null,
                'requested_at' => $searchParams['requested_at'] ?? now(),
                'started_at' => null,
                'completed_at' => null,
                'total_duration_sec' => $plan['total_duration_sec'] ?? null,
                'total_transfers' => $plan['total_transfers'] ?? 0,
                'total_fare' => $plan['fare'] ?? 0.0,
                'walk_distance_meters' => $plan['walk_distance_meters'] ?? 0,
                'score' => $plan['score'] ?? 1.0,
                'status' => 'planned',
            ]);

            $legIds = [];
            foreach ($plan['legs'] as $index => $leg) {
                $isWalk = ($leg['type'] ?? '') === 'walk' || ($leg['mode'] ?? '') === 'walk';
                $legType = $isWalk ? 'walk' : 'transit';

                $fromStopId = $leg['from_stop']['id'] ?? null;
                $toStopId = $leg['to_stop']['id'] ?? null;

                $legModel = JourneyLeg::create([
                    'journey_id' => $journey->id,
                    'sequence' => $index + 1,
                    'leg_type' => $legType,
                    'transit_mode_id' => $leg['transit_mode_id'] ?? null,
                    'route_variant_id' => $legType === 'transit' ? ($leg['route_variant_id'] ?? null) : null,
                    'from_stop_id' => $fromStopId,
                    'to_stop_id' => $toStopId,
                    'transit_stop_from_id' => $fromStopId,
                    'transit_stop_to_id' => $toStopId,
                    'from_lat' => $leg['from_lat'] ?? null,
                    'from_lng' => $leg['from_lng'] ?? null,
                    'to_lat' => $leg['to_lat'] ?? null,
                    'to_lng' => $leg['to_lng'] ?? null,
                    'distance_m' => $leg['distance_meters'] ?? $leg['distance_m'] ?? 0,
                    'distance_meters' => $leg['distance_meters'] ?? $leg['distance_m'] ?? 0,
                    'fare' => $leg['fare'] ?? 0.0,
                    'boarding_at' => $leg['departure_time'] ?? null,
                    'alighting_at' => $leg['arrival_time'] ?? null,
                    'departure_time' => $leg['departure_time'] ?? null,
                    'arrival_time' => $leg['arrival_time'] ?? null,
                    'duration_sec' => $leg['duration_sec'] ?? null,
                    'geometry' => $leg['geometry'] ?? null,
                    'geometry_source' => $leg['geometry_source'] ?? (!empty($leg['geometry']) ? 'route_geometry' : 'stop_to_stop'),
                    'leg_steps' => $leg['leg_steps'] ?? null,
                    'mode' => $leg['mode'] ?? ($isWalk ? 'walk' : 'transit'),
                    'agency_id' => $leg['agency_id'] ?? null,
                    'leg_score' => $plan['score'] ?? 1.0,
                ]);

                $legIds[] = $legModel->id;
            }

            if (!empty($plan['transfers'])) {
                foreach ($plan['transfers'] as $transfer) {
                    $fromLegIdx = $transfer['from_leg_index'] ?? null;
                    $toLegIdx = $transfer['to_leg_index'] ?? null;
                    if ($fromLegIdx !== null && $toLegIdx !== null && isset($legIds[$fromLegIdx], $legIds[$toLegIdx])) {
                        $transferData = [
                            'journey_id' => $journey->id,
                            'from_leg_id' => $legIds[$fromLegIdx],
                            'to_leg_id' => $legIds[$toLegIdx],
                            'transfer_type' => $transfer['transfer_type'] ?? 'walk',
                            'transfer_duration_sec' => $transfer['transfer_duration_sec'] ?? 180,
                            'from_lat' => $transfer['from_lat'] ?? null,
                            'from_longitude' => $transfer['from_longitude'] ?? null,
                            'to_lat' => $transfer['to_lat'] ?? null,
                            'to_longitude' => $transfer['to_longitude'] ?? null,
                        ];

                        if (\Illuminate\Support\Facades\Schema::hasTable('journey_leg_transfers')) {
                            JourneyLegTransfer::create($transferData);
                        }

                        if (\Illuminate\Support\Facades\Schema::hasTable('transfers') && \Illuminate\Support\Facades\Schema::hasColumn('transfers', 'journey_id')) {
                            \Illuminate\Support\Facades\DB::table('transfers')->insert(array_merge($transferData, [
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]));
                        }
                    }
                }
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
