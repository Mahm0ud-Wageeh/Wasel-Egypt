<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for creating a community report.
     */
    public function rules(): array
    {
        return [
            'report_type' => ['required', 'string', 'in:delay,early_arrival,overcrowding,cleanliness,safety,stop_damage,signage_issue,accessibility,suggestion,complaint,other'],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'occurred_at' => ['nullable', 'date', 'before_or_equal:now'],
            'media_urls' => ['nullable', 'array', 'max:3'],
            'media_urls.*' => ['string', 'max:500'],
            'related_stop_id' => ['nullable', 'integer', 'exists:transit_stops,id'],
            'related_route_id' => ['nullable', 'integer', 'exists:route_variants,id'],
        ];
    }

    /**
     * Custom messages for clearer API errors.
     */
    public function messages(): array
    {
        return [
            'occurred_at.before_or_equal' => 'The report occurrence time cannot be in the future.',
            'description.min' => 'Please describe the issue in at least 10 characters.',
        ];
    }
}
