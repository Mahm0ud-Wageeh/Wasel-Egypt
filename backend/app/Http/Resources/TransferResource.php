<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TransferResource extends JsonResource
{
    /**
     * Transform the transfer into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'journey_id' => $this->journey_id,
            'from_leg_id' => $this->from_leg_id,
            'to_leg_id' => $this->to_leg_id,
            'transfer_type' => $this->transfer_type,
            'transfer_duration_sec' => $this->transfer_duration_sec,
            'from_lat' => $this->from_lat,
            'from_longitude' => $this->from_longitude,
            'to_lat' => $this->to_lat,
            'to_longitude' => $this->to_longitude,
        ];
    }
}
