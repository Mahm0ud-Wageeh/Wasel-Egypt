<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Route extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'routes';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'gtfs_route_id',
        'transit_operator_id',
        'transit_mode_id',
        'short_name',
        'long_name',
        'description',
        'color',
        'text_color',
        'sort_order',
        'active',
        'type',
        'url',
        'continuous_pickup',
        'continuous_drop_off',
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
            'transit_operator_id' => 'integer',
            'transit_mode_id' => 'integer',
            'sort_order' => 'integer',
            'active' => 'boolean',
            'type' => 'integer',
            'continuous_pickup' => 'integer',
            'continuous_drop_off' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the transit operator for the route.
     */
    public function transitOperator()
    {
        return $this->belongsTo(TransitOperator::class);
    }

    /**
     * Get the transit mode for the route.
     */
    public function transitMode()
    {
        return $this->belongsTo(TransitMode::class);
    }

    /**
     * Get the route variants for the route.
     */
    public function routeVariants()
    {
        return $this->hasMany(RouteVariant::class);
    }

    /**
     * Get the schedules for the route.
     */
    public function schedules()
    {
        return $this->hasManyThrough(Schedule::class, RouteVariant::class);
    }

    /**
     * Get the journey legs for the route.
     */
    public function journeyLegs()
    {
        return $this->hasManyThrough(JourneyLeg::class, RouteVariant::class);
    }

    /**
     * Get the service alert links for the route's variants.
     *
     * The ERD links service alerts to route VARIANTS through the
     * service_alert_routes pivot, so the through-chain is
     * Route -> RouteVariant -> ServiceAlertRoute.
     */
    public function serviceAlertRoutes()
    {
        return $this->hasManyThrough(ServiceAlertRoute::class, RouteVariant::class);
    }

    /**
     * Get the name of the route (alias for long_name).
     *
     * @return string
     */
    public function getNameAttribute()
    {
        return $this->long_name;
    }
}
