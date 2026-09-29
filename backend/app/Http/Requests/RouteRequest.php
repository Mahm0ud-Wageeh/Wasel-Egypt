<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RouteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete routes
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $routeId = $this->route('id');

        return [
            'gtfs_route_id' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('routes', 'gtfs_route_id')->ignore($routeId),
            ],
            'transit_operator_id' => 'required|exists:transit_operators,id',
            'transit_mode_id' => 'required|exists:transit_modes,id',
            'short_name' => 'nullable|string|max:50',
            'long_name' => 'required|string|max:150',
            'color' => 'nullable|regex:/^#[0-9A-F]{6}$/i', // Hex color format
            'text_color' => 'nullable|regex:/^#[0-9A-F]{6}$/i', // Hex color format
            'sort_order' => 'integer|min:0',
            'active' => 'boolean',
        ];
    }
}