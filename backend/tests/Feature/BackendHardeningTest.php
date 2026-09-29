<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\HealthController;
use App\Models\ActiveJourney;
use App\Models\Journey;
use App\Models\JourneyLeg;
use App\Models\Role;
use App\Models\User;
use App\Services\Journey\RoadAwareWalkingService;
use App\Support\ApiError;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class BackendHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_hot_path_indexes_exist_in_schema(): void
    {
        $jpIndexes = collect(\Illuminate\Support\Facades\Schema::getIndexes('journey_progress'))->pluck('name')->all();
        $this->assertContains('journey_progress_active_recorded_id_index', $jpIndexes);

        $ajIndexes = collect(\Illuminate\Support\Facades\Schema::getIndexes('active_journeys'))->pluck('name')->all();
        $this->assertContains('active_journeys_user_status_started_index', $ajIndexes);

        $deIndexes = collect(\Illuminate\Support\Facades\Schema::getIndexes('deviation_events'))->pluck('name')->all();
        $this->assertContains('deviation_events_active_occurred_id_index', $deIndexes);
    }

    public function test_expensive_write_endpoints_have_throttle_middleware(): void
    {
        $routes = Route::getRoutes();

        $expectedThrottled = [
            'api/v1/journeys' => 'POST',
            'api/v1/journeys/{id}/start' => 'POST',
            'api/v1/active-journeys/{id}/complete' => 'POST',
            'api/v1/active-journeys/{id}/cancel' => 'POST',
            'api/v1/active-journeys/{id}/resume' => 'POST',
            'api/v1/active-journeys/{id}/recovery-options' => 'POST',
            'api/v1/reports' => 'POST',
            'api/v1/admin/data/imports/{id}/rollback' => 'POST',
            'api/v1/gtfs/import' => 'POST',
            'api/v1/gtfs/validate' => 'POST',
        ];

        foreach ($expectedThrottled as $uri => $method) {
            $route = $routes->getByAction($routes->match(Request::create($uri, $method))->getActionName());
            $this->assertNotNull($route, "Route {$method} {$uri} not found");

            $middlewares = $route->gatherMiddleware();
            $hasThrottle = collect($middlewares)->contains(fn ($m) => str_starts_with($m, 'throttle:'));
            $this->assertTrue($hasThrottle, "Route {$method} {$uri} lacks throttle middleware");
        }
    }

    public function test_api_error_envelope_returns_localized_messages(): void
    {
        // English default
        $reqEn = Request::create('/api/v1/test', 'GET', [], [], [], ['HTTP_ACCEPT_LANGUAGE' => 'en-US,en;q=0.9']);
        $respEn = ApiError::response('unauthenticated', 401, null, null, $reqEn);
        $dataEn = $respEn->getData(true);

        $this->assertFalse($dataEn['success']);
        $this->assertEquals('unauthenticated', $dataEn['error_code']);
        $this->assertEquals('Unauthenticated.', $dataEn['message']);

        // Arabic localization
        $reqAr = Request::create('/api/v1/test', 'GET', [], [], [], ['HTTP_ACCEPT_LANGUAGE' => 'ar-EG,ar;q=0.9']);
        $respAr = ApiError::response('unauthenticated', 401, null, null, $reqAr);
        $dataAr = $respAr->getData(true);

        $this->assertFalse($dataAr['success']);
        $this->assertEquals('unauthenticated', $dataAr['error_code']);
        $this->assertEquals('غير مصرح بالدخول. يُرجى تسجيل الدخول أولاً.', $dataAr['message']);

        // Arabic query param
        $reqArParam = Request::create('/api/v1/test?lang=ar', 'GET');
        $respArParam = ApiError::response('too_many_requests', 429, null, null, $reqArParam);
        $dataArParam = $respArParam->getData(true);

        $this->assertEquals('طلبات كثيرة جداً. يُرجى الانتظار قليلاً والمحاولة لاحقاً.', $dataArParam['message']);
    }

    public function test_osrm_fallback_counter_increments_and_health_reports_degraded(): void
    {
        Cache::forget('osrm:fallback_count');

        $initialCount = RoadAwareWalkingService::fallbackCount();
        $this->assertEquals(0, $initialCount);

        RoadAwareWalkingService::recordFallback();
        RoadAwareWalkingService::recordFallback();

        $this->assertEquals(2, RoadAwareWalkingService::fallbackCount());

        // Test health controller with OSRM enabled but unreachable
        Config::set('services.osrm.enabled', true);
        Config::set('services.osrm.url', 'http://127.0.0.1:59999'); // non-existent port

        $controller = app(HealthController::class);
        $response = $controller->check();

        $this->assertEquals(200, $response->getStatusCode());
        $data = $response->getData(true);

        $this->assertEquals('degraded', $data['status']);
        $this->assertTrue($data['database']);
        $this->assertFalse($data['osrm']);
        $this->assertEquals(2, $data['osrm_fallbacks']);
    }
}
