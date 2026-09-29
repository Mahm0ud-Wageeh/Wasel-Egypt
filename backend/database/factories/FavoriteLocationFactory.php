<?php

namespace Database\Factories;

use App\Models\FavoriteLocation;
use Illuminate\Database\Eloquent\Factories\Factory;

class FavoriteLocationFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = FavoriteLocation::class;

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
            'name' => $this->faker->company,
            'address' => $this->faker->address,
            'latitude' => $this->faker->latitude(30.0, 31.5),
            'longitude' => $this->faker->longitude(31.0, 32.5),
            'place_type' => $this->faker->randomElement(['home', 'work', 'school', 'shopping', 'other']),
        ];
    }
}