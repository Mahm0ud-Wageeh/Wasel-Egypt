<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JourneyLegTransfer extends Model
{
    use SoftDeletes;

    protected $table = 'journey_leg_transfers';

    protected $fillable = [
        'journey_id',
        'from_leg_id',
        'to_leg_id',
        'transfer_type',
        'transfer_duration_sec',
        'from_lat',
        'from_longitude',
        'to_lat',
        'to_longitude',
    ];

    protected function casts(): array
    {
        return [
            'journey_id' => 'integer',
            'from_leg_id' => 'integer',
            'to_leg_id' => 'integer',
            'transfer_type' => 'string',
            'transfer_duration_sec' => 'integer',
            'from_lat' => 'decimal:8',
            'from_longitude' => 'decimal:8',
            'to_lat' => 'decimal:8',
            'to_longitude' => 'decimal:8',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function journey()
    {
        return $this->belongsTo(Journey::class);
    }

    public function fromLeg()
    {
        return $this->belongsTo(JourneyLeg::class, 'from_leg_id');
    }

    public function toLeg()
    {
        return $this->belongsTo(JourneyLeg::class, 'to_leg_id');
    }
}
