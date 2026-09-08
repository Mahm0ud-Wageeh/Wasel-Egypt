<?php

namespace Tests\Feature\Transit;

use App\Models\Governorate;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GovernorateTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function authenticated_user_can_create_governorate()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $this->actingAs($user);

        $response = $this->postJson('/api/v1/governorates', [
            'name' => 'Cairo',
            'code' => 'CAI'
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'code',
                'created_at',
                'updated_at',
            ]
        ]);

        $this->assertDatabaseHas('governorates', [
            'name' => 'Cairo',
            'code' => 'CAI'
        ]);
    }

    /** @test */
    public function unauthenticated_user_cannot_create_governorate()
    {
        $response = $this->postJson('/api/v1/governorates', [
            'name' => 'Cairo',
            'code' => 'CAI'
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function public_can_list_governorates()
    {
        // Create some governorates
        Governorate::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/governorates');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'code',
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
    public function authenticated_user_can_update_governorate()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $governorate = Governorate::factory()->create([
            'name' => 'Old Name',
            'code' => 'OLD'
        ]);

        $this->actingAs($user);

        $response = $this->putJson("/api/v1/governorates/{$governorate->id}", [
            'name' => 'New Name',
            'code' => 'NEW'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('governorates', [
            'id' => $governorate->id,
            'name' => 'New Name',
            'code' => 'NEW'
        ]);
    }

    /** @test */
    public function authenticated_user_can_delete_governorate()
    {
        // Create role and permission
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        // Create user and assign role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        $governorate = Governorate::factory()->create();

        $this->actingAs($user);

        $response = $this->deleteJson("/api/v1/governorates/{$governorate->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertSoftDeleted('governorates', [
            'id' => $governorate->id,
        ]);
    }
}