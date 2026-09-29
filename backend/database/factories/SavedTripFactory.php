<?php

namespace Database\Factories;

use App\Models\SavedTrip;
use App\Models\User;
use App\Models\Journey;
use Illuminate\Database\Eloquent\Factories\Factory;

class SavedTripFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = SavedTrip::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'user_id' => User::inRandomOrder()->first()->id ?? User::factory(),
            'journey_id' => Journey::inRandomOrder()->first()->id ?? Journey::factory(),
            'nickname' => $this->faker->randomElement(['Home to Work', 'Work to Home', 'Gym Route', 'Weekend Trip', 'Doctor Visit']),
            'last_used_at' => $this->faker->optional()->dateTimeBetween('-1 week', 'now'),
        ];
    }
}