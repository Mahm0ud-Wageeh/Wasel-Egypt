<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notification extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'notifications';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'user_id',
        'template_id',
        'title',
        'body',
        'data_payload',
        'sent_via',
        'sent_at',
        'read_at',
        'priority',
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
            'template_id' => 'integer',
            'sent_at' => 'datetime',
            'read_at' => 'datetime',
            'data_payload' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the user for the notification.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the template for the notification.
     */
    public function template()
    {
        return $this->belongsTo(NotificationTemplate::class);
    }
}
