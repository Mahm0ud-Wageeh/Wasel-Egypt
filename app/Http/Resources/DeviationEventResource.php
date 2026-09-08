<?php

namespace App\Http\Resources;

use App\Services\Journey\DeviationDetectionService;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviationEventResource extends JsonResource
{
    /**
     * Transform the deviation event into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'active_journey_id' => $this->active_journey_id,
            'occurred_at' => $this->occurred_at,
            'deviation_type' => $this->deviation_type,
            'severity' => $this->severity,
            'description' => $this->description,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'expected_stop_id' => $this->expected_stop_id,
            'expected_stop' => $this->whenLoaded('expectedStop', fn () => $this->expectedStop ? [
                'id' => $this->expectedStop->id,
                'name' => $this->expectedStop->name,
            ] : null),
            'can_continue' => app(DeviationDetectionService::class)->canContinue($this->resource),
            'recovery_routes' => RecoveryRouteResource::collection($this->whenLoaded('recoveryRoutes')),
        ];
    }
}
