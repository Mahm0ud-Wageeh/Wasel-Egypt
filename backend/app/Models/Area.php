<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Area extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'areas';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'governorate_id',
        'name',
        'name_ar',
        'latitude',
        'longitude',
        'location_accuracy',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'governorate_id' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'location_accuracy' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the governorate for the area.
     */
    public function governorate()
    {
        return $this->belongsTo(Governorate::class);
    }

    /**
     * Get the transit stops for the area.
     */
    public function transitStops()
    {
        return $this->hasMany(TransitStop::class);
    }
}
