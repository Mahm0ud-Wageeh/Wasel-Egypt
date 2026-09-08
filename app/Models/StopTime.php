<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StopTime extends Model
{
    use SoftDeletes;
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'stop_times';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'schedule_id',
        'transit_stop_id',
        'sequence',
        'arrival_time',
        'departure_time',
        'pickup_type',
        'drop_off_type',
        'timepoint',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'schedule_id' => 'integer',
            'transit_stop_id' => 'integer',
            'sequence' => 'integer',
            'arrival_time' => 'string',
            'departure_time' => 'string',
            'pickup_type' => 'integer',
            'drop_off_type' => 'integer',
            'timepoint' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the schedule for the stop time.
     */
    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    /**
     * Get the transit stop for the stop time.
     */
    public function transitStop()
    {
        return $this->belongsTo(TransitStop::class);
    }
}
