<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NotificationPreference extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'notification_preferences';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'notify_journey_planned',
        'notify_journey_started',
        'notify_deviation_detected',
        'notify_recovery_available',
        'notify_journey_completed',
        'notify_report_status_change',
        'notify_service_alert_affected',
        'notify_weekly_summary',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'notify_journey_planned' => 'boolean',
            'notify_journey_started' => 'boolean',
            'notify_deviation_detected' => 'boolean',
            'notify_recovery_available' => 'boolean',
            'notify_journey_completed' => 'boolean',
            'notify_report_status_change' => 'boolean',
            'notify_service_alert_affected' => 'boolean',
            'notify_weekly_summary' => 'boolean',
            'quiet_hours_enabled' => 'boolean',
            'quiet_hours_start' => 'string',
            'quiet_hours_end' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the user for the notification preference.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
