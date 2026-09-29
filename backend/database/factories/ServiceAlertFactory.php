<?php

namespace Database\Factories;

use App\Models\ServiceAlert;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceAlert>
 */
class ServiceAlertFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ServiceAlert::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'gtfs_alert_id' => $this->faker->optional()->bothify('??######'),
            'header_text' => $this->faker->sentence(),
            'description_text' => $this->faker->optional()->paragraph(),
            'url' => $this->faker->optional()->url(),
            'severity' => $this->faker->randomElement(['unknown', 'minor', 'moderate', 'severe']),
            'consequence' => $this->faker->randomElement(['unknown', 'stop_moved', 'no_service', 'reduced_service', 'significant_delay', 'detour', 'additional_service', 'unknown_effect', 'stop_moved_back']),
            'active_period_start' => $this->faker->dateTimeBetween('-1 week', '+1 week'),
            'active_period_end' => $this->faker->dateTimeBetween('+1 week', '+2 weeks'),
        ];
    }
}
