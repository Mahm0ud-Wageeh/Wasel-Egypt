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
        $transitMode = null;
        if ($this->transitMode) {
            $transitMode = [
                'id' => $this->transitMode->id,
                'code' => $this->transitMode->code,
                'name' => $this->transitMode->name,
                'name_ar' => $this->transitMode->name_ar,
                'color' => $this->transitMode->color,
            ];
        }

        $fromStop = null;
        $fromStopModel = $this->fromStop ?? $this->transitStopFrom;
        if ($fromStopModel) {
            $fromStop = [
                'id' => $fromStopModel->id,
                'gtfs_stop_id' => $fromStopModel->gtfs_stop_id,
                'name' => $fromStopModel->name,
                'name_ar' => $fromStopModel->name_ar ?? $fromStopModel->name,
                'latitude' => (float) $fromStopModel->latitude,
                'longitude' => (float) $fromStopModel->longitude,
                'is_interchange' => (bool) $fromStopModel->is_interchange,
                'parent_station_id' => $fromStopModel->parent_station_id,
            ];
        }

        $toStop = null;
        $toStopModel = $this->toStop ?? $this->transitStopTo;
        if ($toStopModel) {
            $toStop = [
                'id' => $toStopModel->id,
                'gtfs_stop_id' => $toStopModel->gtfs_stop_id,
                'name' => $toStopModel->name,
                'name_ar' => $toStopModel->name_ar ?? $toStopModel->name,
                'latitude' => (float) $toStopModel->latitude,
                'longitude' => (float) $toStopModel->longitude,
                'is_interchange' => (bool) $toStopModel->is_interchange,
                'parent_station_id' => $toStopModel->parent_station_id,
            ];
        }

        return [
            'id' => $this->id,
            'journey_id' => $this->journey_id,
            'sequence' => $this->sequence,
            'leg_type' => $this->leg_type ?? ($this->mode === 'walk' ? 'walk' : 'transit'),
            'mode' => $this->mode,
            'transit_mode_id' => $this->transit_mode_id,
            'transit_mode' => $transitMode,
            'route_variant_id' => $this->route_variant_id,
            'route_variant' => $this->whenLoaded('routeVariant', fn () => $this->routeVariant ? [
                'id' => $this->routeVariant->id,
                'name' => $this->routeVariant->name,
                'name_ar' => $this->routeVariant->name_ar ?? $this->routeVariant->name,
                'headsign' => $this->routeVariant->headsign,
            ] : null),
            'route' => $this->whenLoaded('routeVariant', fn () => ($this->routeVariant?->route) ? [
                'id' => $this->routeVariant->route->id,
                'short_name' => $this->routeVariant->route->short_name,
                'long_name' => $this->routeVariant->route->long_name,
                'long_name_ar' => $this->routeVariant->route->long_name_ar ?? $this->routeVariant->route->long_name,
                'color' => $this->routeVariant->route->color,
            ] : null),
            'from_stop_id' => $this->from_stop_id ?? $this->transit_stop_from_id,
            'to_stop_id' => $this->to_stop_id ?? $this->transit_stop_to_id,
            'from_stop' => $fromStop,
            'to_stop' => $toStop,
            'from_lat' => $this->from_lat ? (float) $this->from_lat : null,
            'from_lng' => $this->from_lng ? (float) $this->from_lng : null,
            'to_lat' => $this->to_lat ? (float) $this->to_lat : null,
            'to_lng' => $this->to_lng ? (float) $this->to_lng : null,
            'boarding_at' => $this->boarding_at ?? $this->departure_time,
            'alighting_at' => $this->alighting_at ?? $this->arrival_time,
            'departure_time' => $this->departure_time ?? $this->boarding_at,
            'arrival_time' => $this->arrival_time ?? $this->alighting_at,
            'duration_sec' => $this->duration_sec,
            'distance_m' => $this->distance_m ?? $this->distance_meters,
            'distance_meters' => $this->distance_meters ?? $this->distance_m,
            'fare' => $this->fare !== null ? (float) $this->fare : 0.0,
            'geometry' => $this->geometry,
            'geometry_source' => $this->geometry_source,
            'leg_steps' => $this->leg_steps,
            'agency_id' => $this->agency_id,
            'leg_score' => $this->leg_score,
        ];
    }
}
