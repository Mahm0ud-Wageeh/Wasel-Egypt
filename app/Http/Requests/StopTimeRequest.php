<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StopTimeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete stop times
        return $this->user() !== null && $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules()
    {
        $stopTimeId = $this->route('id');

        return [
            'schedule_id' => 'required|exists:schedules,id',
            'transit_stop_id' => 'required|exists:transit_stops,id',
            'sequence' => [
                'required',
                'integer',
                'min:0',
                Rule::unique('stop_times')->ignore($stopTimeId, 'id')->where(function ($query) {
                    $query->where('schedule_id', $this->input('schedule_id'))
                          ->where('sequence', $this->input('sequence'));
                }),
            ],
            'arrival_time' => 'nullable|date_format:H:i:s',
            'departure_time' => 'nullable|date_format:H:i:s',
            'pickup_type' => 'integer|in:0,1,2,3', // 0: regular pickup, 1: no pickup, 2: must phone agency, 3: must coordinate with driver
            'drop_off_type' => 'integer|in:0,1,2,3', // 0: regular drop off, 1: no drop off, 2: must phone agency, 3: must coordinate with driver
            'timepoint' => 'boolean',
        ];
    }
}