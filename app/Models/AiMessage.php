<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiMessage extends Model
{
    use HasFactory;

    protected $table = 'ai_messages';

    public $timestamps = false;

    protected $fillable = [
        'ai_conversation_id',
        'role',
        'content',
        'model_used',
        'tokens_in',
        'tokens_out',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'ai_conversation_id' => 'integer',
            'role' => 'string',
            'content' => 'string',
            'model_used' => 'string',
            'tokens_in' => 'integer',
            'tokens_out' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiConversation::class, 'ai_conversation_id');
    }
}
