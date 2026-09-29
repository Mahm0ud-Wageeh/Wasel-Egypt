<?php

namespace Database\Factories;

use App\Models\TransitStop;
use App\Models\Area;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TransitStop>
 */
class TransitStopFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = TransitStop::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'name' => $this->faker->streetName . ' Station',
            'latitude' => $this->faker->latitude(30.0, 31.5), // Cairo area coordinates
            'longitude' => $this->faker->longitude(31.0, 32.5), // Cairo area coordinates
            'location_accuracy' => $this->faker->randomElement(['GPS', 'Network', 'Manual']),
            'wheelchair_accessible' => $this->faker->boolean,
            'platform_code' => $this->faker->optional()->randomElement(['A', 'B', 'C', 'D', null]),
            'area_id' => function () {
                // Only set a random area_id if one hasn't been explicitly defined
                if (!isset($this->state['area_id'])) {
                    $area = Area::inRandomOrder()->first();
                    return $area ? $area->id : Area::factory()->create()->id;
                }

                return $this->state['area_id'];
            },
        ];
    }
}
