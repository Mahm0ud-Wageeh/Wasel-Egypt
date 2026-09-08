<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    /**
     * Transform the notification into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'type' => $this->data_payload['type'] ?? null,
            'title' => $this->title,
            'body' => $this->body,
            'data_payload' => $this->data_payload,
            'priority' => $this->priority,
            'sent_via' => $this->sent_via,
            'sent_at' => $this->sent_at,
            'read_at' => $this->read_at,
            'is_read' => $this->read_at !== null,
        ];
    }
}
