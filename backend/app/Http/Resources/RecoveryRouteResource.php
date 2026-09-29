<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RecoveryRouteResource extends JsonResource
{
    /**
     * Transform the recovery route into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'deviation_event_id' => $this->deviation_event_id,
            'alternative_journey_id' => $this->alternative_journey_id,
            'alternative_journey' => $this->whenLoaded('alternativeJourney', fn () => new JourneyResource(
                $this->alternativeJourney->loadMissing('journeyLegs')
            )),
            'estimated_delay_sec' => $this->estimated_delay_sec,
            'generated_at' => $this->generated_at,
            'accepted_at' => $this->accepted_at,
        ];
    }
}
