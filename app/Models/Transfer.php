<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    protected $table = 'transfers';

    protected $fillable = [
        'from_stop_id',
        'to_stop_id',
        'min_transfer_time_s',
        'distance_m',
        'is_accessible',
    ];

    protected function casts(): array
    {
        return [
            'from_stop_id' => 'integer',
            'to_stop_id' => 'integer',
            'min_transfer_time_s' => 'integer',
            'distance_m' => 'integer',
            'is_accessible' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function fromStop()
    {
        return $this->belongsTo(TransitStop::class, 'from_stop_id');
    }

    public function toStop()
    {
        return $this->belongsTo(TransitStop::class, 'to_stop_id');
    }
}
