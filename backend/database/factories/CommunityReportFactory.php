<?php

namespace Database\Factories;

use App\Models\CommunityReport;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommunityReportFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = CommunityReport::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'user_id' => function () {
                // Assuming users are seeded, get a random one or create if none exist
                $user = \App\Models\User::inRandomOrder()->first();
                return $user ? $user->id : \App\Models\User::factory()->create()->id;
            },
            'report_type' => $this->faker->randomElement(['delay', 'early_arrival', 'overcrowding', 'cleanliness', 'safety', 'stop_damage', 'signage_issue', 'accessibility', 'suggestion', 'complaint', 'other']),
            'description' => $this->faker->sentence,
            'latitude' => $this->faker->latitude(30.0, 31.5),
            'longitude' => $this->faker->longitude(31.0, 32.5),
            'occurred_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'status' => $this->faker->randomElement(['pending', 'verified', 'resolved', 'rejected']),
            'media_urls' => $this->faker->optional()->randomElements([
                'https://example.com/image1.jpg',
                'https://example.com/video1.mp4'
            ], rand(0, 2)),
            'related_route_id' => function () {
                $routeVariant = \App\Models\RouteVariant::inRandomOrder()->first();
                return $routeVariant ? $routeVariant->id : null;
            },
            'related_stop_id' => function () {
                $transitStop = \App\Models\TransitStop::inRandomOrder()->first();
                return $transitStop ? $transitStop->id : null;
            },
        ];
    }
}