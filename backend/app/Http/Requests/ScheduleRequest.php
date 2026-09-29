<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScheduleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete schedules
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $scheduleId = $this->route('schedule');

        return [
            'route_variant_id' => $scheduleId ? ['nullable', 'exists:route_variants,id'] : ['required', 'exists:route_variants,id'],
            'gtfs_trip_id' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('schedules', 'gtfs_trip_id')->ignore($scheduleId),
            ],
            'service_id' => 'nullable|string|max:50',
            'direction_id' => 'integer|in:0,1', // 0: outbound, 1: inbound
            'headsign' => 'nullable|string|max:255',
            'wheelchair_accessible' => 'boolean',
            'notes' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ];
    }
}