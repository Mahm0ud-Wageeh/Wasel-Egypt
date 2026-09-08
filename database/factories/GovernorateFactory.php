<?php

namespace Database\Factories;

use App\Models\Governorate;
use Illuminate\Database\Eloquent\Factories\Factory;

class GovernorateFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Governorate::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'name' => $this->faker->unique()->randomElement([
                'Cairo', 'Giza', 'Alexandria', 'Aswan', 'Luxor',
                'Suez', 'Port Said', 'Ismailia', 'Faiyum', 'Beni Suef',
                'Minya', 'Asyut', 'Sohag', 'Qena', 'Hurghada',
                'Dakahlia', 'Sharqia', 'Kafr El Sheikh', 'Gharbia', 'Menoufia',
                'Qalyubia', 'Damietta', 'Matruh', 'New Valley', 'Red Sea'
            ]),
            'code' => $this->faker->unique()->lexify('???'),
        ];
    }
}