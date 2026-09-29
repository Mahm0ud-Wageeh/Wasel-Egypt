<?php

namespace Database\Factories;

use App\Models\NotificationPreference;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationPreferenceFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = NotificationPreference::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'user_id' => function () {
                // Assuming users are seeded, get a random one or create if none exist
                $user = \App\Models\User::inRandomOrder()->first();
                return $user ? $user->id : \App\Models\User::factory()->create()->id;
            },
            'notify_journey_planned' => $this->faker->boolean,
            'notify_journey_started' => $this->faker->boolean,
            'notify_deviation_detected' => $this->faker->boolean,
            'notify_recovery_available' => $this->faker->boolean,
            'notify_journey_completed' => $this->faker->boolean,
            'notify_report_status_change' => $this->faker->boolean,
            'notify_service_alert_affected' => $this->faker->boolean,
            'notify_weekly_summary' => $this->faker->boolean,
            'quiet_hours_enabled' => $this->faker->boolean,
            'quiet_hours_start' => $this->faker->optional()->time('H:i:s'),
            'quiet_hours_end' => $this->faker->optional()->time('H:i:s'),
        ];
    }
}