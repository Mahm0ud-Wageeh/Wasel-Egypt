<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActiveJourney extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'active_journeys';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'journey_id',
        'user_id',
        'started_at',
        'ended_at',
        'current_leg_index',
        'current_progress_percent',
        'status',
        'deviation_detected_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'journey_id' => 'integer',
            'user_id' => 'integer',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'current_leg_index' => 'integer',
            'current_progress_percent' => 'decimal:2',
            'status' => 'string',
            'deviation_detected_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the journey for the active journey.
     */
    public function journey()
    {
        return $this->belongsTo(Journey::class);
    }

    /**
     * Get the user for the active journey.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the journey progress for the active journey.
     */
    public function journeyProgress()
    {
        return $this->hasMany(JourneyProgress::class);
    }

    /**
     * Get the latest journey progress record for the active journey.
     */
    public function latestJourneyProgress()
    {
        return $this->hasOne(JourneyProgress::class)->latestOfMany();
    }

    /**
     * Get the deviation events for the active journey.
     */
    public function deviationEvents()
    {
        return $this->hasMany(DeviationEvent::class);
    }

    /**
     * Get the latest deviation event for the active journey.
     */
    public function latestDeviationEvent()
    {
        return $this->hasOne(DeviationEvent::class)->latestOfMany();
    }

    /**
     * Get the recovery routes for the active journey.
     */
    public function recoveryRoutes()
    {
        return $this->hasMany(RecoveryRoute::class);
    }
}
