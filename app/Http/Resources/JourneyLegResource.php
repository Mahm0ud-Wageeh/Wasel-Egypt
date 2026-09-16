<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class JourneyLegResource extends JsonResource
{
    /**
     * Transform the journey leg into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'journey_id' => $this->journey_id,
            'sequence' => $this->sequence,
            'mode' => $this->mode,
            'route_variant_id' => $this->route_variant_id,
            'route_variant' => $this->whenLoaded('routeVariant', fn () => $this->routeVariant ? [
                'id' => $this->routeVariant->id,
                'name' => $this->routeVariant->name,
                'headsign' => $this->routeVariant->headsign,
            ] : null),
            'route' => $this->whenLoaded('routeVariant', fn () => ($this->routeVariant?->route) ? [
                'id' => $this->routeVariant->route->id,
                'short_name' => $this->routeVariant->route->short_name,
                'long_name' => $this->routeVariant->route->long_name,
            ] : null),
            'from_stop' => $this->whenLoaded('transitStopFrom', fn () => $this->transitStopFrom ? [
                'id' => $this->transitStopFrom->id,
                'name' => $this->transitStopFrom->name,
                'latitude' => $this->transitStopFrom->latitude,
                'longitude' => $this->transitStopFrom->longitude,
            ] : null),
            'to_stop' => $this->whenLoaded('transitStopTo', fn () => $this->transitStopTo ? [
                'id' => $this->transitStopTo->id,
                'name' => $this->transitStopTo->name,
                'latitude' => $this->transitStopTo->latitude,
                'longitude' => $this->transitStopTo->longitude,
            ] : null),
            'from_lat' => $this->from_lat,
            'from_lng' => $this->from_lng,
            'to_lat' => $this->to_lat,
            'to_lng' => $this->to_lng,
            'departure_time' => $this->departure_time,
            'arrival_time' => $this->arrival_time,
            'duration_sec' => $this->duration_sec,
            'distance_meters' => $this->distance_meters,
            // Road/variant polyline [[lat,lng],...]; null on legs saved
            // before geometry persistence (map falls back to straight lines).
            'geometry' => $this->geometry,
            'geometry_source' => $this->geometry_source,
            'leg_steps' => $this->leg_steps,
            'agency_id' => $this->agency_id,
            'agency' => $this->whenLoaded('agency', fn () => $this->agency ? [
                'id' => $this->agency->id,
                'name' => $this->agency->name,
            ] : null),
            'leg_score' => $this->leg_score,
        ];
    }
}
