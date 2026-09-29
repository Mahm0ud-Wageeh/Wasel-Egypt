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
                'name_ar' => $this->area->name_ar,
            ];

            // Safely get governorate data
            if ($this->area->governorate) {
                $areaData['governorate'] = [
                    'id' => $this->area->governorate->id,
                    'name' => $this->area->governorate->name,
                    'name_ar' => $this->area->governorate->name_ar,
                    'code' => $this->area->governorate->code,
                ];
            } else {
                $areaData['governorate'] = null;
            }

            $area = $areaData;
        }

        $parentStation = null;
        if ($this->relationLoaded('parentStation') && $this->parentStation) {
            $parentStation = [
                'id' => $this->parentStation->id,
                'gtfs_stop_id' => $this->parentStation->gtfs_stop_id,
                'name' => $this->parentStation->name,
                'name_ar' => $this->parentStation->name_ar,
            ];
        }

        return [
            'id' => $this->id,
            'gtfs_stop_id' => $this->gtfs_stop_id,
            'name' => $this->name,
            'name_ar' => $this->name_ar ?? $this->name,
            'name_en' => $this->name,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'location_accuracy' => $this->location_accuracy,
            'parent_station_id' => $this->parent_station_id,
            'parent_station' => $parentStation,
            'is_interchange' => (bool) $this->is_interchange,
            'wheelchair_boarding' => $this->wheelchair_boarding ?? ($this->wheelchair_accessible ? 1 : 0),
            'wheelchair_accessible' => (bool) $this->wheelchair_accessible,
            'platform_code' => $this->platform_code,
            'active' => (bool) ($this->active ?? true),
            // Present only for nearby queries (publicIndex lat/lng/radius);
            'distance_meters' => $this->when(isset($this->distance_meters), $this->distance_meters),
            'area' => $area,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}