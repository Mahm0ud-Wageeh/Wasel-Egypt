<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LocationUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for a journey location update.
     */
    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'recorded_at' => ['nullable', 'date'],
            'speed_kph' => ['nullable', 'numeric', 'min:0', 'max:300'],
            'bearing_deg' => ['nullable', 'numeric', 'min:0', 'max:360'],
            'accuracy_meters' => ['nullable', 'numeric', 'min:0', 'max:10000'],
        ];
    }
}
