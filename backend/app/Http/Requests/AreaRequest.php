<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AreaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete areas
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $areaId = $this->route('id');

        return [
            'governorate_id' => 'required|exists:governorates,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('areas', 'name')->ignore($areaId),
            ],
        ];
    }
}