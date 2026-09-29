<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TransitOperator extends Model
{
    use SoftDeletes, HasFactory;

    protected $table = 'transit_operators';

    protected $fillable = [
        'code',
        'short_code',
        'name',
        'name_ar',
        'website',
        'phone',
        'active',
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
        return $this->hasMany(Route::class, 'operator_id');
    }
}
