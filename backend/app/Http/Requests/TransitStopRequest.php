<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitStopRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete transit stops
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $transitStopId = $this->route('id');

        $rules = [
            'gtfs_stop_id' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('transit_stops', 'gtfs_stop_id')->ignore($transitStopId),
            ],
            'name' => 'required|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'location_accuracy' => 'nullable|integer|min:0|max:5',
            'wheelchair_accessible' => 'boolean',
            'platform_code' => 'nullable|string|max:50',
            'area_id' => 'nullable|exists:areas,id',
        ];

        if ($this->isMethod('post')) {
            // For creation, these fields are required
            $rules['latitude'] = 'required|numeric|between:-90,90';
            $rules['longitude'] = 'required|numeric|between:-180,180';
            $rules['area_id'] = 'required|exists:areas,id';
        }

        return $rules;
    }
}