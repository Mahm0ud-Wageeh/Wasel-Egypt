<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransitModeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only authenticated users can access transit mode endpoints
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        return [
            'name' => 'required|string|max:255|unique:transit_modes,name,' . ($this->route('transitMode') ?? ''),
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
        ];
    }
}