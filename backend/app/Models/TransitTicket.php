<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransitTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ticket_code',
        'qr_payload',
        'transit_mode',
        'origin_station',
        'destination_station',
        'fare_amount',
        'zones_count',
        'status',
        'valid_until',
        'used_at',
    ];

    protected $casts = [
        'fare_amount' => 'decimal:2',
        'zones_count' => 'integer',
        'valid_until' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
