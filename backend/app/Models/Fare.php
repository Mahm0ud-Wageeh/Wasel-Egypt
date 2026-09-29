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
        'min_stations',
        'max_stations',
        'amount',
        'currency',
        'effective_date',
        'end_date',
        'source',
        'source_label',
        'is_estimate',
        'label',
        'tier',
        'origin_stop_id',
        'destination_stop_id',
        'zone',
        'distance_min_km',
        'distance_max_km',
        'student_amount',
        'senior_amount',
        'card_type',
        'effective_from',
        'effective_until',
        'confidence',
        'data_status',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'transit_mode_id' => 'integer',
            'min_stations' => 'integer',
            'max_stations' => 'integer',
            'amount' => 'decimal:2',
            'effective_date' => 'date',
            'end_date' => 'date',
            'is_estimate' => 'boolean',
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

    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString());
        })->where(function ($q) {
            $q->whereNull('effective_until')->orWhere('effective_until', '>=', now()->toDateString());
        })->where(function ($q) {
            $q->whereNull('status')->orWhere('status', 'active');
        });
    }
}
