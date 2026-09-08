<?php

use App\Models\Route;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RouteTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function unauthenticated_user_cannot_access_protected_endpoints()
    {
        // Create transit operator and transit mode for testing
        $transitOperator = \App\Models\TransitOperator::factory()->create([
            'name' => 'Cairo Transport Authority',
            'short_code' => 'CTA'
        ]);

        $transitMode = \App\Models\TransitMode::factory()->create([
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
        ]);

        $response = $this->getJson('/api/v1/routes');
        $response->assertStatus(401);

        $response = $this->postJson('/api/v1/routes', []);
        $response->assertStatus(401);

        $route = Route::factory()->create([
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id
        ]);
        $response = $this->getJson("/api/v1/routes/{$route->id}");
        $response->assertStatus(401);

        $response = $this->putJson("/api/v1/routes/{$route->id}", []);
        $response->assertStatus(401);

        $response = $this->deleteJson("/api/v1/routes/{$route->id}");
        $response->assertStatus(401);
    }

    /** @test */
    public function authenticated_user_without_permission_cannot_access_protected_endpoints()
    {
        // Create transit operator and transit mode for testing
        $transitOperator = \App\Models\TransitOperator::factory()->create([
            'name' => 'Cairo Transport Authority',
            'short_code' => 'CTA'
        ]);

        $transitMode = \App\Models\TransitMode::factory()->create([
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/routes');
        $response->assertStatus(403);

        $response = $this->postJson('/api/v1/routes', []);
        $response->assertStatus(403);

        $route = Route::factory()->create([
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id
        ]);
        $response = $this->getJson("/api/v1/routes/{$route->id}");
        $response->assertStatus(403);

        $response = $this->putJson("/api/v1/routes/{$route->id}", []);
        $response->assertStatus(403);

        $response = $this->deleteJson("/api/v1/routes/{$route->id}");
        $response->assertStatus(403);
    }

    /** @test */
    public function authenticated_user_with_permission_can_access_protected_endpoints()
    {
        // Create transit operator and transit mode for testing
        $transitOperator = \App\Models\TransitOperator::factory()->create([
            'name' => 'Cairo Transport Authority',
            'short_code' => 'CTA'
        ]);

        $transitMode = \App\Models\TransitMode::factory()->create([
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
        ]);

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Test index
        $response = $this->getJson('/api/v1/routes');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'gtfs_route_id',
                    'transit_mode',
                    'transit_operator',
                    'name',
                    'short_name',
                    'long_name',
                    'description',
                    'type',
                    'url',
                    'color',
                    'text_color',
                    'sort_order',
                    'continuous_pickup',
                    'continuous_drop_off',
                    'created_at',
                    'updated_at'
                ]
            ]
        ]);

        // Test store
        $routeData = [
            'gtfs_route_id' => 'ROUTE001',
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id,
            'short_name' => 'C1',
            'long_name' => 'Cairo Downtown Route',
            'description' => 'Main downtown route',
            'type' => 3, // Bus
            'url' => 'http://example.com/route/c1',
            'color' => '#FF0000',
            'text_color' => '#FFFFFF',
            'sort_order' => 1,
            'active' => true,
            'continuous_pickup' => 1,
            'continuous_drop_off' => 1
        ];

        $response = $this->postJson('/api/v1/routes', $routeData);
        $response->assertStatus(201);
        $response->assertJsonFragment([
            'name' => 'Cairo Downtown Route',
            'gtfs_route_id' => 'ROUTE001'
        ]);

        $createdRoute = $response->json('data');

        // Test show
        $response = $this->getJson("/api/v1/routes/{$createdRoute['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'name' => 'Cairo Downtown Route',
            'gtfs_route_id' => 'ROUTE001'
        ]);

        // Test update
        $updateData = [
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id,
            'long_name' => 'Updated Route Name',
            'short_name' => 'C2'
        ];

        $response = $this->putJson("/api/v1/routes/{$createdRoute['id']}", $updateData);
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'name' => 'Updated Route Name',
            'short_name' => 'C2'
        ]);

        // Test destroy
        $response = $this->deleteJson("/api/v1/routes/{$createdRoute['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'success' => true,
            'message' => 'Route deleted successfully'
        ]);

        $this->assertSoftDeleted('routes', ['id' => $createdRoute['id']]);
    }

    /** @test */
    public function public_endpoints_are_accessible_without_authentication()
    {
        // Create transit operator and transit mode for testing
        $transitOperator = \App\Models\TransitOperator::factory()->create([
            'name' => 'Cairo Transport Authority',
            'short_code' => 'CTA'
        ]);

        $transitMode = \App\Models\TransitMode::factory()->create([
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
        ]);

        // Create some routes for testing
        $routes = Route::factory()->count(3)->create([
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id
        ]);

        // Test public index
        $response = $this->getJson('/api/v1/public-routes');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'gtfs_route_id',
                    'transit_mode',
                    'transit_operator',
                    'name',
                    'short_name',
                    'long_name',
                    'description',
                    'type',
                    'url',
                    'color',
                    'text_color',
                    'sort_order',
                    'continuous_pickup',
                    'continuous_drop_off',
                    'created_at',
                    'updated_at'
                ]
            ]
        ]);
        $response->assertJsonCount(3, 'data');

        // Test public show
        $route = $routes->first();
        $response = $this->getJson("/api/v1/public-routes/{$route->id}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'id' => $route->id,
            'name' => $route->name
        ]);
    }

    /** @test */
    public function validation_rules_work_correctly()
    {
        // Create transit operator and transit mode for testing
        $transitOperator = \App\Models\TransitOperator::factory()->create([
            'name' => 'Cairo Transport Authority',
            'short_code' => 'CTA'
        ]);

        $transitMode = \App\Models\TransitMode::factory()->create([
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
        ]);

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Test duplicate gtfs_route_id
        Route::factory()->create([
            'gtfs_route_id' => 'DUPLICATE_ROUTE',
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id
        ]);

        $response = $this->postJson('/api/v1/routes', [
            'gtfs_route_id' => 'DUPLICATE_ROUTE',
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id,
            'short_name' => 'DUP',
            'long_name' => 'Duplicate Route'
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['gtfs_route_id']);

        // Test invalid hex color
        $response = $this->postJson('/api/v1/routes', [
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id,
            'short_name' => 'INVALID COLOR',
            'long_name' => 'Invalid Color Route',
            'color' => '#GGGGGG' // Invalid hex color
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['color']);

        // Test invalid text_color
        $response = $this->postJson('/api/v1/routes', [
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id,
            'short_name' => 'INVALID TEXTCOLOR',
            'long_name' => 'Invalid TextColor Route',
            'text_color' => '#GGGGGG' // Invalid hex color
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['text_color']);

        // Test negative sort_order
        $response = $this->postJson('/api/v1/routes', [
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id,
            'short_name' => 'NEGATIVE SORT',
            'long_name' => 'Negative Sort Route',
            'sort_order' => -1 // Invalid: < 0
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['sort_order']);

        // Test missing required fields
        $response = $this->postJson('/api/v1/routes', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'transit_operator_id',
            'transit_mode_id',
            'long_name'
        ]);
    }

    /** @test */
    public function filtering_and_search_functionality_works()
    {
        // Create transit operator and transit mode for testing
        $transitOperator = \App\Models\TransitOperator::factory()->create([
            'name' => 'Cairo Transport Authority',
            'short_code' => 'CTA'
        ]);

        $transitMode = \App\Models\TransitMode::factory()->create([
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
        ]);

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Create test data
        $route1 = Route::factory()->create([
            'long_name' => 'Cairo Express Route',
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id
        ]);

        $route2 = Route::factory()->create([
            'long_name' => 'Giza Local Route',
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id
        ]);

        // Test search
        $response = $this->getJson('/api/v1/routes?search=Cairo');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'long_name' => 'Cairo Express Route'
        ]);

        $response = $this->getJson('/api/v1/routes?search=Local');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'long_name' => 'Giza Local Route'
        ]);

        // Test filtering by transit_mode_id
        $response = $this->getJson('/api/v1/routes?transit_mode_id=' . $transitMode->id);
        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');

        // Test filtering by transit_operator_id
        $response = $this->getJson('/api/v1/routes?transit_operator_id=' . $transitOperator->id);
        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');

        // Test sorting
        $response = $this->getJson('/api/v1/routes?sort_by=long_name&sort_order=asc');
        $response->assertStatus(200);
        $firstRoute = $response->json('data')[0];
        $this->assertEquals('Cairo Express Route', $firstRoute['long_name']);

        $response = $this->getJson('/api/v1/routes?sort_by=long_name&sort_order=desc');
        $response->assertStatus(200);
        $firstRoute = $response->json('data')[0];
        $this->assertEquals('Giza Local Route', $firstRoute['long_name']);

        // Test pagination
        $response = $this->getJson('/api/v1/routes?per_page=1');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $this->assertEquals(2, $response->json('meta')['total']);
        $this->assertEquals(2, $response->json('meta')['last_page']);
    }

    /** @test */
    public function transit_mode_and_operator_relationships_are_loaded_correctly()
    {
        // Create transit operator and transit mode for testing
        $transitOperator = \App\Models\TransitOperator::factory()->create([
            'name' => 'Cairo Transport Authority',
            'short_code' => 'CTA'
        ]);

        $transitMode = \App\Models\TransitMode::factory()->create([
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
        ]);

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        $route = Route::factory()->create([
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id
        ]);

        $response = $this->getJson("/api/v1/routes/{$route->id}");
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'transit_mode' => [
                    'id',
                    'name'
                ],
                'transit_operator' => [
                    'id',
                    'name'
                ]
            ]
        ]);

        $response->assertJsonFragment([
            'transit_mode' => [
                'id' => $transitMode->id,
                'name' => $transitMode->name
            ],
            'transit_operator' => [
                'id' => $transitOperator->id,
                'name' => $transitOperator->name
            ]
        ]);
    }

    /** @test */
    public function route_service_alert_routes_relation_resolves_through_variants()
    {
        // Regression: the ERD links service alerts to route VARIANTS via the
        // service_alert_routes pivot (Route -> RouteVariant -> ServiceAlertRoute).
        $transitOperator = TransitOperator::factory()->create();
        $transitMode = TransitMode::factory()->create();

        $route = Route::factory()->create([
            'transit_operator_id' => $transitOperator->id,
            'transit_mode_id' => $transitMode->id,
        ]);

        \App\Models\RouteVariant::factory()->create(['route_id' => $route->id]);

        $linked = $route->serviceAlertRoutes()->get();

        $this->assertCount(0, $linked);
    }
}
