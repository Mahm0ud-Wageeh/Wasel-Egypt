<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportModerationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for a moderation action.
     */
    public function rules(): array
    {
        return [
            'action_taken' => ['required', 'string', 'in:verify,reject,resolve'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
