<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AuditLog extends Model
{
    use SoftDeletes, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'audit_logs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'resource_type',
        'resource_id',
        'changes',
        'ip_address',
        'user_agent',
        'occurred_at',
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
            'resource_id' => 'integer',
            'occurred_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
            'changes' => 'array',
        ];
    }

    /**
     * Get the user that owns the audit log.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}