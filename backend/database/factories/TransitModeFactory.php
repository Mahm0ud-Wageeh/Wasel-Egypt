<?php

namespace Database\Factories;

use App\Models\TransitMode;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransitModeFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = TransitMode::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'name' => $this->faker->unique()->randomElement(['Bus', 'Tram', 'Metro', 'Rail', 'Ferry', 'Cable Car']),
            'description' => $this->faker->optional()->sentence,
            'icon' => $this->faker->randomElement(['bus', 'tram', 'subway', 'train', 'ship', 'telephone']),
        ];
    }
}