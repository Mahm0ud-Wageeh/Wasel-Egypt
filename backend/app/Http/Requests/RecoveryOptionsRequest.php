<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecoveryOptionsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for recovery option generation.
     */
    public function rules(): array
    {
        return [
            'max_options' => ['nullable', 'integer', 'min:1', 'max:3'],
        ];
    }
}
