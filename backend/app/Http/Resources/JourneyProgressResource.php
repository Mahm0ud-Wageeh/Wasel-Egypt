<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class JourneyProgressResource extends JsonResource
{
    /**
     * Transform the journey progress record into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'active_journey_id' => $this->active_journey_id,
            'recorded_at' => $this->recorded_at,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'speed_kph' => $this->speed_kph,
            'bearing_deg' => $this->bearing_deg,
            'accuracy_meters' => $this->accuracy_meters,
            'nearest_stop_id' => $this->nearest_stop_id,
            'nearest_stop_distance_meters' => $this->nearest_stop_distance_meters,
            'is_stop_event' => $this->is_stop_event,
        ];
    }
}
