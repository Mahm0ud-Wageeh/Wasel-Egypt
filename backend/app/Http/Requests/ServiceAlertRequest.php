<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServiceAlertRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete service alerts
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $serviceAlertId = $this->route('id');

        return [
            'gtfs_alert_id' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('service_alerts', 'gtfs_alert_id')->ignore($serviceAlertId),
            ],
            'header_text' => 'required|string|max:255',
            'description_text' => 'nullable|string',
            'url' => 'nullable|url',
            'severity' => 'nullable|in:unknown,info,warning,severe', // GTFS severity levels
            'consequence' => 'nullable|in:unknown,no_service,reduced_service,significant_delays,detour,additional_service,modified_service,other_effect,back_to_normal,unknown_effect', // GTFS consequence
            'active_period_start' => 'nullable|date',
            'active_period_end' => 'nullable|date|after_or_equal:active_period_start',
        ];
    }
}