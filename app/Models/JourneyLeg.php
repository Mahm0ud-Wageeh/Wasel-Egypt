<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JourneyLeg extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'journey_legs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'journey_id',
        'route_variant_id',
        'transit_stop_from_id',
        'transit_stop_to_id',
        'from_lat',
        'from_lng',
        'to_lat',
        'to_lng',
        'sequence',
        'departure_time',
        'arrival_time',
        'duration_sec',
        'distance_meters',
        'geometry',
        'geometry_source',
        'leg_steps',
        'mode',
        'agency_id',
        'leg_score',
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
            'route_variant_id' => 'integer',
            'transit_stop_from_id' => 'integer',
            'transit_stop_to_id' => 'integer',
            'from_lat' => 'decimal:8',
            'from_lng' => 'decimal:8',
            'to_lat' => 'decimal:8',
            'to_lng' => 'decimal:8',
            'sequence' => 'integer',
            'departure_time' => 'datetime',
            'arrival_time' => 'datetime',
            'duration_sec' => 'integer',
            'distance_meters' => 'integer',
            'geometry' => 'array',
            'leg_steps' => 'array',
            'mode' => 'string',
            'agency_id' => 'integer',
            'leg_score' => 'decimal:4',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the journey for the journey leg.
     */
    public function journey()
    {
        return $this->belongsTo(Journey::class);
    }

    /**
     * Get the route variant for the journey leg.
     */
    public function routeVariant()
    {
        return $this->belongsTo(RouteVariant::class);
    }

    /**
     * Get the transit stop from for the journey leg.
     */
    public function transitStopFrom()
    {
        return $this->belongsTo(TransitStop::class, 'transit_stop_from_id');
    }

    /**
     * Get the transit stop to for the journey leg.
     */
    public function transitStopTo()
    {
        return $this->belongsTo(TransitStop::class, 'transit_stop_to_id');
    }

    /**
     * Get the transfers from for the journey leg.
     */
    public function transfersFrom()
    {
        return $this->hasMany(Transfer::class, 'from_leg_id');
    }

    /**
     * Get the transfers to for the journey leg.
     */
    public function transfersTo()
    {
        return $this->hasMany(Transfer::class, 'to_leg_id');
    }

    /**
     * Get the agency for the journey leg.
     */
    public function agency()
    {
        return $this->belongsTo(TransitOperator::class, 'agency_id');
    }
}
