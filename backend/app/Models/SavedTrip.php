<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SavedTrip extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'saved_trips';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'journey_id',
        'nickname',
        'last_used_at',
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
            'journey_id' => 'integer',
            'nickname' => 'string',
            'last_used_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the user for the saved trip.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the journey for the saved trip.
     */
    public function journey()
    {
        return $this->belongsTo(Journey::class);
    }
}
