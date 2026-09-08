<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Journey extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'journeys';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'origin_lat',
        'origin_lng',
        'destination_lat',
        'destination_lng',
        'requested_at',
        'total_duration_sec',
        'total_transfers',
        'walk_distance_meters',
        'score',
        'status',
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
            'origin_lat' => 'decimal:8',
            'origin_lng' => 'decimal:8',
            'destination_lat' => 'decimal:8',
            'destination_lng' => 'decimal:8',
            'requested_at' => 'datetime',
            'total_duration_sec' => 'integer',
            'total_transfers' => 'integer',
            'walk_distance_meters' => 'integer',
            'score' => 'decimal:4',
            'status' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the user for the journey.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the journey legs for the journey.
     */
    public function journeyLegs()
    {
        return $this->hasMany(JourneyLeg::class);
    }

    /**
     * Get the transfers between the journey legs.
     */
    public function transfers()
    {
        return $this->hasMany(Transfer::class);
    }

    /**
     * Get the saved trips for the journey.
     */
    public function savedTrips()
    {
        return $this->hasMany(SavedTrip::class);
    }

    /**
     * Get the active journey for the journey.
     */
    public function activeJourney()
    {
        return $this->hasOne(ActiveJourney::class);
    }
}
