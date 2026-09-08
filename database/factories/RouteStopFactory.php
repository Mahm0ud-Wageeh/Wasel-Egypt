<?php

namespace Database\Factories;

use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\TransitStop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RouteStop>
 */
class RouteStopFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = RouteStop::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'route_variant_id' => function () {
                // Only set a random route_variant_id if one hasn't been explicitly defined
                if (!isset($this->state['route_variant_id'])) {
                    $routeVariant = RouteVariant::inRandomOrder()->first();
                    return $routeVariant ? $routeVariant->id : RouteVariant::factory()->create()->id;
                }

                return $this->state['route_variant_id'];
            },
            'transit_stop_id' => function () {
                // Only set a random transit_stop_id if one hasn't been explicitly defined
                if (!isset($this->state['transit_stop_id'])) {
                    $transitStop = TransitStop::inRandomOrder()->first();
                    return $transitStop ? $transitStop->id : TransitStop::factory()->create()->id;
                }

                return $this->state['transit_stop_id'];
            },
            'sequence' => $this->faker->unique()->numberBetween(0, 50),
            'pickup_type' => $this->faker->randomElement([0, 1]), // 0: regular pickup, 1: no pickup
            'drop_off_type' => $this->faker->randomElement([0, 1]), // 0: regular drop off, 1: no drop off
            'distance_from_prev' => $this->faker->randomFloat(3, 0, 5), // 0-5 km with 3 decimal places
        ];
    }
}