<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class StopTimeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        $schedule = $this->schedule ? [
            'id' => $this->schedule->id,
            'gtfs_trip_id' => $this->schedule->gtfs_trip_id,
            'service_id' => $this->schedule->service_id,
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
            'schedule' => $schedule,
            'transit_stop' => $transitStop,
            'sequence' => $this->sequence,
            'arrival_time' => $this->arrival_time,
            'departure_time' => $this->departure_time,
            'pickup_type' => $this->pickup_type,
            'drop_off_type' => $this->drop_off_type,
            'timepoint' => $this->timepoint,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}