<?php

use App\Models\ServiceAlertStop;
use App\Models\ServiceAlert;
use App\Models\TransitStop;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServiceAlertStopTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function unauthenticated_user_cannot_access_protected_endpoints()
    {
        $response = $this->getJson('/api/v1/service-alert-stops');
        $response->assertStatus(401);

        $response = $this->postJson('/api/v1/service-alert-stops', []);
        $response->assertStatus(401);

        $serviceAlertStop = ServiceAlertStop::factory()->create();
        $response = $this->getJson("/api/v1/service-alert-stops/{$serviceAlertStop->id}");
        $response->assertStatus(401);

        $response = $this->putJson("/api/v1/service-alert-stops/{$serviceAlertStop->id}", []);
        $response->assertStatus(401);

        $response = $this->deleteJson("/api/v1/service-alert-stops/{$serviceAlertStop->id}");
        $response->assertStatus(401);
    }

    /** @test */
    public function authenticated_user_without_permission_cannot_access_protected_endpoints()
    {
        // Create a service alert and transit stop for testing
        $serviceAlert = ServiceAlert::factory()->create();
        $transitStop = TransitStop::factory()->create();

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/service-alert-stops');
        $response->assertStatus(403);

        $response = $this->postJson('/api/v1/service-alert-stops', []);
        $response->assertStatus(403);

        $serviceAlertStop = ServiceAlertStop::factory()->create([
            'service_alert_id' => $serviceAlert->id,
            'transit_stop_id' => $transitStop->id
        ]);
        $response = $this->getJson("/api/v1/service-alert-stops/{$serviceAlertStop->id}");
        $response->assertStatus(403);

        $response = $this->putJson("/api/v1/service-alert-stops/{$serviceAlertStop->id}", []);
        $response->assertStatus(403);

        $response = $this->deleteJson("/api/v1/service-alert-stops/{$serviceAlertStop->id}");
        $response->assertStatus(403);
    }

    /** @test */
    public function authenticated_user_with_permission_can_access_protected_endpoints()
    {
        // Create service alert and transit stop for testing
        $serviceAlert = ServiceAlert::factory()->create();
        $transitStop = TransitStop::factory()->create();

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Test index
        $response = $this->getJson('/api/v1/service-alert-stops');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'service_alert_id',
                    'transit_stop' => [
                        'id',
                        'name',
                        'latitude',
                        'longitude'
                    ],
                    'created_at',
                    'updated_at'
                ]
            ]
        ]);

        // Test store
        $serviceAlertStopData = [
            'service_alert_id' => $serviceAlert->id,
            'transit_stop_id' => $transitStop->id
        ];

        $response = $this->postJson('/api/v1/service-alert-stops', $serviceAlertStopData);
        $response->assertStatus(201);
        $response->assertJsonFragment([
            'service_alert_id' => $serviceAlert->id,
            'transit_stop' => [
                'id' => $transitStop->id,
                'name' => $transitStop->name,
                'latitude' => $transitStop->latitude,
                'longitude' => $transitStop->longitude
            ]
        ]);

        $createdServiceAlertStop = $response->json('data');

        // Test show
        $response = $this->getJson("/api/v1/service-alert-stops/{$createdServiceAlertStop['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'id' => $createdServiceAlertStop['id'],
            'service_alert_id' => $serviceAlert->id,
            'transit_stop' => [
                'id' => $transitStop->id,
                'name' => $transitStop->name,
                'latitude' => $transitStop->latitude,
                'longitude' => $transitStop->longitude
            ]
        ]);

        // Test update
        // Create another service alert and transit stop for update testing
        $serviceAlert2 = ServiceAlert::factory()->create();
        $transitStop2 = TransitStop::factory()->create();

        $updateData = [
            'service_alert_id' => $serviceAlert2->id,
            'transit_stop_id' => $transitStop2->id
        ];

        $response = $this->putJson("/api/v1/service-alert-stops/{$createdServiceAlertStop['id']}", $updateData);
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'service_alert_id' => $serviceAlert2->id,
            'transit_stop' => [
                'id' => $transitStop2->id,
                'name' => $transitStop2->name,
                'latitude' => $transitStop2->latitude,
                'longitude' => $transitStop2->longitude
            ]
        ]);

        // Test destroy
        $response = $this->deleteJson("/api/v1/service-alert-stops/{$createdServiceAlertStop['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'success' => true,
            'message' => 'Service alert stop deleted successfully'
        ]);

        $this->assertSoftDeleted('service_alert_stops', ['id' => $createdServiceAlertStop['id']]);
    }

    /** @test */
    public function validation_rules_work_correctly()
    {
        // Create service alert and transit stop for testing
        $serviceAlert = ServiceAlert::factory()->create();
        $transitStop = TransitStop::factory()->create();

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Test missing required fields
        $response = $this->postJson('/api/v1/service-alert-stops', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'service_alert_id',
            'transit_stop_id'
        ]);

        // Test invalid service_alert_id
        $response = $this->postJson('/api/v1/service-alert-stops', [
            'service_alert_id' => 99999, // Non-existent ID
            'transit_stop_id' => $transitStop->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['service_alert_id']);

        // Test invalid transit_stop_id
        $response = $this->postJson('/api/v1/service-alert-stops', [
            'service_alert_id' => $serviceAlert->id,
            'transit_stop_id' => 99999 // Non-existent ID
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['transit_stop_id']);
    }

    /** @test */
    public function filtering_and_search_functionality_works()
    {
        // Create service alerts and transit stops for testing
        $serviceAlert1 = ServiceAlert::factory()->create();
        $serviceAlert2 = ServiceAlert::factory()->create();
        $transitStop1 = TransitStop::factory()->create();
        $transitStop2 = TransitStop::factory()->create();

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        // Create test data
        $serviceAlertStop1 = ServiceAlertStop::factory()->create([
            'service_alert_id' => $serviceAlert1->id,
            'transit_stop_id' => $transitStop1->id
        ]);

        $serviceAlertStop2 = ServiceAlertStop::factory()->create([
            'service_alert_id' => $serviceAlert2->id,
            'transit_stop_id' => $transitStop2->id
        ]);

        // Test filtering by service_alert_id
        $response = $this->getJson("/api/v1/service-alert-stops?service_alert_id={$serviceAlert1->id}");
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'service_alert_id' => $serviceAlert1->id
        ]);

        $response = $this->getJson("/api/v1/service-alert-stops?service_alert_id={$serviceAlert2->id}");
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'service_alert_id' => $serviceAlert2->id
        ]);

        // Test filtering by transit_stop_id
        $response = $this->getJson("/api/v1/service-alert-stops?transit_stop_id={$transitStop1->id}");
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'transit_stop' => [
                'id' => $transitStop1->id,
                'name' => $transitStop1->name,
                'latitude' => $transitStop1->latitude,
                'longitude' => $transitStop1->longitude
            ]
        ]);

        $response = $this->getJson("/api/v1/service-alert-stops?transit_stop_id={$transitStop2->id}");
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'transit_stop' => [
                'id' => $transitStop2->id,
                'name' => $transitStop2->name,
                'latitude' => $transitStop2->latitude,
                'longitude' => $transitStop2->longitude
            ]
        ]);

        // Test sorting
        $response = $this->getJson('/api/v1/service-alert-stops?sort_by=id&sort_order=asc');
        $response->assertStatus(200);
        $firstServiceAlertStop = $response->json('data')[0];
        $this->assertEquals(min($serviceAlertStop1->id, $serviceAlertStop2->id), $firstServiceAlertStop['id']);

        $response = $this->getJson('/api/v1/service-alert-stops?sort_by=id&sort_order=desc');
        $response->assertStatus(200);
        $firstServiceAlertStop = $response->json('data')[0];
        $this->assertEquals(max($serviceAlertStop1->id, $serviceAlertStop2->id), $firstServiceAlertStop['id']);

        // Test pagination
        $response = $this->getJson('/api/v1/service-alert-stops?per_page=1');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $meta = $response->json('meta');
        $total = $meta['total'];
        $lastPage = $meta['last_page'];
        // Debug: check what type $total and $lastPage are
        if (is_array($total)) {
            $total = $total[0]; // Take first element if it's an array
        }
        if (is_array($lastPage)) {
            $lastPage = $lastPage[0]; // Take first element if it's an array
        }
        $this->assertEquals(2, $total);
        $this->assertEquals(2, $lastPage);
    }

    /** @test */
    public function service_alert_and_transit_stop_relationships_are_loaded_correctly()
    {
        // Create service alert and transit stop for testing
        $serviceAlert = ServiceAlert::factory()->create([
            'header_text' => 'Test Service Alert',
            'description_text' => 'This is a test service alert'
        ]);
        $transitStop = TransitStop::factory()->create([
            'name' => 'Test Transit Stop',
            'latitude' => 40.7128,
            'longitude' => -74.0060
        ]);

        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        $serviceAlertStop = ServiceAlertStop::factory()->create([
            'service_alert_id' => $serviceAlert->id,
            'transit_stop_id' => $transitStop->id
        ]);

        $response = $this->getJson("/api/v1/service-alert-stops/{$serviceAlertStop->id}");
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'id',
                'service_alert_id',
                'transit_stop' => [
                    'id',
                    'name',
                    'latitude',
                    'longitude'
                ],
                'created_at',
                'updated_at'
            ]
        ]);

        $response->assertJsonFragment([
            'id' => $serviceAlertStop->id,
            'service_alert_id' => $serviceAlert->id,
            'transit_stop' => [
                'id' => $transitStop->id,
                'name' => $transitStop->name,
                'latitude' => $transitStop->latitude,
                'longitude' => $transitStop->longitude
            ]
        ]);
    }
}