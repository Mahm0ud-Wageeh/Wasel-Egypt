<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ServiceAlert extends Model
{
    use SoftDeletes;
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'service_alerts';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'gtfs_alert_id',
        'header_text',
        'description_text',
        'url',
        'severity',
        'consequence',
        'active_period_start',
        'active_period_end',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active_period_start' => 'datetime',
            'active_period_end' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the service alert stops for the service alert.
     */
    public function serviceAlertStops()
    {
        return $this->hasMany(ServiceAlertStop::class);
    }

    /**
     * Get the service alert routes for the service alert.
     */
    public function serviceAlertRoutes()
    {
        return $this->hasMany(ServiceAlertRoute::class);
    }
}
