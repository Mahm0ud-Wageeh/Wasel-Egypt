<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RouteStop extends Model
{
    use SoftDeletes;
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'route_stops';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'route_variant_id',
        'transit_stop_id',
        'sequence',
        'pickup_type',
        'drop_off_type',
        'distance_from_prev',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'route_variant_id' => 'integer',
            'transit_stop_id' => 'integer',
            'sequence' => 'integer',
            'pickup_type' => 'integer',
            'drop_off_type' => 'integer',
            'distance_from_prev' => 'decimal:3',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the route variant for the route stop.
     */
    public function routeVariant()
    {
        return $this->belongsTo(RouteVariant::class);
    }

    /**
     * Get the transit stop for the route stop.
     */
    public function transitStop()
    {
        return $this->belongsTo(TransitStop::class);
    }
}
