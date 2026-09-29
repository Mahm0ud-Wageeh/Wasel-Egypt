<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitOperatorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete transit operators
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $transitOperatorId = $this->route('id');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('transit_operators', 'name')->ignore($transitOperatorId),
            ],
            'short_code' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('transit_operators', 'short_code')->ignore($transitOperatorId),
            ],
            'website' => 'nullable|url',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:20',
        ];
    }
}