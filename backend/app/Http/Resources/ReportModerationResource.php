<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ReportModerationResource extends JsonResource
{
    /**
     * Transform the moderation record into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'community_report_id' => $this->community_report_id,
            'moderator_id' => $this->moderator_id,
            'moderator' => $this->whenLoaded('moderator', fn () => $this->moderator ? [
                'id' => $this->moderator->id,
                'name' => $this->moderator->name,
            ] : null),
            'action_taken' => $this->action_taken,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
