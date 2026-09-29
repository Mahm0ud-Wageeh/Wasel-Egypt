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
     * Recalculates cached confirms and denies count and computes trust score based on votes (Phases 22 & 23).
     */
    public function recalculateVotes(): void
    {
        $this->confirms = $this->votes()->where('vote', 'confirm')->count();
        $this->denies = $this->votes()->where('vote', 'deny')->count();

        $total = $this->confirms + $this->denies;
        if ($total === 0) {
            $this->trust_score = 1.0;
        } else {
            // Normalized confidence between 0.0 and 1.0 with prior weight
            $this->trust_score = round(($this->confirms + 1) / ($total + 2), 2);
        }

        // Automatic status update based on community verification
        if ($this->denies >= 3 && $this->denies >= $this->confirms * 2) {
            $this->status = 'dismissed';
        } elseif ($this->confirms >= 3 && $this->confirms > $this->denies) {
            $this->status = 'confirmed';
        }

        $this->save();
    }
}
