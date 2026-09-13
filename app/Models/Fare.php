<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Fare extends Model
{
    use SoftDeletes;

    protected $table = 'fares';

    protected $fillable = [
        'transit_mode_id',
        'transit_operator_id',
        'route_id',
        'label',
        'tier',
        'origin_stop_id',
        'destination_stop_id',
        'zone',
        'distance_min_km',
        'distance_max_km',
        'amount',
        'currency',
        'student_amount',
        'senior_amount',
        'card_type',
        'effective_from',
        'effective_until',
        'source',
        'confidence',
        'data_status',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'student_amount' => 'decimal:2',
            'senior_amount' => 'decimal:2',
            'distance_min_km' => 'decimal:2',
            'distance_max_km' => 'decimal:2',
            'effective_from' => 'date',
            'effective_until' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function transitMode()
    {
        return $this->belongsTo(TransitMode::class);
    }

    public function transitOperator()
    {
        return $this->belongsTo(TransitOperator::class);
    }

    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    public function originStop()
    {
        return $this->belongsTo(TransitStop::class, 'origin_stop_id');
    }

    public function destinationStop()
    {
        return $this->belongsTo(TransitStop::class, 'destination_stop_id');
    }

    /** Currently sellable fare rows. */
    public function scopeActive($query)
    {
        $today = now()->toDateString();

        return $query->where('status', 'active')
            ->where(function ($q) use ($today) {
                $q->whereNull('effective_from')->orWhere('effective_from', '<=', $today);
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('effective_until')->orWhere('effective_until', '>=', $today);
            });
    }
}
