<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RouteVariantRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete route variants
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $routeVariantId = $this->route('id');

        return [
            'route_id' => 'required|exists:routes,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('route_variants', 'name')->ignore($routeVariantId),
            ],
            'description' => 'nullable|string',
        ];
    }
}