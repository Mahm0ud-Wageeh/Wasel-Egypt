<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FavoriteLocation extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'favorite_locations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'address',
        'latitude',
        'longitude',
        'place_type',
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
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'place_type' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the user for the favorite location.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
