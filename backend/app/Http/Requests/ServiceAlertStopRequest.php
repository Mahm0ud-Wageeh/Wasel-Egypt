<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ServiceAlertStopRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete service alert stops
        return $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        return [
            'service_alert_id' => 'required|exists:service_alerts,id',
            'transit_stop_id' => 'required|exists:transit_stops,id',
        ];
    }
}