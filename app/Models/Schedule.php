<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Schedule extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'schedules';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'route_variant_id',
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

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'route_variant_id' => 'integer',
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

    /**
     * Get the route variant for the schedule.
     */
    public function routeVariant()
    {
        return $this->belongsTo(RouteVariant::class);
    }

    /**
     * Get the stop times for the schedule.
     */
    public function stopTimes()
    {
        return $this->hasMany(StopTime::class);
    }
}