<?php

namespace Database\Factories;

use App\Models\ServiceAlertRoute;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceAlertRouteFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = ServiceAlertRoute::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'service_alert_id' => function () {
                return \App\Models\ServiceAlert::factory()->create()->id;
            },
            'route_variant_id' => function () {
                return \App\Models\RouteVariant::factory()->create()->id;
            },
        ];
    }
}