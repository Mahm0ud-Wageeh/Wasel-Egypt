<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserCarbonReward extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'total_distance_km',
        'co2_saved_kg',
        'points_balance',
        'total_points_earned',
    ];

    protected $casts = [
        'total_distance_km' => 'decimal:2',
        'co2_saved_kg' => 'decimal:2',
        'points_balance' => 'integer',
        'total_points_earned' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
