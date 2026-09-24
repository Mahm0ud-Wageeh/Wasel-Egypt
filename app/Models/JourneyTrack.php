<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JourneyTrack extends Model
{
    use HasFactory;

    protected $table = 'journey_tracks';

    public $timestamps = false;

    protected $fillable = [
        'journey_id',
        'latitude',
        'longitude',
        'accuracy_m',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'journey_id' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'accuracy_m' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function journey(): BelongsTo
    {
        return $this->belongsTo(Journey::class);
    }
}
