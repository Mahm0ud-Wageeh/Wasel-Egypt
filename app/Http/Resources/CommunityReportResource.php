<?php

namespace App\Http\Resources;

use App\Services\Reports\TrustScoreService;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunityReportResource extends JsonResource
{
    /**
     * Transform the community report into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'author' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'trust' => app(TrustScoreService::class)->score($this->user),
            ] : null),
            'report_type' => $this->report_type,
            'description' => $this->description,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'occurred_at' => $this->occurred_at,
            'status' => $this->status,
            'media_urls' => $this->media_urls,
            'related_route_id' => $this->related_route_id,
            'related_route_variant' => $this->whenLoaded('relatedRoute', fn () => $this->relatedRoute ? [
                'id' => $this->relatedRoute->id,
                'name' => $this->relatedRoute->name,
                'headsign' => $this->relatedRoute->headsign,
            ] : null),
            'related_stop_id' => $this->related_stop_id,
            'related_stop' => $this->whenLoaded('relatedStop', fn () => $this->relatedStop ? [
                'id' => $this->relatedStop->id,
                'name' => $this->relatedStop->name,
                'latitude' => $this->relatedStop->latitude,
                'longitude' => $this->relatedStop->longitude,
            ] : null),
            // Verification metadata (derived from the moderation history).
            'is_public' => in_array($this->status, ['verified', 'resolved'], true),
            'moderation_count' => $this->whenLoaded('reportModerations', fn () => $this->reportModerations->count()),
            'last_moderation' => $this->whenLoaded('reportModerations', function () {
                $last = $this->reportModerations->sortByDesc('id')->first();

                return $last ? [
                    'action_taken' => $last->action_taken,
                    'moderator_id' => $last->moderator_id,
                    'notes' => $last->notes,
                    'created_at' => $last->created_at,
                ] : null;
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
