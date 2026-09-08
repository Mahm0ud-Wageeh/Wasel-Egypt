<?php

use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\TransitStop;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

use App\Models\Governorate;
use App\Models\Area;
use Illuminate\Support\Facades\DB;

class RouteStopTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a governorate and area for testing
        $governorate = Governorate::factory()->create([
            'name' => 'Cairo',
            'code' => 'CAI'
        ]);

        $this->area = Area::factory()->create([
            'name' => 'Nasr City',
            'governorate_id' => $governorate->id
        ]);

        // Create a route variant and transit stop for testing
        $routeVariant = \App\Models\RouteVariant::factory()->create([
            'name' => 'Variant 1'
        ]);

        $transitStop = \App\Models\TransitStop::factory()->create([
            'name' => 'Test Stop',
            'area_id' => $this->area->id
        ]);

        $this->routeVariant = $routeVariant;
        $this->transitStop = $transitStop;
    }

    /** @test */
    public function unauthenticated_user_cannot_access_protected_endpoints()
    {
        $response = $this->getJson('/api/v1/route-stops');
        $response->assertStatus(401);

        $response = $this->postJson('/api/v1/route-stops', []);
        $response->assertStatus(401);

        $routeStop = RouteStop::factory()->create();
        $response = $this->getJson("/api/v1/route-stops/{$routeStop->id}");
        $response->assertStatus(401);

        $response = $this->putJson("/api/v1/route-stops/{$routeStop->id}", []);
        $response->assertStatus(401);

        $response = $this->deleteJson("/api/v1/route-stops/{$routeStop->id}");
        $response->assertStatus(401);
    }

    /** @test */
    public function authenticated_user_without_permission_cannot_access_protected_endpoints()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/route-stops');
        $response->assertStatus(403);

        $response = $this->postJson('/api/v1/route-stops', []);
        $response->assertStatus(403);

        $routeStop = RouteStop::factory()->create();
        $response = $this->getJson("/api/v1/route-stops/{$routeStop->id}");
        $response->assertStatus(403);

        $response = $this->putJson("/api/v1/route-stops/{$routeStop->id}", []);
        $response->assertStatus(403);

        $response = $this->deleteJson("/api/v1/route-stops/{$routeStop->id}");
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
        $response = $this->getJson('/api/v1/route-stops');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'route_variant',
                    'transit_stop',
                    'sequence',
                    'pickup_type',
                    'drop_off_type',
                    'distance_from_prev',
                    'created_at',
                    'updated_at'
                ]
            ]
        ]);

        // Test store
        $routeStopData = [
            'route_variant_id' => $this->routeVariant->id,
            'transit_stop_id' => $this->transitStop->id,
            'sequence' => 1,
            'pickup_type' => 0,
            'drop_off_type' => 0,
            'distance_from_prev' => 0.5
        ];

        $response = $this->postJson('/api/v1/route-stops', $routeStopData);
        $response->assertStatus(201);
        $response->assertJsonFragment([
            'sequence' => 1,
            'distance_from_prev' => '0.500'
        ]);

        $createdRouteStop = $response->json('data');

        // Test show
        $response = $this->getJson("/api/v1/route-stops/{$createdRouteStop['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'sequence' => 1,
            'distance_from_prev' => '0.500'
        ]);

        // Test update
        $updateData = [
            'route_variant_id' => $routeStopData['route_variant_id'],
            'transit_stop_id' => $routeStopData['transit_stop_id'],
            'sequence' => 2,
            'distance_from_prev' => 1.2
        ];

        $response = $this->putJson("/api/v1/route-stops/{$createdRouteStop['id']}", $updateData);
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'sequence' => 2,
            'distance_from_prev' => '1.200'
        ]);

        // Test destroy
        $response = $this->deleteJson("/api/v1/route-stops/{$createdRouteStop['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'success' => true,
            'message' => 'Route stop deleted successfully'
        ]);

        $this->assertSoftDeleted('route_stops', ['id' => $createdRouteStop['id']]);
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

        // Create a route variant and transit stop for duplicate testing
        $routeVariant1 = RouteVariant::factory()->create();
        $transitStop1 = TransitStop::factory()->create();

        $routeStop1 = new RouteStop();
        $routeStop1->route_variant_id = $routeVariant1->id;
        $routeStop1->transit_stop_id = $transitStop1->id;
        $routeStop1->sequence = 5;
        $routeStop1->pickup_type = 0;
        $routeStop1->drop_off_type = 0;
        $routeStop1->distance_from_prev = 0.5;
        $routeStop1->save();

        $response = $this->postJson('/api/v1/route-stops', [
            'route_variant_id' => $routeVariant1->id,
            'transit_stop_id' => $transitStop1->id,
            'sequence' => 5, // Duplicate sequence for same route variant
            'pickup_type' => 0,
            'drop_off_type' => 0,
            'distance_from_prev' => 0.5
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['sequence']);

        // Test invalid sequence (negative)
        $response = $this->postJson('/api/v1/route-stops', [
            'route_variant_id' => $this->routeVariant->id,
            'transit_stop_id' => $this->transitStop->id,
            'sequence' => -1, // Invalid: < 0
            'pickup_type' => 0,
            'drop_off_type' => 0,
            'distance_from_prev' => 0.5
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['sequence']);

        // Test invalid pickup_type
        $response = $this->postJson('/api/v1/route-stops', [
            'route_variant_id' => $this->routeVariant->id,
            'transit_stop_id' => $this->transitStop->id,
            'sequence' => 1,
            'pickup_type' => 5, // Invalid: not in [0,1,2,3]
            'drop_off_type' => 0,
            'distance_from_prev' => 0.5
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pickup_type']);

        // Test invalid drop_off_type
        $response = $this->postJson('/api/v1/route-stops', [
            'route_variant_id' => $this->routeVariant->id,
            'transit_stop_id' => $this->transitStop->id,
            'sequence' => 1,
            'pickup_type' => 0,
            'drop_off_type' => 5, // Invalid: not in [0,1,2,3]
            'distance_from_prev' => 0.5
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['drop_off_type']);

        // Test invalid distance_from_prev (negative)
        $response = $this->postJson('/api/v1/route-stops', [
            'route_variant_id' => $this->routeVariant->id,
            'transit_stop_id' => $this->transitStop->id,
            'sequence' => 1,
            'pickup_type' => 0,
            'drop_off_type' => 0,
            'distance_from_prev' => -0.5 // Invalid: < 0
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['distance_from_prev']);

        // Test missing required fields
        $response = $this->postJson('/api/v1/route-stops', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'route_variant_id',
            'transit_stop_id',
            'sequence'
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
        $routeVariantA = $this->routeVariant;
        $routeVariantB = RouteVariant::factory()->create();

        $transitStop = $this->transitStop;

        $routeStop1 = RouteStop::factory()->create([
            'route_variant_id' => $routeVariantA->id,
            'transit_stop_id' => $transitStop->id,
            'sequence' => 1,
            'distance_from_prev' => 0.0,
            'pickup_type' => 0,
            'drop_off_type' => 0
        ]);

        $routeStop2 = RouteStop::factory()->create([
            'route_variant_id' => $routeVariantB->id,
            'transit_stop_id' => $transitStop->id,
            'sequence' => 2,
            'distance_from_prev' => 1.5,
            'pickup_type' => 0,
            'drop_off_type' => 0
        ]);

        $this->assertEquals(2, RouteStop::count(), 'Expected 2 route stops to be created');

        // Verify the transit_stop_id is set correctly on each
        $this->assertEquals($transitStop->id, $routeStop1->transit_stop_id, 'RouteStop1 transit_stop_id mismatch');
        $this->assertEquals($transitStop->id, $routeStop2->transit_stop_id, 'RouteStop2 transit_stop_id mismatch');

        // Verify in the database directly
        $dbCount = DB::table('route_stops')->where('transit_stop_id', $transitStop->id)->count();
        $this->assertEquals(2, $dbCount, 'Expected 2 route stops in DB for transit stop');

        dump($routeStop1->toArray(), $routeStop2->toArray());

        
        // Test filtering by route_variant_id for variant A
        $response = $this->getJson('/api/v1/route-stops?route_variant_id=' . $routeVariantA->id);
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');

        // Test filtering by route_variant_id for variant B
        $response = $this->getJson('/api/v1/route-stops?route_variant_id=' . $routeVariantB->id);
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');

        // Test filtering by transit_stop_id
        $response = $this->getJson('/api/v1/route-stops?transit_stop_id=' . $this->transitStop->id);
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals(2, count($data), 'Expected 2 route stops in data for transit_stop_id=' . $this->transitStop->id . '. Got: ' . json_encode($data));

        // Test sorting
        $response = $this->getJson('/api/v1/route-stops?sort_by=sequence&sort_order=asc');
        $response->assertStatus(200);
        $firstStop = $response->json('data')[0];
        $this->assertEquals(1, $firstStop['sequence']);

        $response = $this->getJson('/api/v1/route-stops?sort_by=sequence&sort_order=desc');
        $response->assertStatus(200);
        $firstStop = $response->json('data')[0];
        $this->assertEquals(2, $firstStop['sequence']);

        // Get all route stops without pagination to verify total count
        $responseAll = $this->getJson('/api/v1/route-stops');
        $responseAll->assertStatus(200);
        $dataAll = $responseAll->json('data');
        $this->assertEquals(2, count($dataAll), 'Expected 2 route stops when getting all. Got: ' . json_encode($dataAll));

        // Test pagination
        $response = $this->getJson('/api/v1/route-stops?per_page=1');
        $response->assertStatus(200);
        dump($response->json(), 'Response JSON');
        dump(RouteStop::count(), 'RouteStop count in test');
        dump(DB::table('route_stops')->count(), 'RouteStop count in DB via DB facade');
        $response->assertJsonCount(1, 'data');
        $this->assertEquals(2, (int) $response->json('meta')['total']);
        $this->assertEquals(2, (int) $response->json('meta')['last_page']);
    }

    /** @test */
    public function route_variant_and_transit_stop_relationships_are_loaded_correctly()
    {
        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        $routeStop = new RouteStop();
        $routeStop->route_variant_id = $this->routeVariant->id;
        $routeStop->transit_stop_id = $this->transitStop->id;
        $routeStop->sequence = 0;
        $routeStop->save();

        $response = $this->getJson("/api/v1/route-stops/{$routeStop->id}");
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'route_variant' => [
                    'id',
                    'name'
                ],
                'transit_stop' => [
                    'id',
                    'name'
                ]
            ]
        ]);

        $response->assertJsonPath('data.route_variant.id', $this->routeVariant->id);
        $response->assertJsonPath('data.route_variant.name', $this->routeVariant->name);
        $response->assertJsonPath('data.transit_stop.id', $this->transitStop->id);
        $response->assertJsonPath('data.transit_stop.name', $this->transitStop->name);
    }
}