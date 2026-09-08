<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeviationEvent extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'deviation_events';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'active_journey_id',
        'occurred_at',
        'deviation_type',
        'description',
        'latitude',
        'longitude',
        'severity',
        'expected_stop_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active_journey_id' => 'integer',
            'occurred_at' => 'datetime',
            'deviation_type' => 'string',
            'description' => 'string',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'severity' => 'string',
            'expected_stop_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the active journey for the deviation event.
     */
    public function activeJourney()
    {
        return $this->belongsTo(ActiveJourney::class);
    }

    /**
     * Get the expected stop for the deviation event.
     */
    public function expectedStop()
    {
        return $this->belongsTo(TransitStop::class, 'expected_stop_id');
    }

    /**
     * Get the recovery routes for the deviation event.
     */
    public function recoveryRoutes()
    {
        return $this->hasMany(RecoveryRoute::class, 'deviation_event_id');
    }
}
