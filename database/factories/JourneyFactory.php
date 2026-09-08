<?php

namespace Database\Factories;

use App\Models\Journey;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JourneyFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Journey::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        $originLat = $this->faker->latitude(30.0, 31.5);
        $originLng = $this->faker->longitude(31.0, 32.5);
        $destLat = $this->faker->latitude(30.0, 31.5);
        $destLng = $this->faker->longitude(31.0, 32.5);

        return [
            'user_id' => function () {
                $user = User::inRandomOrder()->first();
                return $user ? $user->id : User::factory()->create()->id;
            },
            'origin_lat' => $originLat,
            'origin_lng' => $originLng,
            'destination_lat' => $destLat,
            'destination_lng' => $destLng,
            'requested_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
            'total_duration_sec' => $this->faker->numberBetween(1800, 7200), // 30 min to 2 hours
            'total_transfers' => $this->faker->numberBetween(0, 3),
            'walk_distance_meters' => $this->faker->numberBetween(0, 2000),
            'score' => $this->faker->randomFloat(4, 0, 9.9999), // decimal(5,4) max 9.9999
            'status' => $this->faker->randomElement(['planned', 'saved', 'archived']),
        ];
    }
}