<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecoveryRoute extends Model
{
    // The recovery_routes table has no deleted_at column; unaccepted options
    // are removed with hard deletes when regenerated.

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'recovery_routes';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'deviation_event_id',
        'alternative_journey_id',
        'estimated_delay_sec',
        'generated_at',
        'accepted_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'deviation_event_id' => 'integer',
            'alternative_journey_id' => 'integer',
            'estimated_delay_sec' => 'integer',
            'generated_at' => 'datetime',
            'accepted_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the deviation event for the recovery route.
     */
    public function deviationEvent()
    {
        return $this->belongsTo(DeviationEvent::class);
    }

    /**
     * Get the alternative journey for the recovery route.
     */
    public function alternativeJourney()
    {
        return $this->belongsTo(Journey::class);
    }
}
