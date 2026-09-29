<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RouteGeometry extends Model
{
    protected $table = 'route_geometries';

    protected $fillable = [
        'route_variant_id',
        'shape',
        'point_count',
        'geometry',
        'length_meters',
    ];

    protected function casts(): array
    {
        return [
            'route_variant_id' => 'integer',
            'point_count' => 'integer',
            'length_meters' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function routeVariant()
    {
        return $this->belongsTo(RouteVariant::class);
    }

    /**
     * Accessor for shape coordinates array [[lat, lng], ...].
     */
    public function getCoordinatesAttribute(): array
    {
        $raw = $this->attributes['shape'] ?? $this->attributes['geometry'] ?? null;
        if (!$raw) return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Backward compatibility accessor for 'geometry'.
     */
    public function getGeometryAttribute()
    {
        return $this->coordinates;
    }

    /**
     * Mutator for 'shape'.
     */
    public function setShapeAttribute($val): void
    {
        $json = is_array($val) ? json_encode($val) : $val;
        $this->attributes['shape'] = $json;
        if (is_array($val)) {
            $this->attributes['point_count'] = count($val);
        }
    }

    /**
     * Backward compatibility mutator for 'geometry' writing to 'shape'.
     */
    public function setGeometryAttribute($val): void
    {
        $this->setShapeAttribute($val);
    }

    /**
     * Get GeoJSON LineString representation for MapLibre.
     */
    public function toGeoJson(): array
    {
        $coords = [];
        foreach ($this->coordinates as $pt) {
            if (is_array($pt) && count($pt) >= 2) {
                // GeoJSON format is [lng, lat]
                $coords[] = [(float)$pt[1], (float)$pt[0]];
            }
        }

        return [
            'type' => 'Feature',
            'geometry' => [
                'type' => 'LineString',
                'coordinates' => $coords,
            ],
            'properties' => [
                'route_variant_id' => $this->route_variant_id,
                'point_count' => $this->point_count ?: count($coords),
            ],
        ];
    }
}
