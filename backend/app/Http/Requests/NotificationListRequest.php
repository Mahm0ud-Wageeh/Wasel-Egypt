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
     * Normalize boolean-ish query strings (?unread=true) before validation:
     * URL query params always arrive as strings, and Laravel's strict
     * `boolean` rule only accepts true/false/1/0/"1"/"0" — our own client
     * sends "true"/"false" and would 422 without this.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('unread') && is_string($this->input('unread'))) {
            $parsed = filter_var($this->input('unread'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($parsed !== null) {
                $this->merge(['unread' => $parsed]);
            }
        }
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
