<?php

use App\Models\Area;
use App\Models\Governorate;
use App\Models\Permission;
use App\Models\Role;
use App\Models\TransitStop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransitStopTest extends TestCase
{
    use RefreshDatabase;

    protected $area;

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
    }

    /** @test */
    public function unauthenticated_user_cannot_access_protected_endpoints()
    {
        $response = $this->getJson('/api/v1/transit-stops');
        $response->assertStatus(401);

        $response = $this->postJson('/api/v1/transit-stops', []);
        $response->assertStatus(401);

        $stop = TransitStop::factory()->create();
        $response = $this->getJson("/api/v1/transit-stops/{$stop->id}");
        $response->assertStatus(401);

        $response = $this->putJson("/api/v1/transit-stops/{$stop->id}", []);
        $response->assertStatus(401);

        $response = $this->deleteJson("/api/v1/transit-stops/{$stop->id}");
        $response->assertStatus(401);
    }

    /** @test */
    public function authenticated_user_without_permission_cannot_access_protected_endpoints()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/transit-stops');
        $response->assertStatus(403);

        $response = $this->postJson('/api/v1/transit-stops', []);
        $response->assertStatus(403);

        $stop = TransitStop::factory()->create();
        $response = $this->getJson("/api/v1/transit-stops/{$stop->id}");
        $response->assertStatus(403);

        $response = $this->putJson("/api/v1/transit-stops/{$stop->id}", []);
        $response->assertStatus(403);

        $response = $this->deleteJson("/api/v1/transit-stops/{$stop->id}");
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
        $response = $this->getJson('/api/v1/transit-stops');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'gtfs_stop_id',
                    'name',
                    'latitude',
                    'longitude',
                    'location_accuracy',
                    'wheelchair_accessible',
                    'platform_code',
                    'area',
                    'created_at',
                    'updated_at'
                ]
            ]
        ]);

        // Test store - make sure to include all required fields
        $stopData = [
            'gtfs_stop_id' => 'STOP001',
            'name' => 'Test Stop',
            'latitude' => 30.0444,
            'longitude' => 31.2357,
            'location_accuracy' => 3,
            'wheelchair_accessible' => true,
            'platform_code' => 'A1',
            'area_id' => $this->area->id
        ];

        $response = $this->postJson('/api/v1/transit-stops', $stopData);
        $response->assertStatus(201);
        $response->assertJsonFragment([
            'name' => 'Test Stop',
            'gtfs_stop_id' => 'STOP001'
        ]);

        $createdStop = $response->json('data');

        // Test show
        $response = $this->getJson("/api/v1/transit-stops/{$createdStop['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'name' => 'Test Stop',
            'gtfs_stop_id' => 'STOP001'
        ]);

        // Test update
        $updateData = [
            'name' => 'Updated Stop Name',
            'platform_code' => 'B2'
        ];

        $response = $this->putJson("/api/v1/transit-stops/{$createdStop['id']}", $updateData);
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'name' => 'Updated Stop Name',
            'platform_code' => 'B2'
        ]);

        // Test destroy
        $response = $this->deleteJson("/api/v1/transit-stops/{$createdStop['id']}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'success' => true,
            'message' => 'Transit stop deleted successfully'
        ]);

        $this->assertSoftDeleted('transit_stops', ['id' => $createdStop['id']]);
    }

    /** @test */
    public function public_endpoints_are_accessible_without_authentication()
    {
        // Create some transit stops for testing
        $stops = TransitStop::factory()->count(3)->create([
            'area_id' => $this->area->id
        ]);

        // Test public index
        $response = $this->getJson('/api/v1/stops');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'gtfs_stop_id',
                    'name',
                    'latitude',
                    'longitude',
                    'location_accuracy',
                    'wheelchair_accessible',
                    'platform_code',
                    'area',
                    'created_at',
                    'updated_at'
                ]
            ]
        ]);
        $response->assertJsonCount(3, 'data');

        // Test public show
        $stop = $stops->first(); // Use one of the stops we just created
        // Debug: check if the stop actually exists in the database
        $dbStop = TransitStop::find($stop->id);
        \Log::debug('Factory stop: ' . json_encode($stop->toArray()));
        \Log::debug('DB stop: ' . json_encode($dbStop->toArray()));

        // Additional debugging
        \Log::debug('Stop ID: '.$stop->id);
        \Log::debug('Stop name: '.$stop->name);

        $response = $this->getJson("/api/v1/stops/{$stop->id}");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'id' => $stop->id,
            'name' => $stop->name
        ]);
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

        // Test duplicate gtfs_stop_id
        TransitStop::factory()->create([
            'gtfs_stop_id' => 'DUPLICATE_STOP',
            'area_id' => $this->area->id
        ]);

        $response = $this->postJson('/api/v1/transit-stops', [
            'gtfs_stop_id' => 'DUPLICATE_STOP',
            'name' => 'Another Stop',
            'latitude' => 30.0,
            'longitude' => 31.0,
            'area_id' => $this->area->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['gtfs_stop_id']);

        // Test invalid latitude
        $response = $this->postJson('/api/v1/transit-stops', [
            'name' => 'Invalid Lat Stop',
            'latitude' => 95.0, // Invalid: > 90
            'longitude' => 31.0,
            'area_id' => $this->area->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['latitude']);

        // Test invalid longitude
        $response = $this->postJson('/api/v1/transit-stops', [
            'name' => 'Invalid Lon Stop',
            'latitude' => 30.0,
            'longitude' => 185.0, // Invalid: > 180
            'area_id' => $this->area->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['longitude']);

        // Test invalid location_accuracy
        $response = $this->postJson('/api/v1/transit-stops', [
            'name' => 'Invalid Accuracy Stop',
            'latitude' => 30.0,
            'longitude' => 31.0,
            'location_accuracy' => 6, // Invalid: > 5
            'area_id' => $this->area->id
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['location_accuracy']);

        // Test missing required fields
        $response = $this->postJson('/api/v1/transit-stops', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'latitude', 'longitude', 'area_id']);
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
        $stop1 = TransitStop::factory()->create([
            'name' => 'Cairo Central Station',
            'area_id' => $this->area->id
        ]);

        $stop2 = TransitStop::factory()->create([
            'name' => 'Giza Square',
            'area_id' => $this->area->id
        ]);

        // Test search
        $response = $this->getJson('/api/v1/transit-stops?search=Cairo');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'name' => 'Cairo Central Station'
        ]);

        $response = $this->getJson('/api/v1/transit-stops?search=Square');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'name' => 'Giza Square'
        ]);

        // Test sorting
        $response = $this->getJson('/api/v1/transit-stops?sort_by=name&sort_order=asc');
        $response->assertStatus(200);
        $firstStop = $response->json('data')[0];
        $this->assertEquals('Cairo Central Station', $firstStop['name']);

        $response = $this->getJson('/api/v1/transit-stops?sort_by=name&sort_order=desc');
        $response->assertStatus(200);
        $firstStop = $response->json('data')[0];
        $this->assertEquals('Giza Square', $firstStop['name']);

        // Test pagination
        $response = $this->getJson('/api/v1/transit-stops?per_page=1');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $meta = $response->json('meta');
        $total = $meta['total'];
        // Debug: check what type $total is
        if (is_array($total)) {
            $total = $total[0]; // Take first element if it's an array
        }
        $this->assertEquals(2, $total, 'Expected total to be 2 but got '.$total);
        $lastPage = $meta['last_page'];
        // Debug: check what type $lastPage is
        if (is_array($lastPage)) {
            $lastPage = $lastPage[0]; // Take first element if it's an array
        }
        $this->assertEquals(2, $lastPage, 'Expected last_page to be 2 but got '.$lastPage);
    }

    /** @test */
    public function area_relationship_is_loaded_correctly()
    {
        // Create permission and role for transit-data-edit
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);
        Sanctum::actingAs($user);

        $stop = TransitStop::factory()->create();
        $stop->area_id = $this->area->id;
        $stop->save();

        $response = $this->getJson("/api/v1/transit-stops/{$stop->id}");
        $response->assertStatus(200);

        $response->assertJsonStructure([
            'data' => [
                'area' => [
                    'id',
                    'name',
                    'governorate' => [
                        'id',
                        'name',
                        'code'
                    ]
                ]
            ]
        ]);

        
        $response->assertJsonPath('data.area.id', $this->area->id);
        $response->assertJsonPath('data.area.name', $this->area->name);
        $response->assertJsonPath('data.area.governorate.id', $this->area->governorate->id);
        $response->assertJsonPath('data.area.governorate.name', $this->area->governorate->name);
        $response->assertJsonPath('data.area.governorate.code', $this->area->governorate->code);
    }

    /** @test */
    public function public_stop_show_returns_404_for_unknown_stop()
    {
        // Regression: a missing stop must 404, not 500.
        $response = $this->getJson('/api/v1/stops/99999');

        $response->assertStatus(404);
        $response->assertJsonPath('success', false);
    }

    /** @test */
    public function public_stop_show_returns_the_stop_with_area()
    {
        $stop = TransitStop::factory()->create([
            'area_id' => $this->area->id,
        ]);

        $response = $this->getJson("/api/v1/stops/{$stop->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $stop->id);
        $response->assertJsonPath('data.area.id', $this->area->id);
    }

    /** @test */
    public function public_stops_index_filters_by_bounding_box()
    {
        $inside = TransitStop::factory()->create([
            'name' => 'Tahrir Square',
            'latitude' => 30.0444,
            'longitude' => 31.2357,
            'area_id' => $this->area->id,
        ]);
        $outside = TransitStop::factory()->create([
            'name' => 'Far Away Stop',
            'latitude' => 29.0,
            'longitude' => 30.0,
            'area_id' => $this->area->id,
        ]);

        // bbox=minLng,minLat,maxLng,maxLat around Tahrir
        $response = $this->getJson('/api/v1/stops?bbox=31.20,30.03,31.26,30.06&per_page=100');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Tahrir Square', $names);
        $this->assertNotContains('Far Away Stop', $names);
    }

    /** @test */
    public function public_stops_index_ignores_malformed_bbox()
    {
        TransitStop::factory()->create([
            'latitude' => 30.0444,
            'longitude' => 31.2357,
            'area_id' => $this->area->id,
        ]);

        // Out-of-range coordinates must be ignored, not crash.
        $response = $this->getJson('/api/v1/stops?bbox=999,999,999,999');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');

        // Wrong segment count must be ignored, not crash.
        $response = $this->getJson('/api/v1/stops?bbox=31.20,30.03');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }
}
