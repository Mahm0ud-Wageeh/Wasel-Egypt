<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JourneyEvent extends Model
{
    use HasFactory;

    protected $table = 'journey_events';

    public $timestamps = false;

    protected $fillable = [
        'journey_id',
        'event_type',
        'payload_json',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'journey_id' => 'integer',
            'event_type' => 'string',
            'payload_json' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function journey(): BelongsTo
    {
        return $this->belongsTo(Journey::class);
    }
}
