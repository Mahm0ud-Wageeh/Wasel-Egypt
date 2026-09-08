<?php

namespace Database\Factories;

use App\Models\ServiceAlertStop;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceAlertStopFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ServiceAlertStop::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'service_alert_id' => function () {
                // Only set a random service_alert_id if one hasn't been explicitly defined
                if (!isset($this->state['service_alert_id'])) {
                    $serviceAlert = \App\Models\ServiceAlert::inRandomOrder()->first();
                    return $serviceAlert ? $serviceAlert->id : \App\Models\ServiceAlert::factory()->create()->id;
                }

                return $this->state['service_alert_id'];
            },
            'transit_stop_id' => function () {
                // Only set a random transit_stop_id if one hasn't been explicitly defined
                if (!isset($this->state['transit_stop_id'])) {
                    $transitStop = \App\Models\TransitStop::inRandomOrder()->first();
                    return $transitStop ? $transitStop->id : \App\Models\TransitStop::factory()->create()->id;
                }

                return $this->state['transit_stop_id'];
            },
        ];
    }
}