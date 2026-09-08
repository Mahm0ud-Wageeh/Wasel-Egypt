<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::prefix('v1')->group(function () {
    // Auth routes
    Route::post('auth/register', [App\Http\Controllers\Api\V1\AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('auth/login', [App\Http\Controllers\Api\V1\AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('auth/logout', [App\Http\Controllers\Api\V1\AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('auth/forgot-password', [App\Http\Controllers\Api\V1\AuthController::class, 'forgotPassword']);
    Route::post('auth/reset-password', [App\Http\Controllers\Api\V1\AuthController::class, 'resetPassword']);
    Route::get('auth/user', [App\Http\Controllers\Api\V1\AuthController::class, 'user'])->middleware('auth:sanctum');

    // User routes
    Route::get('users/{id}', [App\Http\Controllers\Api\V1\UserController::class, 'show'])->middleware('auth:sanctum');
    Route::put('users/{id}', [App\Http\Controllers\Api\V1\UserController::class, 'update'])->middleware('auth:sanctum');
    Route::get('users/{id}/preferences', [App\Http\Controllers\Api\V1\UserController::class, 'preferences'])->middleware('auth:sanctum');
    Route::put('users/{id}/preferences', [App\Http\Controllers\Api\V1\UserController::class, 'updatePreferences'])->middleware('auth:sanctum');

    // Journey planning (user-owned resources: self-or-admin authorization in the controller)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('journeys/search', [App\Http\Controllers\Api\V1\JourneyController::class, 'search']);
        Route::get('journeys', [App\Http\Controllers\Api\V1\JourneyController::class, 'index']);
        Route::post('journeys', [App\Http\Controllers\Api\V1\JourneyController::class, 'store']);
        Route::get('journeys/{id}', [App\Http\Controllers\Api\V1\JourneyController::class, 'show']);
        Route::get('journeys/{id}/alternatives', [App\Http\Controllers\Api\V1\JourneyController::class, 'alternatives']);
        Route::delete('journeys/{id}', [App\Http\Controllers\Api\V1\JourneyController::class, 'destroy']);

        // Journey execution (owner-only mutations, owner-or-admin reads)
        Route::post('journeys/{id}/start', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'start']);
        Route::get('active-journeys', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'index']);
        Route::get('active-journeys/{id}', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'show']);
        Route::post('active-journeys/{id}/location', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'updateLocation']);
        Route::get('active-journeys/{id}/progress', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'progress']);
        Route::post('active-journeys/{id}/complete', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'complete']);
        Route::post('active-journeys/{id}/cancel', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'cancel']);

        // Deviation handling and recovery (owner-only mutations, owner-or-admin reads)
        Route::get('active-journeys/{id}/deviations', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'deviations']);
        Route::post('active-journeys/{id}/resume', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'resume']);
        Route::get('active-journeys/{id}/recovery-options', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'listRecoveryOptions']);
        Route::post('active-journeys/{id}/recovery-options', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'generateRecoveryOptions']);
        Route::post('active-journeys/{id}/recovery-options/{recoveryId}/accept', [App\Http\Controllers\Api\V1\ActiveJourneyController::class, 'acceptRecovery']);

        // Community reports (user-owned; moderation restricted by role middleware)
        Route::get('reports', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'index']);
        Route::post('reports', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'store']);
        Route::get('reports/{id}', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'show']);
        Route::delete('reports/{id}', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'destroy']);
        Route::get('reports/{id}/moderations', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'moderations']);
        Route::post('reports/{id}/moderate', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'moderate'])->middleware('role:moderator,admin');
        Route::get('users/{id}/trust', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'trust']);

        // Notifications (strictly personal, in-app)
        Route::get('notifications', [App\Http\Controllers\Api\V1\NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [App\Http\Controllers\Api\V1\NotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [App\Http\Controllers\Api\V1\NotificationController::class, 'markAllRead']);
        Route::post('notifications/{id}/read', [App\Http\Controllers\Api\V1\NotificationController::class, 'markRead']);
        Route::delete('notifications/{id}', [App\Http\Controllers\Api\V1\NotificationController::class, 'destroy']);
    });

    // Admin routes
    Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
        // User management
        Route::get('users', [App\Http\Controllers\Api\V1\UserController::class, 'index']);
        Route::delete('users/{id}', [App\Http\Controllers\Api\V1\UserController::class, 'destroy']);

        // Role management
        Route::apiResource('roles', App\Http\Controllers\Api\V1\RoleController::class)->except(['show']);
        Route::post('roles/{role}/assign-permission', [App\Http\Controllers\Api\V1\RoleController::class, 'assignPermission']);
        Route::delete('roles/{role}/remove-permission/{permission}', [App\Http\Controllers\Api\V1\RoleController::class, 'removePermission']);

        // Permission management
        Route::apiResource('permissions', App\Http\Controllers\Api\V1\PermissionController::class)->except(['show']);
    });
});

// Admin analytics (admin-only)
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('v1/admin/analytics')->group(function () {
    Route::get('dashboard', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'dashboard']);
    Route::get('journeys', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'journeys']);
    Route::get('deviations', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'deviations']);
    Route::get('usage', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'usage']);
    Route::get('reports', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'reports']);
    Route::get('trust', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'trust']);
    Route::get('notifications', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'notifications']);
    Route::get('modes', [App\Http\Controllers\Api\V1\Admin\AnalyticsController::class, 'modes']);
});

// Public active service alerts
// Registered before the protected service-alerts resource so the literal
// "active" segment is not captured by the service-alerts/{service_alert} show route.
Route::prefix('v1')->group(function () {
    Route::get('service-alerts/active', [App\Http\Controllers\Api\V1\Transit\ServiceAlertController::class, 'getActiveAlerts']);
    Route::get('service-alerts/active/{serviceAlert}', [App\Http\Controllers\Api\V1\Transit\ServiceAlertController::class, 'getActiveAlert']);
});

// Transit routes requiring authentication and transit-data-edit permission
Route::middleware(['auth:sanctum', 'permission:transit-data-edit'])->prefix('v1')->group(function () {
    // Transit Modes (except index and show which are public)
    Route::apiResource('transit-modes', App\Http\Controllers\Api\V1\Transit\TransitModeController::class)->except(['index', 'show']);

    // Governorates (except index and show which are public)
    Route::apiResource('governorates', App\Http\Controllers\Api\V1\Transit\GovernorateController::class)->except(['index', 'show']);

    // Areas (except index and show which are public)
    Route::apiResource('areas', App\Http\Controllers\Api\V1\Transit\AreaController::class)->except(['index', 'show']);

    // Transit Operators (except index and show which are public)
    Route::apiResource('transit-operators', App\Http\Controllers\Api\V1\Transit\TransitOperatorController::class)->except(['index', 'show']);

    // Transit Stops
    Route::apiResource('transit-stops', App\Http\Controllers\Api\V1\Transit\TransitStopController::class);

    // Routes
    Route::apiResource('routes', App\Http\Controllers\Api\V1\Transit\RouteController::class);

    // Route Variants
    Route::apiResource('route-variants', App\Http\Controllers\Api\V1\Transit\RouteVariantController::class);

    // Route Stops
    Route::apiResource('route-stops', App\Http\Controllers\Api\V1\Transit\RouteStopController::class);

    // Route Geometry
    Route::apiResource('route-geometry', App\Http\Controllers\Api\V1\Transit\RouteGeometryController::class);

    // Schedules
    Route::apiResource('schedules', App\Http\Controllers\Api\V1\Transit\ScheduleController::class);

    // Stop Times
    Route::apiResource('stop-times', App\Http\Controllers\Api\V1\Transit\StopTimeController::class);

    // Service Alerts
    Route::apiResource('service-alerts', App\Http\Controllers\Api\V1\Transit\ServiceAlertController::class);

    // Service Alert Stops
    Route::apiResource('service-alert-stops', App\Http\Controllers\Api\V1\Transit\ServiceAlertStopController::class);

    // Service Alert Routes
    Route::apiResource('service-alert-routes', App\Http\Controllers\Api\V1\Transit\ServiceAlertRouteController::class);

    // GTFS Import
    Route::post('gtfs/import', [App\Http\Controllers\Api\V1\Transit\GtfsImportController::class, 'import']);
    Route::post('gtfs/validate', [App\Http\Controllers\Api\V1\Transit\GtfsImportController::class, 'validate']);
});

// Public endpoints (no authentication required)
Route::prefix('v1')->group(function () {
    // Public community reports (verified/resolved only)
    Route::get('community-reports', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'publicIndex']);
    Route::get('community-reports/{id}', [App\Http\Controllers\Api\V1\CommunityReportController::class, 'publicShow']);

    // Public transit stops
    Route::get('stops', [App\Http\Controllers\Api\V1\Transit\TransitStopController::class, 'publicIndex']);

    // Unified place + stop search (geocoder proxied server-side, throttled
    // to respect the keyless Photon public instance's fair-use policy).
    Route::get('places/search', [App\Http\Controllers\Api\V1\PlaceController::class, 'search'])
        ->middleware('throttle:10,1');
    Route::get('stops/{id}', [App\Http\Controllers\Api\V1\Transit\TransitStopController::class, 'publicShow']);

    // Public transit modes
    Route::get('transit-modes', [App\Http\Controllers\Api\V1\Transit\TransitModeController::class, 'publicIndex']);
    Route::get('transit-modes/{transitMode}', [App\Http\Controllers\Api\V1\Transit\TransitModeController::class, 'publicShow']);

    // Public governorates
    Route::get('governorates', [App\Http\Controllers\Api\V1\Transit\GovernorateController::class, 'publicIndex']);
    Route::get('governorates/{id}', [App\Http\Controllers\Api\V1\Transit\GovernorateController::class, 'publicShow']);

    // Public areas
    Route::get('areas', [App\Http\Controllers\Api\V1\Transit\AreaController::class, 'publicIndex']);
    Route::get('areas/{id}', [App\Http\Controllers\Api\V1\Transit\AreaController::class, 'publicShow']);

    // Public transit operators
    Route::get('transit-operators', [App\Http\Controllers\Api\V1\Transit\TransitOperatorController::class, 'publicIndex']);
    Route::get('transit-operators/{id}', [App\Http\Controllers\Api\V1\Transit\TransitOperatorController::class, 'publicShow']);

    // Public routes (using different prefix to avoid conflicts with protected endpoints)
    Route::get('public-routes', [App\Http\Controllers\Api\V1\Transit\RouteController::class, 'publicIndex']);
    Route::get('public-routes/{route}', [App\Http\Controllers\Api\V1\Transit\RouteController::class, 'publicShow']);
    Route::get('routes/{id}/stops', [App\Http\Controllers\Api\V1\Transit\RouteController::class, 'getRouteStops']);

    // Public schedules
    Route::get('public-schedules', [App\Http\Controllers\Api\V1\Transit\ScheduleController::class, 'publicIndex']);
    Route::get('public-schedules/{id}', [App\Http\Controllers\Api\V1\Transit\ScheduleController::class, 'publicShow']);
});