<?php

namespace Database\Factories;

use App\Models\StopTime;
use App\Models\Schedule;
use App\Models\TransitStop;
use Illuminate\Database\Eloquent\Factories\Factory;

class StopTimeFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = StopTime::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'schedule_id' => function () {
                // Only set a random schedule_id if one hasn't been explicitly defined
                if (!isset($this->state['schedule_id'])) {
                    $schedule = Schedule::inRandomOrder()->first();
                    return $schedule ? $schedule->id : Schedule::factory()->create()->id;
                }

                return $this->state['schedule_id'];
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
            'arrival_time' => $this->faker->optional()->time(),
            'departure_time' => $this->faker->optional()->time(),
            'pickup_type' => $this->faker->randomElement([0, 1]), // 0: regular pickup, 1: no pickup
            'drop_off_type' => $this->faker->randomElement([0, 1]), // 0: regular drop off, 1: no drop off
            'timepoint' => $this->faker->boolean(),
        ];
    }
}