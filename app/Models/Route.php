<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Route extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'routes';

    protected $fillable = [
        'name',
        'gtfs_route_id',
        'operator_id',
        'transit_operator_id',
        'transit_mode_id',
        'short_name',
        'long_name',
        'long_name_ar',
        'color',
        'active',
        'source',
        'description',
        'text_color',
        'sort_order',
        'type',
        'url',
        'continuous_pickup',
        'continuous_drop_off',
        'import_log_id',
    ];

    public function setNameAttribute($value): void
    {
        $this->attributes['long_name'] = $value;
        $this->attributes['name'] = $value;
    }

    public function getNameAttribute($value): ?string
    {
        return $value ?? $this->attributes['long_name'] ?? null;
    }

    protected function casts(): array
    {
        return [
            'operator_id' => 'integer',
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

    public function setOperatorIdAttribute($value): void
    {
        $this->attributes['operator_id'] = $value;
        $this->attributes['transit_operator_id'] = $value;
    }

    public function setTransitOperatorIdAttribute($value): void
    {
        $this->attributes['operator_id'] = $value;
        $this->attributes['transit_operator_id'] = $value;
    }

    public function getOperatorIdAttribute($value): ?int
    {
        return $value ?? $this->attributes['transit_operator_id'] ?? null;
    }

    public function getTransitOperatorIdAttribute($value): ?int
    {
        return $value ?? $this->attributes['operator_id'] ?? null;
    }

    public function operator()
    {
        return $this->belongsTo(TransitOperator::class, 'operator_id');
    }

    public function transitOperator()
    {
        return $this->belongsTo(TransitOperator::class, 'operator_id');
    }

    public function transitMode()
    {
        return $this->belongsTo(TransitMode::class);
    }

    public function variants()
    {
        return $this->hasMany(RouteVariant::class);
    }

    public function routeVariants()
    {
        return $this->hasMany(RouteVariant::class);
    }

    public function alerts()
    {
        return $this->hasMany(RouteAlert::class);
    }

    public function incidentReports()
    {
        return $this->hasMany(IncidentReport::class);
    }

    public function fares()
    {
        return $this->hasMany(Fare::class);
    }

    public function serviceAlertRoutes()
    {
        return $this->hasManyThrough(
            ServiceAlertRoute::class,
            RouteVariant::class,
            'route_id',
            'route_variant_id',
            'id',
            'id'
        );
    }
}
