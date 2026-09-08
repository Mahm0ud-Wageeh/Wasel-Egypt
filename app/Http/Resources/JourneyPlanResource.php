<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Represents one scored journey option returned by the planner (an in-memory
 * plan array, not an Eloquent model).
 */
class JourneyPlanResource extends JsonResource
{
    /**
     * Transform the plan into an array.
     */
    public function toArray($request)
    {
        return [
            'total_duration_sec' => $this->resource['total_duration_sec'],
            'total_transfers' => $this->resource['total_transfers'],
            'walk_distance_meters' => $this->resource['walk_distance_meters'],
            'score' => $this->resource['score'],
            'reliability' => $this->resource['reliability'] ?? null,
            'fare' => $this->resource['fare'] ?? null,
            'matches_saved' => $this->resource['matches_saved'] ?? null,
            'disrupted' => $this->resource['disrupted'] ?? false,
            'alerts' => $this->resource['alerts'] ?? [],
            'legs' => collect($this->resource['legs'])->map(fn (array $leg) => [
                'type' => $leg['type'],
                'mode' => $leg['mode'],
                'route_variant_id' => $leg['route_variant_id'],
                'route' => $leg['route'],
                'agency_id' => $leg['agency_id'],
                'from_stop' => isset($leg['from_stop']) && $leg['from_stop'] !== null
                    ? collect($leg['from_stop'])->only(['id', 'name', 'lat', 'lng'])->all()
                    : null,
                'to_stop' => isset($leg['to_stop']) && $leg['to_stop'] !== null
                    ? collect($leg['to_stop'])->only(['id', 'name', 'lat', 'lng'])->all()
                    : null,
                'from_lat' => $leg['from_lat'],
                'from_lng' => $leg['from_lng'],
                'to_lat' => $leg['to_lat'],
                'to_lng' => $leg['to_lng'],
                'departure_time' => optional($leg['departure_time'])->toIso8601String(),
                'arrival_time' => optional($leg['arrival_time'])->toIso8601String(),
                'duration_sec' => $leg['duration_sec'],
                'distance_meters' => $leg['distance_meters'],
                // Road-following walking geometry ([lat,lng] polyline) when
                // OSRM is reachable; null when the straight-line fallback
                // produced this leg (walk_source='estimate').
                'geometry' => $leg['geometry'] ?? null,
                'walk_source' => $leg['walk_source'] ?? null,
                'geometry_source' => $leg['geometry_source'] ?? null,
                'reliability' => $leg['reliability'] ?? null,
            ])->all(),
            'transfers' => collect($this->resource['transfers'])->map(fn (array $transfer) => [
                'from_leg_index' => $transfer['from_leg_index'],
                'to_leg_index' => $transfer['to_leg_index'],
                'transfer_type' => $transfer['transfer_type'],
                'transfer_duration_sec' => $transfer['transfer_duration_sec'],
                'from_lat' => $transfer['from_lat'],
                'from_longitude' => $transfer['from_longitude'],
                'to_lat' => $transfer['to_lat'],
                'to_longitude' => $transfer['to_longitude'],
            ])->all(),
        ];
    }
}
