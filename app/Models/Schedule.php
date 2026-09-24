<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Schedule extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'schedules';

    protected $fillable = [
        'route_variant_id',
        'day_type',
        'first_departure',
        'last_departure',
        'headway_peak_min',
        'headway_offpeak_min',
        'is_timetable_based',
        'active',
        'gtfs_trip_id',
        'service_id',
        'direction_id',
        'headsign',
        'wheelchair_accessible',
        'notes',
        'start_date',
        'end_date',
        'is_active',
        'frequency_windows',
        'import_log_id',
    ];

    protected function casts(): array
    {
        return [
            'route_variant_id' => 'integer',
            'headway_peak_min' => 'integer',
            'headway_offpeak_min' => 'integer',
            'is_timetable_based' => 'boolean',
            'active' => 'boolean',
            'direction_id' => 'integer',
            'wheelchair_accessible' => 'boolean',
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
            'frequency_windows' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function routeVariant()
    {
        return $this->belongsTo(RouteVariant::class);
    }

    public function stopTimes()
    {
        return $this->hasMany(StopTime::class);
    }

    public function exceptions()
    {
        return $this->hasMany(ScheduleException::class);
    }
}