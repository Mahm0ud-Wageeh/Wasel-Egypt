<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransitStopResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        // Safely get area data
        $area = null;
        if ($this->area) {
            $areaData = [
                'id' => $this->area->id,
                'name' => $this->area->name,
            ];

            // Safely get governorate data
            if ($this->area->governorate) {
                $areaData['governorate'] = [
                    'id' => $this->area->governorate->id,
                    'name' => $this->area->governorate->name,
                    'code' => $this->area->governorate->code,
                ];
            } else {
                $areaData['governorate'] = null;
            }

            $area = $areaData;
        }

        return [
            'id' => $this->id,
            'gtfs_stop_id' => $this->gtfs_stop_id,
            'name' => $this->name,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'location_accuracy' => $this->location_accuracy,
            'wheelchair_accessible' => $this->wheelchair_accessible,
            'platform_code' => $this->platform_code,
            // Present only for nearby queries (publicIndex lat/lng/radius);
            // omitted entirely elsewhere so the existing contract is unchanged.
            'distance_meters' => $this->when(isset($this->distance_meters), $this->distance_meters),
            'area' => $area,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}