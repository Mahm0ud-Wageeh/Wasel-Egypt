<?php

namespace Database\Factories;

use App\Models\RouteVariant;
use App\Models\Route;
use Illuminate\Database\Eloquent\Factories\Factory;

class RouteVariantFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = RouteVariant::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'route_id' => function () {
                $route = Route::inRandomOrder()->first();
                return $route ? $route->id : Route::factory()->create()->id;
            },
            'name' => $this->faker->randomElement(['Main', 'Express', 'Local', 'Weekend', 'Holiday']),
            'direction' => $this->faker->randomElement(['outbound', 'inbound', 'loop']),
            'headsign' => $this->faker->optional()->sentence(),
            'active' => $this->faker->boolean(80), // 80% chance of active
            'reliability_score' => $this->faker->randomFloat(2, 0, 1), // Reliability score between 0.00 and 1.00
        ];
    }
}