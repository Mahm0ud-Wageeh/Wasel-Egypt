<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ServiceAlertResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        $serviceAlertStops = $this->whenLoaded('serviceAlertStops', function () {
            return $this->serviceAlertStops->map(function ($stop) {
                return [
                    'id' => $stop->id,
                    'transit_stop' => $stop->transitStop ? [
                        'id' => $stop->transitStop->id,
                        'name' => $stop->transitStop->name,
                        'area' => $stop->transitStop->area ? [
                            'id' => $stop->transitStop->area->id,
                            'name' => $stop->transitStop->area->name,
                            'governorate' => $stop->transitStop->area->governorate ? [
                                'id' => $stop->transitStop->area->governorate->id,
                                'name' => $stop->transitStop->area->governorate->name,
                                'code' => $stop->transitStop->area->governorate->code,
                            ] : null,
                        ] : null,
                    ] : null,
                ];
            });
        });

        $serviceAlertRoutes = $this->whenLoaded('serviceAlertRoutes', function () {
            return $this->serviceAlertRoutes->map(function ($route) {
                return [
                    'id' => $route->id,
                    'route_variant' => $route->routeVariant ? [
                        'id' => $route->routeVariant->id,
                        'name' => $route->routeVariant->name,
                        'short_name' => $route->routeVariant->short_name,
                    ] : null,
                ];
            });
        });

        return [
            'id' => $this->id,
            'gtfs_alert_id' => $this->gtfs_alert_id,
            'header_text' => $this->header_text,
            'description_text' => $this->description_text,
            'url' => $this->url,
            'severity' => $this->severity,
            'consequence' => $this->consequence,
            'active_period_start' => $this->active_period_start,
            'active_period_end' => $this->active_period_end,
            'service_alert_stops' => $serviceAlertStops,
            'service_alert_routes' => $serviceAlertRoutes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}