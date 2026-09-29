<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedPlace extends Model
{
    use HasFactory;

    protected $table = 'saved_places';

    protected $fillable = [
        'user_id',
        'name',
        'latitude',
        'longitude',
        'type',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'name' => 'string',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'type' => 'string',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
