<?php

namespace Database\Factories;

use App\Models\Route;
use App\Models\TransitOperator;
use Illuminate\Database\Eloquent\Factories\Factory;

class RouteFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Route::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'gtfs_route_id' => $this->faker->optional()->bothify('??######'),
            'long_name' => $this->faker->streetName . ' Line',
            'short_name' => $this->faker->optional()->bothify('??#'),
            'description' => $this->faker->optional()->sentence(),
            'transit_operator_id' => function () {
                $operator = TransitOperator::inRandomOrder()->first();
                return $operator ? $operator->id : TransitOperator::factory()->create()->id;
            },
            'transit_mode_id' => function () {
                // Assuming transit modes are seeded, get a random one or create if none exist
                $transitMode = \App\Models\TransitMode::inRandomOrder()->first();
                return $transitMode ? $transitMode->id : \App\Models\TransitMode::factory()->create()->id;
            },
            'type' => $this->faker->numberBetween(0, 7), // GTFS route types 0-7
            'url' => $this->faker->optional()->url(),
            'color' => $this->faker->optional()->hexColor(),
            'text_color' => $this->faker->optional()->hexColor(),
            'sort_order' => $this->faker->numberBetween(0, 100),
            'active' => $this->faker->boolean(80), // 80% chance of active
            'continuous_pickup' => $this->faker->optional()->randomElement([0, 1, 2, 3]),
            'continuous_drop_off' => $this->faker->optional()->randomElement([0, 1, 2, 3]),
        ];
    }
}