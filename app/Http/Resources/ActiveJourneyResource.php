<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ActiveJourneyResource extends JsonResource
{
    /**
     * Optional computed tracking state attached by the controller.
     */
    private ?array $trackingPayload = null;
    /**
     * Transform the active journey into an array.
     *
     * When a 'tracking' array is attached (by the controller) the current
     * tracking state is included; otherwise only the persisted fields.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'journey_id' => $this->journey_id,
            'user_id' => $this->user_id,
            // loadMissing fills any gap without discarding nested eager
            // loads already present on the legs (stop/route relations).
            'journey' => $this->whenLoaded('journey', function () {
                $this->journey->loadMissing('journeyLegs');
                $this->journey->journeyLegs->loadMissing(['transitStopFrom', 'transitStopTo', 'routeVariant.route']);

                return new JourneyResource($this->journey);
            }),
            'started_at' => $this->started_at,
            'ended_at' => $this->ended_at,
            'current_leg_index' => $this->current_leg_index,
            'current_progress_percent' => $this->current_progress_percent,
            'status' => $this->status,
            'tracking' => $this->trackingPayload,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Attach computed tracking state to this resource instance.
     */
    public function withTracking(array $tracking): self
    {
        $this->trackingPayload = $tracking;

        return $this;
    }
}
