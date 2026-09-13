<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TransitStop extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'transit_stops';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'gtfs_stop_id',
        'name',
        'latitude',
        'longitude',
        'location_accuracy',
        'wheelchair_accessible',
        'platform_code',
        'area_id',
        'import_log_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'wheelchair_accessible' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the area for the transit stop.
     */
    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * Get the route stops for the transit stop.
     */
    public function routeStops()
    {
        return $this->hasMany(RouteStop::class);
    }

    /**
     * Get the service alert stops for the transit stop.
     */
    public function serviceAlertStops()
    {
        return $this->hasMany(ServiceAlertStop::class);
    }

    /**
     * Get the journey legs (from) for the transit stop.
     */
    public function journeyLegsFrom()
    {
        return $this->hasMany(JourneyLeg::class, 'transit_stop_from_id');
    }

    /**
     * Get the journey legs (to) for the transit stop.
     */
    public function journeyLegsTo()
    {
        return $this->hasMany(JourneyLeg::class, 'transit_stop_to_id');
    }

    /**
     * Get the stop times for the transit stop.
     */
    public function stopTimes()
    {
        return $this->hasMany(StopTime::class);
    }

    /**
     * Get the journey progress for the transit stop.
     */
    public function journeyProgress()
    {
        return $this->hasMany(JourneyProgress::class, 'nearest_stop_id');
    }

    /**
     * Get the deviation events for the transit stop.
     */
    public function deviationEvents()
    {
        return $this->hasMany(DeviationEvent::class, 'expected_stop_id');
    }

    /**
     * Get the community reports for the transit stop.
     */
    public function communityReports()
    {
        return $this->hasMany(CommunityReport::class, 'related_stop_id');
    }

    /**
     * Get the active journeys for the transit stop.
     */
    public function activeJourneys()
    {
        return $this->hasMany(ActiveJourney::class, 'nearest_stop_id');
    }
}
