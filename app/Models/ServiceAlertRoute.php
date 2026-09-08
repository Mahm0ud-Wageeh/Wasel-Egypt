<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceAlertRoute extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'service_alert_routes';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'service_alert_id',
        'route_variant_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'service_alert_id' => 'integer',
            'route_variant_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the service alert for the service alert route.
     */
    public function serviceAlert()
    {
        return $this->belongsTo(ServiceAlert::class);
    }

    /**
     * Get the route variant for the service alert route.
     */
    public function routeVariant()
    {
        return $this->belongsTo(RouteVariant::class);
    }
}
