<?php

namespace Database\Factories;

use App\Models\TransitOperator;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransitOperatorFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = TransitOperator::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'name' => $this->faker->unique()->company,
            'short_code' => strtoupper($this->faker->unique()->lexify('???')),
            'website' => $this->faker->optional()->url,
            'phone' => $this->faker->optional()->phoneNumber,
        ];
    }
}