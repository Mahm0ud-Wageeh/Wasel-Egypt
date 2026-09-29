<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentVote extends Model
{
    use HasFactory;

    protected $table = 'incident_votes';

    public $timestamps = false;

    protected $fillable = [
        'incident_report_id',
        'user_id',
        'vote',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'incident_report_id' => 'integer',
            'user_id' => 'integer',
            'vote' => 'string',
            'created_at' => 'datetime',
        ];
    }

    public function incidentReport(): BelongsTo
    {
        return $this->belongsTo(IncidentReport::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
