<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RouteGeometryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete route geometry
        return $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        return [
            'route_variant_id' => 'required|exists:route_variants,id',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'sequence' => 'required|integer|min:0',
        ];
    }
}