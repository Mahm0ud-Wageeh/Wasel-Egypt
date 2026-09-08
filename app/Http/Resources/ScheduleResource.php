<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request)
    {
        $routeVariant = $this->routeVariant ? [
            'id' => $this->routeVariant->id,
            'name' => $this->routeVariant->name,
            'description' => $this->routeVariant->description,
            'route_id' => $this->routeVariant->route_id,
            'created_at' => $this->routeVariant->created_at,
            'updated_at' => $this->routeVariant->updated_at,
            'route' => $this->routeVariant->route ? [
                'id' => $this->routeVariant->route->id,
                'name' => $this->routeVariant->route->name,
            ] : null,
        ] : null;

        return [
            'id' => $this->id,
            'gtfs_trip_id' => $this->gtfs_trip_id,
            'route_variant_id' => $this->route_variant_id,
            'route_variant' => $routeVariant,
            'service_id' => $this->service_id,
            'direction_id' => $this->direction_id,
            'headsign' => $this->headsign,
            'wheelchair_accessible' => $this->wheelchair_accessible,
            'notes' => $this->notes,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}