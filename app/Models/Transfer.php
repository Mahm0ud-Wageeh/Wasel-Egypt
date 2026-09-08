<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transfer extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'transfers';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
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

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
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

    /**
     * Get the journey for the transfer.
     */
    public function journey()
    {
        return $this->belongsTo(Journey::class);
    }

    /**
     * Get the from leg for the transfer.
     */
    public function fromLeg()
    {
        return $this->belongsTo(JourneyLeg::class, 'from_leg_id');
    }

    /**
     * Get the to leg for the transfer.
     */
    public function toLeg()
    {
        return $this->belongsTo(JourneyLeg::class, 'to_leg_id');
    }
}
