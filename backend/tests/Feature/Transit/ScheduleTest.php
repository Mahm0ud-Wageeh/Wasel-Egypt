<?php

namespace Tests\Feature\Transit;

use App\Models\Schedule;
use App\Models\RouteVariant;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a route variant for testing
        $routeVariant = \App\Models\RouteVariant::factory()->create([
            'name' => 'Variant 1'
        ]);

        $this->routeVariant = $routeVariant;
    }

    /** @test */
    public function unauthenticated_user_cannot_access_protected_endpoints()
    {
        $response = $this->getJson('/api/v1/schedules');
        $response->assertStatus(401);

        $response = $this->postJson('/api/v1/schedules', []);
        $response->assertStatus(401);

        $schedule = Schedule::factory()->create();
        $response = $this->getJson("/api/v1/schedules/{$schedule->id}");
        $response->assertStatus(401);

        $response = $this->putJson("/api/v1/schedules/{$schedule->id}", []);
        $response->assertStatus(401);

        $response = $this->deleteJson("/api/v1/schedules/{$schedule->id}");
        $response->assertStatus(401);
    }

    /** @test */
    public function authenticated_user_without_permission_cannot_access_protected_endpoints()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/schedules');
        $response->assertStatus(403);

        $response = $this->postJson('/api/v1/schedules', []);
        $response->assertStatus(403);

        $schedule = Schedule::factory()->create();
        $response = $this->getJson("/api/v1/schedules/{$schedule->id}");
        $response->assertStatus(403);

        $response = $this->putJson("/api/v1/schedules/{$schedule->id}", []);
        $response->assertStatus(403);

        $response = $this->deleteJson("/api/v1/schedules/{$schedule->id}");
        $response->assertStatus(403);
    }

    /** @test */
    public function authenticated_user_with_permission_can_access_protected_endpoints()
    {
        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Test index
        $response = $this->getJson('/api/v1/schedules');
        $response->assertStatus(200);

        // Test store
        $scheduleData = [
            'route_variant_id' => $this->routeVariant->id,
            'gtfs_trip_id' => 'TRIP001',
            'service_id' => 'SERVICE001',
            'direction_id' => 0,
            'headsign' => 'Downtown',
            'wheelchair_accessible' => true,
            'notes' => 'Regular service',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_active' => true,
        ];

        $response = $this->postJson('/api/v1/schedules', $scheduleData);
        $response->assertStatus(201);
        $response->assertJsonFragment([
            'gtfs_trip_id' => 'TRIP001',
            'service_id' => 'SERVICE001'
        ]);

        $createdSchedule = $response->json('data');

        // Test show
        $response = $this->getJson("/api/v1/schedules/{$createdSchedule['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'gtfs_trip_id' => 'TRIP001',
            'service_id' => 'SERVICE001'
        ]);

        // Test update
        $updateData = [
            'headsign' => 'Uptown',
            'is_active' => false
        ];

        $response = $this->putJson("/api/v1/schedules/{$createdSchedule['id']}", $updateData);
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'headsign' => 'Uptown',
            'is_active' => false
        ]);

        // Test destroy
        $response = $this->deleteJson("/api/v1/schedules/{$createdSchedule['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'success' => true,
            'message' => 'Schedule deleted successfully'
        ]);

        $this->assertSoftDeleted('schedules', ['id' => $createdSchedule['id']]);
    }

    /** @test */
    public function public_endpoints_are_accessible_without_authentication()
    {
        // Create some schedules for testing
        Schedule::factory()->count(3)->create([
            'route_variant_id' => $this->routeVariant->id,
            'is_active' => true
        ]);

        // Create one inactive schedule
        Schedule::factory()->create([
            'route_variant_id' => $this->routeVariant->id,
            'is_active' => false
        ]);

        // Test public index - should only return active schedules
        $response = $this->getJson('/api/v1/public-schedules');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'gtfs_trip_id',
                    'route_variant',
                    'service_id',
                    'direction_id',
                    'headsign',
                    'wheelchair_accessible',
                    'notes',
                    'start_date',
                    'end_date',
                    'is_active',
                    'created_at',
                    'updated_at'
                ]
            ]
        ]);
        $response->assertJsonCount(3, 'data'); // Only active ones

        // Test public show
        $schedule = Schedule::where('is_active', true)->first();
        $response = $this->getJson("/api/v1/public-schedules/{$schedule->id}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'id' => $schedule->id
        ]);

        // Test public show with inactive schedule should return 404
        $inactiveSchedule = Schedule::where('is_active', false)->first();
        $response = $this->getJson("/api/v1/public-schedules/{$inactiveSchedule->id}");
        $response->assertStatus(404);
    }

    /** @test */
    public function validation_rules_work_correctly()
    {
        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Create a route variant for duplicate testing
        $routeVariant1 = RouteVariant::factory()->create();

        // Test duplicate gtfs_trip_id
        Schedule::factory()->create([
            'route_variant_id' => $routeVariant1->id,
            'gtfs_trip_id' => 'DUPLICATE_TRIP'
        ]);

        $response = $this->postJson('/api/v1/schedules', [
            'route_variant_id' => $routeVariant1->id,
            'gtfs_trip_id' => 'DUPLICATE_TRIP', // Duplicate
            'service_id' => 'SERVICE002',
            'direction_id' => 0,
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31'
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['gtfs_trip_id']);

        // Test invalid direction_id
        $response = $this->postJson('/api/v1/schedules', [
            'route_variant_id' => $this->routeVariant->id,
            'service_id' => 'SERVICE002',
            'direction_id' => 2, // Invalid: not in [0,1]
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31'
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['direction_id']);

        // Test invalid date range (end_date before start_date)
        $response = $this->postJson('/api/v1/schedules', [
            'route_variant_id' => $this->routeVariant->id,
            'service_id' => 'SERVICE002',
            'direction_id' => 0,
            'start_date' => '2026-12-31',
            'end_date' => '2026-01-01' // Invalid: before start_date
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['end_date']);

        // Test missing required fields
        $response = $this->postJson('/api/v1/schedules', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'route_variant_id'
            // service_id is nullable, so not required
        ]);
    }

    /** @test */
    public function filtering_and_search_functionality_works()
    {
        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Create test data
        $schedule1 = Schedule::factory()->create([
            'route_variant_id' => $this->routeVariant->id,
            'headsign' => 'Downtown Express',
            'is_active' => true
        ]);

        $schedule2 = Schedule::factory()->create([
            'route_variant_id' => $this->routeVariant->id,
            'headsign' => 'Uptown Local',
            'is_active' => true
        ]);

        // Test search
        $response = $this->getJson('/api/v1/schedules?search=Downtown');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'headsign' => 'Downtown Express'
        ]);

        $response = $this->getJson('/api/v1/schedules?search=Local');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'headsign' => 'Uptown Local'
        ]);

        // Test filtering by is_active
        $response = $this->getJson('/api/v1/schedules?is_active=true');
        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');

        $response = $this->getJson('/api/v1/schedules?is_active=false');
        $response->assertStatus(200);
        // Should only count inactive ones in protected endpoint
        $inactiveCount = Schedule::where('is_active', false)->count();
        $response->assertJsonCount($inactiveCount, 'data');

        // Test sorting
        $response = $this->getJson('/api/v1/schedules?sort_by=headsign&sort_order=asc');
        $response->assertStatus(200);
        $firstSchedule = $response->json('data')[0];
        $this->assertEquals('Downtown Express', $firstSchedule['headsign']);

        $response = $this->getJson('/api/v1/schedules?sort_by=headsign&sort_order=desc');
        $response->assertStatus(200);
        $firstSchedule = $response->json('data')[0];
        $this->assertEquals('Uptown Local', $firstSchedule['headsign']);

        // Test pagination
        $response = $this->getJson('/api/v1/schedules?per_page=1');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $activeCount = Schedule::where('is_active', true)->count();
        $expectedLastPage = ceil($activeCount / 1);
        $actualLastPage = $response->json('meta')['last_page'];
        // error_log("Pagination debug: activeCount=" . $activeCount . ", expectedLastPage=" . $expectedLastPage . ", actualLastPage=" . $actualLastPage . " (type: " . gettype($actualLastPage) . ")");
        $this->assertEquals($activeCount, $response->json('meta')['total']);
        $this->assertEquals($expectedLastPage, $actualLastPage);
    }

    /** @test */
    public function route_variant_relationship_is_loaded_correctly()
    {
        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        $schedule = Schedule::factory()->create([
            'route_variant_id' => $this->routeVariant->id
        ]);

        $response = $this->getJson("/api/v1/schedules/{$schedule->id}");
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'id',
                'route_variant_id',
                'gtfs_trip_id',
                'service_id',
                'direction_id',
                'headsign',
                'wheelchair_accessible',
                'notes',
                'start_date',
                'end_date',
                'is_active',
                'route_variant' => [
                    'id',
                    'name',
                    'description',
                    'route_id',
                    'created_at',
                    'updated_at',
                    'route' => [
                        'id',
                        'name'
                    ]
                ]
            ]
        ]);
        $response->assertJsonPath('data.route_variant.name', 'Variant 1');
    }
}