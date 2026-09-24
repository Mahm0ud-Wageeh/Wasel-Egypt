<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class IncidentReportResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request)
    {
        $userVote = null;
        $user = $request->user('sanctum') ?? $request->user();
        if ($user && $this->relationLoaded('votes')) {
            $vote = $this->votes->firstWhere('user_id', $user->id);
            $userVote = $vote?->vote;
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'route_id' => $this->route_id,
            'transit_stop_id' => $this->transit_stop_id,
            'kind' => $this->kind,
            'severity' => $this->severity,
            'status' => $this->status,
            'description' => $this->description,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'confirms' => (int) ($this->confirms ?? 0),
            'denies' => (int) ($this->denies ?? 0),
            'trust_score' => (float) ($this->trust_score ?? 1.0),
            'user_vote' => $userVote,
            'resolved_at' => $this->resolved_at,
            'route' => $this->whenLoaded('route', fn () => $this->route ? [
                'id' => $this->route->id,
                'short_name' => $this->route->short_name,
                'long_name' => $this->route->long_name,
                'long_name_ar' => $this->route->long_name_ar ?? $this->route->long_name,
            ] : null),
            'transit_stop' => $this->whenLoaded('transitStop', fn () => $this->transitStop ? [
                'id' => $this->transitStop->id,
                'name' => $this->transitStop->name,
                'name_ar' => $this->transitStop->name_ar ?? $this->transitStop->name,
                'latitude' => (float) $this->transitStop->latitude,
                'longitude' => (float) $this->transitStop->longitude,
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
