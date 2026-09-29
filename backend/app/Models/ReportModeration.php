<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ReportModeration extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'report_moderations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'community_report_id',
        'moderator_id',
        'action_taken',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'community_report_id' => 'integer',
            'moderator_id' => 'integer',
            'action_taken' => 'string',
            'notes' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the community report for the report moderation.
     */
    public function communityReport()
    {
        return $this->belongsTo(CommunityReport::class);
    }

    /**
     * Get the moderator for the report moderation.
     */
    public function moderator()
    {
        return $this->belongsTo(User::class);
    }
}
