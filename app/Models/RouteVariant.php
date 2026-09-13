<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RouteVariant extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'route_variants';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'route_id',
        'name',
        'direction',
        'headsign',
        'active',
        'reliability_score',
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
            'route_id' => 'integer',
            'active' => 'boolean',
            'reliability_score' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the route for the route variant.
     */
    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    /**
     * Get the route geometry for the route variant.
     */
    public function routeGeometry()
    {
        return $this->hasOne(RouteGeometry::class);
    }

    /**
     * Get the route stops for the route variant.
     */
    public function routeStops()
    {
        return $this->hasMany(RouteStop::class);
    }

    /**
     * Get the schedules for the route variant.
     */
    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    /**
     * Get the journey legs for the route variant.
     */
    public function journeyLegs()
    {
        return $this->hasMany(JourneyLeg::class);
    }

    /**
     * Get the service alert routes for the route variant.
     */
    public function serviceAlertRoutes()
    {
        return $this->hasMany(ServiceAlertRoute::class);
    }
}
