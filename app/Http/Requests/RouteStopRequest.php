<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class RouteStopRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete route stops
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $routeStopId = $this->route('id');

        return [
            'route_variant_id' => 'required|exists:route_variants,id',
            'transit_stop_id' => 'required|exists:transit_stops,id',
            'sequence' => [
                'required',
                'integer',
                'min:0',
                Rule::unique('route_stops')->ignore($routeStopId, 'id')->where(function ($query) {
                    $query->where('route_variant_id', $this->input('route_variant_id'))
                          ->where('sequence', $this->input('sequence'));
                }),
            ],
            'pickup_type' => 'integer|in:0,1,2,3', // 0: regular pickup, 1: no pickup, 2: must phone agency, 3: must coordinate with driver
            'drop_off_type' => 'integer|in:0,1,2,3', // 0: regular drop off, 1: no drop off, 2: must phone agency, 3: must coordinate with driver
            'distance_from_prev' => 'nullable|numeric|min:0',
        ];
    }
}