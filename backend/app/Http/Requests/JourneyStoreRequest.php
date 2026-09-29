<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JourneyStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for saving a journey from a search.
     *
     * The journey is persisted by re-running the deterministic planner with
     * the same parameters and storing the selected option, so clients cannot
     * submit arbitrary leg data.
     */
    public function rules(): array
    {
        return [
            'origin_lat' => ['required', 'numeric', 'between:-90,90'],
            'origin_lng' => ['required', 'numeric', 'between:-180,180'],
            'destination_lat' => ['required', 'numeric', 'between:-90,90'],
            'destination_lng' => ['required', 'numeric', 'between:-180,180'],
            'requested_at' => ['nullable', 'date'],
            'option_index' => ['nullable', 'integer', 'min:0', 'max:4'],
            'max_transfers' => ['nullable', 'integer', 'min:0', 'max:5'],
            'max_walk_distance_per_leg' => ['nullable', 'integer', 'min:100', 'max:10000'],
            'preferred_modes' => ['nullable', 'array'],
            'preferred_modes.*' => ['string', 'in:walking,metro,bus,minibus,microbus,rail'],
            'avoided_modes' => ['nullable', 'array'],
            'avoided_modes.*' => ['string', 'in:walking,metro,bus,minibus,microbus,rail'],
        ];
    }
}
