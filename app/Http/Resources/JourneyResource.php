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
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'origin' => [
                'lat' => $this->origin_lat,
                'lng' => $this->origin_lng,
            ],
            'destination' => [
                'lat' => $this->destination_lat,
                'lng' => $this->destination_lng,
            ],
            'requested_at' => $this->requested_at,
            'total_duration_sec' => $this->total_duration_sec,
            'total_transfers' => $this->total_transfers,
            'walk_distance_meters' => $this->walk_distance_meters,
            'score' => $this->score,
            'status' => $this->status,
            'legs' => JourneyLegResource::collection($this->whenLoaded('journeyLegs')),
            'transfers' => TransferResource::collection($this->whenLoaded('transfers')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
