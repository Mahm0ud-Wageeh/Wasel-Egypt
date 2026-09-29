<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GtfsImportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can import GTFS data
        return $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        return [
            'gtfs_zip' => 'required|file|mimes:zip|max:50480', // 50MB max
        ];
    }
}