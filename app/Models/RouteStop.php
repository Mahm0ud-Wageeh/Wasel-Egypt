<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RouteStop extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'route_stops';

    protected $fillable = [
        'route_variant_id',
        'transit_stop_id',
        'sequence',
        'is_timing_point',
        'travel_time_s',
        'distance_m',
        'pickup_type',
        'drop_off_type',
        'distance_from_prev',
    ];

    protected function casts(): array
    {
        return [
            'route_variant_id' => 'integer',
            'transit_stop_id' => 'integer',
            'sequence' => 'integer',
            'is_timing_point' => 'boolean',
            'travel_time_s' => 'integer',
            'distance_m' => 'integer',
            'pickup_type' => 'integer',
            'drop_off_type' => 'integer',
            'distance_from_prev' => 'decimal:3',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function routeVariant()
    {
        return $this->belongsTo(RouteVariant::class);
    }

    public function transitStop()
    {
        return $this->belongsTo(TransitStop::class);
    }

    public function stopTimes()
    {
        return $this->hasMany(StopTime::class);
    }
}
