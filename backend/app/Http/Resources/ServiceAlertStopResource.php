<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ServiceAlertStopResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'service_alert_id' => $this->service_alert_id,
            'transit_stop' => [
                'id' => $this->transitStop->id,
                'name' => $this->transitStop->name,
                'latitude' => $this->transitStop->latitude,
                'longitude' => $this->transitStop->longitude,
            ],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}