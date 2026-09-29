<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JourneyProgress extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'journey_progress';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'active_journey_id',
        'client_seq',
        'is_backfill',
        'recorded_at',
        'latitude',
        'longitude',
        'speed_kph',
        'bearing_deg',
        'accuracy_meters',
        'nearest_stop_id',
        'nearest_stop_distance_meters',
        'is_stop_event',
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
            'client_seq' => 'integer',
            'is_backfill' => 'boolean',
            'recorded_at' => 'datetime',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'speed_kph' => 'decimal:2',
            'bearing_deg' => 'decimal:2',
            'accuracy_meters' => 'decimal:2',
            'nearest_stop_id' => 'integer',
            'nearest_stop_distance_meters' => 'decimal:3',
            'is_stop_event' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the active journey for the journey progress.
     */
    public function activeJourney()
    {
        return $this->belongsTo(ActiveJourney::class);
    }

    /**
     * Get the transit stop for the journey progress.
     */
    public function transitStop()
    {
        return $this->belongsTo(TransitStop::class, 'nearest_stop_id');
    }
}
