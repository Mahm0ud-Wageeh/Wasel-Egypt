<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RouteStopResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        $routeVariant = $this->routeVariant ? [
            'id' => $this->routeVariant->id,
            'name' => $this->routeVariant->name,
            'route' => $this->routeVariant->route ? [
                'id' => $this->routeVariant->route->id,
                'name' => $this->routeVariant->route->long_name,
                'short_name' => $this->routeVariant->route->short_name,
            ] : null,
        ] : null;

        $transitStop = $this->transitStop ? [
            'id' => $this->transitStop->id,
            'name' => $this->transitStop->name,
            'area' => $this->transitStop->area ? [
                'id' => $this->transitStop->area->id,
                'name' => $this->transitStop->area->name,
                'governorate' => $this->transitStop->area->governorate ? [
                    'id' => $this->transitStop->area->governorate->id,
                    'name' => $this->transitStop->area->governorate->name,
                    'code' => $this->transitStop->area->governorate->code,
                ] : null,
            ] : null,
        ] : null;

        return [
            'id' => $this->id,
            'route_variant' => $routeVariant,
            'transit_stop' => $transitStop,
            'sequence' => $this->sequence,
            'pickup_type' => $this->pickup_type,
            'drop_off_type' => $this->drop_off_type,
            'distance_from_prev' => $this->distance_from_prev,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}