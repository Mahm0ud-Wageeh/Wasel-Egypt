<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Journey extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'journeys';

    protected $fillable = [
        'user_id',
        'origin_stop_id',
        'dest_stop_id',
        'origin_lat',
        'origin_lng',
        'dest_lat',
        'destination_lat',
        'dest_lng',
        'destination_lng',
        'started_at',
        'completed_at',
        'status',
        'total_fare',
        'requested_at',
        'total_duration_sec',
        'total_transfers',
        'walk_distance_meters',
        'score',
    ];

    protected $attributes = [
        'total_duration_sec' => 0,
        'total_transfers' => 0,
        'walk_distance_meters' => 0,
        'score' => 1.0,
        'total_fare' => 0.0,
    ];

    protected $appends = [
        'total_legs',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'origin_stop_id' => 'integer',
            'dest_stop_id' => 'integer',
            'origin_lat' => 'decimal:7',
            'origin_lng' => 'decimal:7',
            'dest_lat' => 'decimal:7',
            'dest_lng' => 'decimal:7',
            'destination_lat' => 'decimal:7',
            'destination_lng' => 'decimal:7',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'requested_at' => 'datetime',
            'total_duration_sec' => 'integer',
            'total_transfers' => 'integer',
            'walk_distance_meters' => 'integer',
            'total_fare' => 'decimal:2',
            'score' => 'decimal:4',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function originStop()
    {
        return $this->belongsTo(TransitStop::class, 'origin_stop_id');
    }

    public function destStop()
    {
        return $this->belongsTo(TransitStop::class, 'dest_stop_id');
    }

    public function legs()
    {
        return $this->hasMany(JourneyLeg::class)->orderBy('sequence');
    }

    public function journeyLegs()
    {
        return $this->hasMany(JourneyLeg::class)->orderBy('sequence');
    }

    public function transfers()
    {
        return $this->hasMany(JourneyLegTransfer::class);
    }

    public function events()
    {
        return $this->hasMany(JourneyEvent::class);
    }

    public function tracks()
    {
        return $this->hasMany(JourneyTrack::class);
    }

    public function feedback()
    {
        return $this->hasOne(TripFeedback::class);
    }

    public function activeJourney()
    {
        return $this->hasOne(ActiveJourney::class);
    }

    public function savedTrips()
    {
        return $this->hasMany(SavedTrip::class);
    }

    public function setDestLatAttribute($value)
    {
        $this->attributes['dest_lat'] = $value;
        $this->attributes['destination_lat'] = $value;
    }

    public function setDestinationLatAttribute($value)
    {
        $this->attributes['dest_lat'] = $value;
        $this->attributes['destination_lat'] = $value;
    }

    public function getDestLatAttribute()
    {
        return $this->attributes['dest_lat'] ?? $this->attributes['destination_lat'] ?? null;
    }

    public function getDestinationLatAttribute()
    {
        return $this->attributes['destination_lat'] ?? $this->attributes['dest_lat'] ?? null;
    }

    public function setDestLngAttribute($value)
    {
        $this->attributes['dest_lng'] = $value;
        $this->attributes['destination_lng'] = $value;
    }

    public function setDestinationLngAttribute($value)
    {
        $this->attributes['dest_lng'] = $value;
        $this->attributes['destination_lng'] = $value;
    }

    public function getDestLngAttribute()
    {
        return $this->attributes['dest_lng'] ?? $this->attributes['destination_lng'] ?? null;
    }

    public function getDestinationLngAttribute()
    {
        return $this->attributes['destination_lng'] ?? $this->attributes['dest_lng'] ?? null;
    }

    /**
     * Computed accessor for total_legs
     */
    public function getTotalLegsAttribute(): int
    {
        return $this->legs()->count();
    }
}
