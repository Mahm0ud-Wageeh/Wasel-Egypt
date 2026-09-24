<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentReport extends Model
{
    use HasFactory;

    protected $table = 'incident_reports';

    protected $fillable = [
        'user_id',
        'route_id',
        'transit_stop_id',
        'kind',
        'severity',
        'status',
        'description',
        'latitude',
        'longitude',
        'confirms',
        'denies',
        'trust_score',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'route_id' => 'integer',
            'transit_stop_id' => 'integer',
            'kind' => 'string',
            'severity' => 'string',
            'status' => 'string',
            'description' => 'string',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'confirms' => 'integer',
            'denies' => 'integer',
            'trust_score' => 'float',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function transitStop(): BelongsTo
    {
        return $this->belongsTo(TransitStop::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(IncidentVote::class);
    }

    /**
     * Recalculates cached confirms and denies count based on votes.
     */
    public function recalculateVotes(): void
    {
        $this->confirms = $this->votes()->where('vote', 'confirm')->count();
        $this->denies = $this->votes()->where('vote', 'deny')->count();
        $this->save();
    }
}
