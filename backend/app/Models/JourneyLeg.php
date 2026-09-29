<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JourneyLeg extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'journey_legs';

    protected $fillable = [
        'journey_id',
        'sequence',
        'leg_type',
        'transit_mode_id',
        'route_variant_id',
        'from_stop_id',
        'to_stop_id',
        'transit_stop_from_id',
        'transit_stop_to_id',
        'from_lat',
        'from_lng',
        'to_lat',
        'to_lng',
        'distance_m',
        'fare',
        'boarding_at',
        'alighting_at',
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

    protected $attributes = [
        'duration_sec' => 0,
        'distance_meters' => 0,
        'mode' => 'walking',
        'leg_score' => 1.0,
    ];

    public function setDistanceMAttribute($value)
    {
        $this->attributes['distance_m'] = $value;
        $this->attributes['distance_meters'] = $value;
    }

    public function setDistanceMetersAttribute($value)
    {
        $this->attributes['distance_m'] = $value;
        $this->attributes['distance_meters'] = $value;
    }

    protected static function booted()
    {
        static::saving(function ($leg) {
            if ($leg->from_lat === null) {
                if ($leg->fromStop) {
                    $leg->from_lat = $leg->fromStop->latitude;
                    $leg->from_lng = $leg->fromStop->longitude;
                } else {
                    $leg->from_lat = 0;
                    $leg->from_lng = 0;
                }
            }
            if ($leg->to_lat === null) {
                if ($leg->toStop) {
                    $leg->to_lat = $leg->toStop->latitude;
                    $leg->to_lng = $leg->toStop->longitude;
                } else {
                    $leg->to_lat = 0;
                    $leg->to_lng = 0;
                }
            }
        });
    }

    public function setLegTypeAttribute($value)
    {
        $this->attributes['leg_type'] = $value;
        if (empty($this->attributes['mode'])) {
            $this->attributes['mode'] = ($value === 'walk') ? 'walking' : 'metro';
        }
    }

    protected function casts(): array
    {
        return [
            'journey_id' => 'integer',
            'sequence' => 'integer',
            'leg_type' => 'string',
            'transit_mode_id' => 'integer',
            'route_variant_id' => 'integer',
            'from_stop_id' => 'integer',
            'to_stop_id' => 'integer',
            'transit_stop_from_id' => 'integer',
            'transit_stop_to_id' => 'integer',
            'from_lat' => 'decimal:7',
            'from_lng' => 'decimal:7',
            'to_lat' => 'decimal:7',
            'to_lng' => 'decimal:7',
            'distance_m' => 'integer',
            'fare' => 'decimal:2',
            'boarding_at' => 'datetime',
            'alighting_at' => 'datetime',
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

    public function journey(): BelongsTo
    {
        return $this->belongsTo(Journey::class);
    }

    public function routeVariant(): BelongsTo
    {
        return $this->belongsTo(RouteVariant::class);
    }

    public function transitMode(): BelongsTo
    {
        return $this->belongsTo(TransitMode::class);
    }

    public function fromStop(): BelongsTo
    {
        return $this->belongsTo(TransitStop::class, 'from_stop_id');
    }

    public function toStop(): BelongsTo
    {
        return $this->belongsTo(TransitStop::class, 'to_stop_id');
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(TransitOperator::class, 'agency_id');
    }

    public function transitOperator(): BelongsTo
    {
        return $this->belongsTo(TransitOperator::class, 'agency_id');
    }

    /**
     * Backward-compatibility accessor / relation for legacy tests.
     */
    public function transitStopFrom(): BelongsTo
    {
        return $this->belongsTo(TransitStop::class, $this->from_stop_id ? 'from_stop_id' : 'transit_stop_from_id');
    }

    /**
     * Backward-compatibility accessor / relation for legacy tests.
     */
    public function transitStopTo(): BelongsTo
    {
        return $this->belongsTo(TransitStop::class, $this->to_stop_id ? 'to_stop_id' : 'transit_stop_to_id');
    }

    /**
     * Accessor for mode (transit code, 'walk', or legacy mode attribute).
     */
    public function getModeAttribute($value): string
    {
        if ($this->leg_type === 'walk') {
            return 'walk';
        }
        if ($this->transitMode) {
            return $this->transitMode->code;
        }
        return $value ?? 'transit';
    }

    /**
     * Accessor for duration in seconds.
     */
    public function getDurationSecAttribute($value): ?int
    {
        if ($value !== null) {
            return $value;
        }
        if ($this->boarding_at && $this->alighting_at) {
            return $this->alighting_at->diffInSeconds($this->boarding_at);
        }
        return null;
    }

    /**
     * Accessor for distance_m fallback.
     */
    public function getDistanceMAttribute($value): ?int
    {
        return $value ?? $this->attributes['distance_meters'] ?? null;
    }
}
