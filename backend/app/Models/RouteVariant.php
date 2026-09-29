<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RouteVariant extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'route_variants';

    protected $fillable = [
        'route_id',
        'name',
        'name_ar',
        'direction',
        'headsign',
        'active',
        'reliability_score',
        'import_log_id',
    ];

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

    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    public function geometry()
    {
        return $this->hasOne(RouteGeometry::class);
    }

    public function routeGeometry()
    {
        return $this->hasOne(RouteGeometry::class);
    }

    public function routeStops()
    {
        return $this->hasMany(RouteStop::class)->orderBy('sequence');
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    public function journeyLegs()
    {
        return $this->hasMany(JourneyLeg::class);
    }

    public function serviceAlertRoutes()
    {
        return $this->hasMany(ServiceAlertRoute::class);
    }
}
