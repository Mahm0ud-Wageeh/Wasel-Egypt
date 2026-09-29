<?php

namespace Tests\Feature\Security;

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PlaceController;
use App\Http\Controllers\Api\V1\Transit\AreaController;
use App\Http\Controllers\Api\V1\Transit\GovernorateController;
use App\Http\Controllers\Api\V1\Transit\GtfsImportController;
use App\Http\Controllers\Api\V1\Transit\RouteController;
use App\Http\Controllers\Api\V1\Transit\RouteGeometryController;
use App\Http\Controllers\Api\V1\Transit\RouteStopController;
use App\Http\Controllers\Api\V1\Transit\RouteVariantController;
use App\Http\Controllers\Api\V1\Transit\ScheduleController;
use App\Http\Controllers\Api\V1\Transit\ServiceAlertController;
use App\Http\Controllers\Api\V1\Transit\ServiceAlertRouteController;
use App\Http\Controllers\Api\V1\Transit\ServiceAlertStopController;
use App\Http\Controllers\Api\V1\Transit\StopTimeController;
use App\Http\Controllers\Api\V1\Transit\TransitModeController;
use App\Http\Controllers\Api\V1\Transit\TransitOperatorController;
use App\Http\Controllers\Api\V1\Transit\TransitStopController;
use App\Http\Controllers\Controller;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Group3CleanupsTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function d1_transit_quality_report_command_delegates_to_service_and_outputs_valid_json()
    {
        $exitCode = \Illuminate\Support\Facades\Artisan::call('transit:quality-report', ['--json' => true]);
        $this->assertEquals(0, $exitCode);

        $output = \Illuminate\Support\Facades\Artisan::output();
        $decoded = json_decode($output, true);

        $this->assertIsArray($decoded);
        $this->assertArrayHasKey('generated_at', $decoded);
        $this->assertArrayHasKey('stops', $decoded);
        $this->assertArrayHasKey('routes', $decoded);
        $this->assertArrayHasKey('schedules', $decoded);
        $this->assertArrayHasKey('summary', $decoded);
    }

    /** @test */
    public function d1_transit_quality_report_renders_console_summary()
    {
        $this->artisan('transit:quality-report')
            ->assertSuccessful()
            ->expectsOutputToContain('Wasel Egypt — Transit Data Quality Report')
            ->expectsOutputToContain('Summary — CRITICAL:');
    }

    /** @test */
    public function r1_transit_and_utility_controllers_extend_base_controller_not_auth_controller()
    {
        $controllers = [
            AreaController::class,
            GovernorateController::class,
            GtfsImportController::class,
            RouteController::class,
            RouteGeometryController::class,
            RouteStopController::class,
            RouteVariantController::class,
            ScheduleController::class,
            ServiceAlertController::class,
            ServiceAlertRouteController::class,
            ServiceAlertStopController::class,
            StopTimeController::class,
            TransitModeController::class,
            TransitOperatorController::class,
            TransitStopController::class,
            PlaceController::class,
        ];

        foreach ($controllers as $controllerClass) {
            $this->assertTrue(
                is_subclass_of($controllerClass, Controller::class),
                "{$controllerClass} should be a subclass of " . Controller::class
            );

            $this->assertFalse(
                is_subclass_of($controllerClass, AuthController::class),
                "{$controllerClass} should NOT be a subclass of " . AuthController::class
            );
        }
    }
}
