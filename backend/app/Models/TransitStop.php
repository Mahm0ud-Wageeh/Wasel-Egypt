<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TransitStop extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'transit_stops';

    protected $fillable = [
        'gtfs_stop_id',
        'name',
        'name_ar',
        'name_en',
        'latitude',
        'longitude',
        'location_accuracy',
        'parent_station_id',
        'area_id',
        'is_interchange',
        'wheelchair_boarding',
        'wheelchair_accessible',
        'active',
        'source',
        'platform_code',
        'import_log_id',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'parent_station_id' => 'integer',
            'area_id' => 'integer',
            'is_interchange' => 'boolean',
            'wheelchair_boarding' => 'integer',
            'wheelchair_accessible' => 'boolean',
            'active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Parent station grouping platform stops of one physical station.
     */
    public function parentStation()
    {
        return $this->belongsTo(TransitStop::class, 'parent_station_id');
    }

    /**
     * Child platform stops for a physical station hub.
     */
    public function childPlatforms()
    {
        return $this->hasMany(TransitStop::class, 'parent_station_id');
    }

    public function platforms()
    {
        return $this->hasMany(TransitStop::class, 'parent_station_id');
    }

    public function getNameEnAttribute(): ?string
    {
        return $this->attributes['name'] ?? null;
    }

    public function setNameEnAttribute(?string $val): void
    {
        if ($val !== null && empty($this->attributes['name'])) {
            $this->attributes['name'] = $val;
        }
    }

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function routeStops()
    {
        return $this->hasMany(RouteStop::class);
    }

    public function stopTimes()
    {
        return $this->hasMany(StopTime::class);
    }

    public function transfersFrom()
    {
        return $this->hasMany(Transfer::class, 'from_stop_id');
    }

    public function transfersTo()
    {
        return $this->hasMany(Transfer::class, 'to_stop_id');
    }

    public function incidentReports()
    {
        return $this->hasMany(IncidentReport::class);
    }

    public function routeAlerts()
    {
        return $this->hasMany(RouteAlert::class);
    }

    public function serviceAlertStops()
    {
        return $this->hasMany(ServiceAlertStop::class);
    }

    public function journeyLegsFrom()
    {
        return $this->hasMany(JourneyLeg::class, 'from_stop_id');
    }

    public function journeyLegsTo()
    {
        return $this->hasMany(JourneyLeg::class, 'to_stop_id');
    }

    public function journeyProgress()
    {
        return $this->hasMany(JourneyProgress::class, 'nearest_stop_id');
    }

    public function activeJourneys()
    {
        return $this->hasMany(ActiveJourney::class, 'nearest_stop_id');
    }

    /**
     * Localized name accessor based on active locale.
     */
    public function getLocalizedNameAttribute(): string
    {
        if (app()->getLocale() === 'ar') {
            return $this->name_ar ?: $this->name;
        }
        return $this->name ?: ($this->name_ar ?? '');
    }
}
