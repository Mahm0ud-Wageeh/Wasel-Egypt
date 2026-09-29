<?php

namespace Tests\Feature\Transit;

use App\Models\TransitMode;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransitModeTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function authenticated_user_can_create_transit_mode()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $this->actingAs($user);

        $response = $this->postJson('/api/v1/transit-modes', [
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
            'icon' => 'bus'
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'description',
                'icon',
                'created_at',
                'updated_at',
            ]
        ]);

        $this->assertDatabaseHas('transit_modes', [
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
            'icon' => 'bus'
        ]);
    }

    /** @test */
    public function unauthenticated_user_cannot_create_transit_mode()
    {
        $response = $this->postJson('/api/v1/transit-modes', [
            'name' => 'Bus',
            'description' => 'Motor bus transit mode',
            'icon' => 'bus'
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function public_can_list_transit_modes()
    {
        // Create some transit modes
        TransitMode::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/transit-modes');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'description',
                    'icon',
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
    public function authenticated_user_can_update_transit_mode()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $transitMode = TransitMode::factory()->create([
            'name' => 'Old Name',
            'description' => 'Old description',
        ]);

        $this->actingAs($user);

        $response = $this->putJson("/api/v1/transit-modes/{$transitMode->id}", [
            'name' => 'New Name',
            'description' => 'New description',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('transit_modes', [
            'id' => $transitMode->id,
            'name' => 'New Name',
            'description' => 'New description',
        ]);
    }

    /** @test */
    public function authenticated_user_can_delete_transit_mode()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $transitMode = TransitMode::factory()->create();

        $this->actingAs($user);

        $response = $this->deleteJson("/api/v1/transit-modes/{$transitMode->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertSoftDeleted('transit_modes', [
            'id' => $transitMode->id,
        ]);
    }
}