<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransitOperatorResource extends JsonResource
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
            'name' => $this->name,
            'short_code' => $this->short_code,
            'website' => $this->website,
            'phone' => $this->phone,
            'license_number' => $this->license_number,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}