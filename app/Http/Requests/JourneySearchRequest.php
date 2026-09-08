<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JourneySearchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for journey search.
     */
    public function rules(): array
    {
        return [
            'origin_lat' => ['required', 'numeric', 'between:-90,90'],
            'origin_lng' => ['required', 'numeric', 'between:-180,180'],
            'destination_lat' => ['required', 'numeric', 'between:-90,90'],
            'destination_lng' => ['required', 'numeric', 'between:-180,180'],
            'requested_at' => ['nullable', 'date'],
            'max_transfers' => ['nullable', 'integer', 'min:0', 'max:5'],
            'max_walk_distance_per_leg' => ['nullable', 'integer', 'min:100', 'max:10000'],
            'preferred_modes' => ['nullable', 'array'],
            'preferred_modes.*' => ['string', 'in:walking,metro,bus,minibus,microbus,rail'],
            'avoided_modes' => ['nullable', 'array'],
            'avoided_modes.*' => ['string', 'in:walking,metro,bus,minibus,microbus,rail'],
            'alternatives' => ['nullable', 'integer', 'min:1', 'max:5'],
        ];
    }

    /**
     * Custom messages for clearer API errors.
     */
    public function messages(): array
    {
        return [
            'origin_lat.required' => 'Origin latitude is required.',
            'origin_lng.required' => 'Origin longitude is required.',
            'destination_lat.required' => 'Destination latitude is required.',
            'destination_lng.required' => 'Destination longitude is required.',
        ];
    }
}
