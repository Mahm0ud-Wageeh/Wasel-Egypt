<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class JourneyResource extends JsonResource
{
    /**
     * Transform the journey into an array.
     */
    public function toArray($request)
    {
        $originStop = null;
        if ($this->relationLoaded('originStop') && $this->originStop) {
            $originStop = [
                'id' => $this->originStop->id,
                'name' => $this->originStop->name,
                'name_ar' => $this->originStop->name_ar ?? $this->originStop->name,
                'latitude' => (float) $this->originStop->latitude,
                'longitude' => (float) $this->originStop->longitude,
            ];
        }

        $destStop = null;
        if ($this->relationLoaded('destStop') && $this->destStop) {
            $destStop = [
                'id' => $this->destStop->id,
                'name' => $this->destStop->name,
                'name_ar' => $this->destStop->name_ar ?? $this->destStop->name,
                'latitude' => (float) $this->destStop->latitude,
                'longitude' => (float) $this->destStop->longitude,
            ];
        }

        $legs = null;
        if ($this->relationLoaded('legs')) {
            $legs = JourneyLegResource::collection($this->legs);
        } elseif ($this->relationLoaded('journeyLegs')) {
            $legs = JourneyLegResource::collection($this->journeyLegs);
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'origin_stop_id' => $this->origin_stop_id,
            'dest_stop_id' => $this->dest_stop_id,
            'origin_stop' => $originStop,
            'dest_stop' => $destStop,
            'origin' => [
                'lat' => $this->origin_lat !== null ? (float) $this->origin_lat : null,
                'lng' => $this->origin_lng !== null ? (float) $this->origin_lng : null,
            ],
            'destination' => [
                'lat' => $this->destination_lat !== null ? (float) $this->destination_lat : ($this->dest_lat !== null ? (float) $this->dest_lat : null),
                'lng' => $this->destination_lng !== null ? (float) $this->destination_lng : ($this->dest_lng !== null ? (float) $this->dest_lng : null),
            ],
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'requested_at' => $this->requested_at,
            'total_duration_sec' => $this->total_duration_sec,
            'total_transfers' => $this->total_transfers,
            'total_legs' => $this->total_legs,
            'total_fare' => $this->total_fare !== null ? (float) $this->total_fare : 0.0,
            'walk_distance_meters' => $this->walk_distance_meters,
            'score' => $this->score,
            'status' => $this->status,
            'legs' => $legs,
            'transfers' => $this->whenLoaded('transfers', fn () => TransferResource::collection($this->transfers)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
