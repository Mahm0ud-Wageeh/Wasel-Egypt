<?php

namespace Database\Factories;

use App\Models\JourneyLeg;
use App\Models\Journey;
use App\Models;
use App\Models\RouteVariant;
use App\Models\TransitStop;
use App\Models\TransitOperator;
use Illuminate\Database\Eloquent\Factories\Factory;

class JourneyLegFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = JourneyLeg::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        $fromLat = $this->faker->latitude(30.0, 31.5);
        $fromLng = $this->faker->longitude(31.0, 32.5);
        $toLat = $this->faker->latitude(30.0, 31.5);
        $toLng = $this->faker->longitude(31.0, 32.5);
        $departureTime = $this->faker->dateTimeBetween('-1 week', 'now');
        $arrivalTime = $this->faker->dateTimeBetween($departureTime, '+2 hours');

        return [
            'journey_id' => function () {
                $journey = Journey::inRandomOrder()->first();
                return $journey ? $journey->id : Journey::factory()->create()->id;
            },
            'route_variant_id' => function () {
                $routeVariant = RouteVariant::inRandomOrder()->first();
                return $routeVariant ? $routeVariant->id : null;
            },
            'transit_stop_from_id' => function () {
                $transitStop = TransitStop::inRandomOrder()->first();
                return $transitStop ? $transitStop->id : null;
            },
            'transit_stop_to_id' => function () {
                $transitStop = TransitStop::inRandomOrder()->first();
                return $transitStop ? $transitStop->id : null;
            },
            'from_lat' => $fromLat,
            'from_lng' => $fromLng,
            'to_lat' => $toLat,
            'to_lng' => $toLng,
            'sequence' => $this->faker->numberBetween(1, 10),
            'departure_time' => $departureTime,
            'arrival_time' => $arrivalTime,
            'duration_sec' => $this->faker->numberBetween(300, 3600), // 5 min to 1 hour
            'distance_meters' => $this->faker->numberBetween(500, 20000), // 0.5km to 20km
            'mode' => $this->faker->randomElement(['walking', 'metro', 'bus', 'minibus', 'microbus', 'rail']),
            'agency_id' => function () {
                $operator = TransitOperator::inRandomOrder()->first();
                return $operator ? $operator->id : null;
            },
            'leg_score' => $this->faker->randomFloat(2, 0, 10),
        ];
    }
}