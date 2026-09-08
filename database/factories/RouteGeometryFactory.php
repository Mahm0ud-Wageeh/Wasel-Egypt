<?php

namespace Database\Factories;

use App\Models\RouteGeometry;
use App\Models\RouteVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

class RouteGeometryFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = RouteGeometry::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        // Generate a simple GeoJSON LineString for testing
        $coordinates = [
            [$this->faker->longitude(31.0, 32.5), $this->faker->latitude(30.0, 31.5)],
            [$this->faker->longitude(31.0, 32.5), $this->faker->latitude(30.0, 31.5)],
            [$this->faker->longitude(31.0, 32.5), $this->faker->latitude(30.0, 31.5)],
        ];

        return [
            'route_variant_id' => RouteVariant::inRandomOrder()->first()->id,
            'geometry' => json_encode([
                'type' => 'LineString',
                'coordinates' => $coordinates,
            ]),
            'length_meters' => $this->faker->numberBetween(500, 50000), // 0.5km to 50km
        ];
    }
}