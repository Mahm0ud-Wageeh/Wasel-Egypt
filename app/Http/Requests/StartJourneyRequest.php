<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartJourneyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for starting an active journey.
     */
    public function rules(): array
    {
        return [
            'started_at' => ['nullable', 'date'],
        ];
    }
}
