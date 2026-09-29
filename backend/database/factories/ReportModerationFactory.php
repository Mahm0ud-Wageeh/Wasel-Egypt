<?php

namespace Database\Factories;

use App\Models\ReportModeration;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReportModeration>
 */
class ReportModerationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'community_report_id' => function () {
                $communityReport = \App\Models\CommunityReport::inRandomOrder()->first();
                return $communityReport ? $communityReport->id : \App\Models\CommunityReport::factory()->create()->id;
            },
            'moderator_id' => function () {
                $user = \App\Models\User::inRandomOrder()->first();
                return $user ? $user->id : \App\Models\User::factory()->create()->id;
            },
            'action_taken' => $this->faker->randomElement(['verify', 'reject', 'resolve']),
            'notes' => $this->faker->optional()->paragraph,
        ];
    }
}
