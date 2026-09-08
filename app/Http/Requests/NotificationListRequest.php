<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class NotificationListRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for the notification listing filters.
     */
    public function rules(): array
    {
        return [
            'unread' => ['nullable', 'boolean'],
            'type' => ['nullable', 'string', 'in:journey_started,journey_deviation,recovery_options_ready,journey_rerouted,journey_completed,journey_cancelled,report_verified,report_rejected,report_resolved'],
            'priority' => ['nullable', 'string', 'in:low,normal,high,urgent'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
