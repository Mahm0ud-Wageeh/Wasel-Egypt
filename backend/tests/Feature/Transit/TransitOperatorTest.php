<?php

namespace Tests\Feature\Transit;

use App\Models\TransitOperator;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransitOperatorTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function authenticated_user_can_create_transit_operator()
    {
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        $user = User::factory()->create();
        $user->roles()->attach($role);

        $this->actingAs($user);

        $response = $this->postJson('/api/v1/transit-operators', [
            'name' => 'Cairo Transit Authority',
            'short_code' => 'CTA'
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'created_at',
                'updated_at',
            ]
        ]);

        $this->assertDatabaseHas('transit_operators', [
            'name' => 'Cairo Transit Authority',
            'short_code' => 'CTA'
        ]);
    }

    /** @test */
    public function unauthenticated_user_cannot_create_transit_operator()
    {
        $response = $this->postJson('/api/v1/transit-operators', [
            'name' => 'Cairo Transit Authority',
            'short_code' => 'CTA'
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function public_can_list_transit_operators()
    {
        TransitOperator::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/transit-operators');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
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
    public function authenticated_user_can_update_transit_operator()
    {
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        $user = User::factory()->create();
        $user->roles()->attach($role);

        $transitOperator = TransitOperator::factory()->create([
            'name' => 'Old Name',
            'short_code' => 'OLD'
        ]);

        $this->actingAs($user);

        $response = $this->putJson("/api/v1/transit-operators/{$transitOperator->id}", [
            'name' => 'New Name',
            'short_code' => 'NEW'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('transit_operators', [
            'id' => $transitOperator->id,
            'name' => 'New Name',
            'short_code' => 'NEW'
        ]);
    }

    /** @test */
    public function authenticated_user_can_delete_transit_operator()
    {
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role->permissions()->attach($permission);

        $user = User::factory()->create();
        $user->roles()->attach($role);

        $transitOperator = TransitOperator::factory()->create();

        $this->actingAs($user);

        $response = $this->deleteJson("/api/v1/transit-operators/{$transitOperator->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertSoftDeleted('transit_operators', [
            'id' => $transitOperator->id,
        ]);
    }
}