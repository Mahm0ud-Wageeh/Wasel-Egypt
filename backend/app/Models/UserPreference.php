<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserPreference extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_preferences';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'preferred_modes',
        'avoided_modes',
        'max_transfers',
        'walk_speed',
        'avoid_hills',
        'wheelchair_accessible',
        'max_walk_distance_per_leg',
        'notification_email_enabled',
        'notification_push_enabled',
        'notification_sms_enabled',
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
            'preferred_modes' => 'array',
            'avoided_modes' => 'array',
            'max_transfers' => 'integer',
            'walk_speed' => 'string',
            'avoid_hills' => 'boolean',
            'wheelchair_accessible' => 'boolean',
            'max_walk_distance_per_leg' => 'integer',
            'notification_email_enabled' => 'boolean',
            'notification_push_enabled' => 'boolean',
            'notification_sms_enabled' => 'boolean',
            'quiet_hours_start' => 'time',
            'quiet_hours_end' => 'time',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the user for the user preference.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
