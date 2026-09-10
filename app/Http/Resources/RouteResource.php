<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RouteResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        $transitMode = $this->transitMode ? [
            'id' => $this->transitMode->id,
            'name' => $this->transitMode->name,
        ] : null;

        $transitOperator = $this->transitOperator ? [
            'id' => $this->transitOperator->id,
            'name' => $this->transitOperator->name,
        ] : null;

        return [
            'id' => $this->id,
            'gtfs_route_id' => $this->gtfs_route_id,
            'name' => $this->name,
            'transit_mode' => $transitMode,
            'transit_operator' => $transitOperator,
            'short_name' => $this->short_name,
            'long_name' => $this->long_name,
            'description' => $this->description,
            'type' => $this->type,
            'url' => $this->url,
            'color' => $this->color,
            'text_color' => $this->text_color,
            'sort_order' => $this->sort_order,
            'active' => $this->active,
            'continuous_pickup' => $this->continuous_pickup,
            'continuous_drop_off' => $this->continuous_drop_off,
            // Route/line experience (design §route): included ONLY when the
            // controller eager-loads variants — list endpoints stay untouched.
            'variants' => $this->whenLoaded('routeVariants', function () {
                return $this->routeVariants->values()->map(function ($variant) {
                    return [
                        'id' => $variant->id,
                        'name' => $variant->name,
                        'headsign' => $variant->headsign,
                        'direction' => $variant->direction,
                        'active' => $variant->active,
                        'reliability_score' => $variant->reliability_score !== null
                            ? (float) $variant->reliability_score
                            : null,
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}