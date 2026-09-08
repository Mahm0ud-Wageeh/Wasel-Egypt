<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CommunityReport extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'community_reports';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'report_type',
        'description',
        'latitude',
        'longitude',
        'occurred_at',
        'status',
        'media_urls',
        'related_route_id',
        'related_stop_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'report_type' => 'string',
            'description' => 'string',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'occurred_at' => 'datetime',
            'status' => 'string',
            'media_urls' => 'array',
            'related_route_id' => 'integer',
            'related_stop_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the user for the community report.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the related route for the community report.
     */
    public function relatedRoute()
    {
        return $this->belongsTo(RouteVariant::class, 'related_route_id');
    }

    /**
     * Get the related stop for the community report.
     */
    public function relatedStop()
    {
        return $this->belongsTo(TransitStop::class, 'related_stop_id');
    }

    /**
     * Get the report moderations for the community report.
     */
    public function reportModerations()
    {
        return $this->hasMany(ReportModeration::class);
    }
}
