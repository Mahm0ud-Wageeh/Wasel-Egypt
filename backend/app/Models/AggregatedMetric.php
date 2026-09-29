<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AggregatedMetric extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'aggregated_metrics';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'metric_name',
        'metric_value',
        'dimension',
        'period_start',
        'period_end',
        'calculated_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metric_name' => 'string',
            'metric_value' => 'decimal:6',
            'dimension' => 'array',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'calculated_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }
}
