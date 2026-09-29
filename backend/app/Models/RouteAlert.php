<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RouteAlert extends Model
{
    protected $table = 'route_alerts';

    protected $fillable = [
        'route_id',
        'transit_stop_id',
        'severity',
        'title',
        'title_ar',
        'body',
        'body_ar',
        'starts_at',
        'ends_at',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'route_id' => 'integer',
            'transit_stop_id' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    public function transitStop()
    {
        return $this->belongsTo(TransitStop::class);
    }

    public function getLocalizedTitleAttribute(): string
    {
        if (app()->getLocale() === 'ar') {
            return $this->title_ar ?: $this->title;
        }
        return $this->title ?: ($this->title_ar ?? '');
    }

    public function getLocalizedBodyAttribute(): string
    {
        if (app()->getLocale() === 'ar') {
            return $this->body_ar ?: ($this->body ?? '');
        }
        return $this->body ?: ($this->body_ar ?? '');
    }
}
