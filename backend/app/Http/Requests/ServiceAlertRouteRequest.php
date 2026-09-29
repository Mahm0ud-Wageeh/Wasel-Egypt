<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ServiceAlertRouteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete service alert routes
        return $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        return [
            'service_alert_id' => 'required|exists:service_alerts,id',
            'route_variant_id' => 'required|exists:route_variants,id',
        ];
    }
}