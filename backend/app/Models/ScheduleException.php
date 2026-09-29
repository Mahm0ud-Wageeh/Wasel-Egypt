<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleException extends Model
{
    protected $table = 'schedule_exceptions';

    protected $fillable = [
        'schedule_id',
        'exception_date',
        'kind',
        'headway_override_min',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'schedule_id' => 'integer',
            'exception_date' => 'date',
            'headway_override_min' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }
}
