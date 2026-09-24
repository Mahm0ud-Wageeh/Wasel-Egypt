<?php

namespace Tests\Feature\Transit;

use Tests\TestCase;

class TelemetryTest extends TestCase
{
    public function test_telemetry_live_endpoint_returns_valid_fleet_snapshot(): void
    {
        $response = $this->getJson('/api/v1/telemetry/live');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'timestamp',
            'active_vehicles_count',
            'data' => [
                '*' => [
                    'id',
                    'line',
                    'mode',
                    'headsign',
                    'lat',
                    'lng',
                    'speed_kmh',
                    'occupancy',
                    'status',
                ],
            ],
        ]);

        $this->assertGreaterThanOrEqual(4, $response->json('active_vehicles_count'));
    }
}
