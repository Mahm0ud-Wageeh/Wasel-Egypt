<?php

namespace Database\Factories;

use App\Models\Schedule;
use App\Models\RouteVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

class ScheduleFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Schedule::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'route_variant_id' => function () {
                $routeVariant = RouteVariant::inRandomOrder()->first();
                return $routeVariant ? $routeVariant->id : RouteVariant::factory()->create()->id;
            },
            'gtfs_trip_id' => $this->faker->optional()->bothify('TRIP######'),
            'service_id' => $this->faker->bothify('SERVICE??'),
            'direction_id' => $this->faker->randomElement([0, 1]),
            'headsign' => $this->faker->optional()->sentence(),
            'wheelchair_accessible' => $this->faker->boolean(),
            'notes' => $this->faker->optional()->paragraph(),
            'start_date' => $this->faker->date(),
            'end_date' => $this->faker->optional()->date(),
        ];
    }
}