<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TransitMode extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'transit_modes';

    protected $fillable = [
        'code',
        'name',
        'name_ar',
        'color',
        'icon',
        'active',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function routes()
    {
        return $this->hasMany(Route::class);
    }

    public function fares()
    {
        return $this->hasMany(Fare::class);
    }

    public function journeyLegs()
    {
        return $this->hasMany(JourneyLeg::class);
    }
}
