<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StopTime extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'stop_times';

    protected $fillable = [
        'schedule_id',
        'trip_no',
        'route_stop_id',
        'transit_stop_id',
        'sequence',
        'arrival_time',
        'departure_time',
        'pickup_type',
        'drop_off_type',
        'timepoint',
    ];

    protected function casts(): array
    {
        return [
            'schedule_id' => 'integer',
            'trip_no' => 'integer',
            'route_stop_id' => 'integer',
            'transit_stop_id' => 'integer',
            'sequence' => 'integer',
            'arrival_time' => 'string',
            'departure_time' => 'string',
            'timepoint' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    public function routeStop()
    {
        return $this->belongsTo(RouteStop::class);
    }

    public function transitStop()
    {
        return $this->belongsTo(TransitStop::class);
    }
}
