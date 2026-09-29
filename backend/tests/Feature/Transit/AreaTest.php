<?php

namespace Tests\Feature\Transit;

use App\Models\Area;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AreaTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function authenticated_user_can_create_area()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        // Create a governorate for the area
        $governorate = \App\Models\Governorate::factory()->create();

        $this->actingAs($user);

        $response = $this->postJson('/api/v1/areas', [
            'governorate_id' => $governorate->id,
            'name' => 'Downtown'
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'governorate' => [
                    'id',
                    'name',
                    'code',
                ],
                'created_at',
                'updated_at',
            ]
        ]);

        $this->assertDatabaseHas('areas', [
            'name' => 'Downtown',
            'governorate_id' => $governorate->id
        ]);
    }

    /** @test */
    public function unauthenticated_user_cannot_create_area()
    {
        $response = $this->postJson('/api/v1/areas', [
            'governorate_id' => 1,
            'name' => 'Downtown'
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function public_can_list_areas()
    {
        // Create some areas with governorates
        $governorates = \App\Models\Governorate::factory()->count(2)->create();
        Area::factory()->count(3)->create([
            'governorate_id' => $governorates->first()->id
        ]);

        $response = $this->getJson('/api/v1/areas');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'governorate' => [
                        'id',
                        'name',
                        'code',
                    ],
                    'created_at',
                    'updated_at',
                ]
            ],
            'meta' => [
                'total',
                'per_page',
                'current_page',
                'last_page',
            ]
        ]);

        $this->assertCount(3, $response->json('data'));
    }

    /** @test */
    public function authenticated_user_can_update_area()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        // Create a governorate and area
        $governorate = \App\Models\Governorate::factory()->create();
        $area = Area::factory()->create([
            'governorate_id' => $governorate->id,
            'name' => 'Old Name'
        ]);

        $this->actingAs($user);

        $response = $this->putJson("/api/v1/areas/{$area->id}", [
            'governorate_id' => $governorate->id,
            'name' => 'New Name'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('areas', [
            'id' => $area->id,
            'name' => 'New Name',
            'governorate_id' => $governorate->id
        ]);
    }

    /** @test */
    public function authenticated_user_can_delete_area()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $area = Area::factory()->create();

        $this->actingAs($user);

        $response = $this->deleteJson("/api/v1/areas/{$area->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertSoftDeleted('areas', [
            'id' => $area->id,
        ]);
    }
}