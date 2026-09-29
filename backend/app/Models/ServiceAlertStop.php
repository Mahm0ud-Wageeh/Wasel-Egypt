<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ServiceAlertStop extends Model
{
    use SoftDeletes;
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'service_alert_stops';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'service_alert_id',
        'transit_stop_id',
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
            'transit_stop_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the service alert for the service alert stop.
     */
    public function serviceAlert()
    {
        return $this->belongsTo(ServiceAlert::class);
    }

    /**
     * Get the transit stop for the service alert stop.
     */
    public function transitStop()
    {
        return $this->belongsTo(TransitStop::class);
    }
}
