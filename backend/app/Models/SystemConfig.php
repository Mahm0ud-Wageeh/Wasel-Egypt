<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SystemConfig extends Model
{
    use HasFactory;

    protected $table = 'system_configs';

    protected $fillable = [
        'key',
        'value',
        'category',
        'is_public',
        'config_key',
        'config_value',
    ];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function setKeyAttribute($value): void
    {
        $this->attributes['key'] = $value;
        $this->attributes['config_key'] = $value;
    }

    public function setConfigKeyAttribute($value): void
    {
        $this->attributes['key'] = $value;
        $this->attributes['config_key'] = $value;
    }

    public function getKeyAttribute(): ?string
    {
        return $this->attributes['key'] ?? $this->attributes['config_key'] ?? null;
    }

    public function getConfigKeyAttribute(): ?string
    {
        return $this->attributes['config_key'] ?? $this->attributes['key'] ?? null;
    }

    public function setValueAttribute($value): void
    {
        $this->attributes['value'] = $value;
        $this->attributes['config_value'] = $value;
    }

    public function setConfigValueAttribute($value): void
    {
        $this->attributes['value'] = $value;
        $this->attributes['config_value'] = $value;
    }

    public function getValueAttribute(): ?string
    {
        return $this->attributes['value'] ?? $this->attributes['config_value'] ?? null;
    }

    public function getConfigValueAttribute(): ?string
    {
        return $this->attributes['config_value'] ?? $this->attributes['value'] ?? null;
    }
}
