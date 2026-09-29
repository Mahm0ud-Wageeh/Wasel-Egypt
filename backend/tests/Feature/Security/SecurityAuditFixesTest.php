<?php

namespace Tests\Feature\Security;

use App\Models\Governorate;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityAuditFixesTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function s1_invalid_sort_by_column_does_not_crash_and_uses_default_sort()
    {
        Governorate::factory()->create(['name' => 'Alexandria', 'code' => 'ALX']);
        Governorate::factory()->create(['name' => 'Cairo', 'code' => 'CAI']);

        // Attempt SQL injection / nonexistent column in sort_by
        $response = $this->getJson('/api/v1/governorates?sort_by=nonexistent_column_or_injection&sort_order=desc');

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $data = $response->json('data');
        $this->assertCount(2, $data);
    }

    /** @test */
    public function s1_per_page_is_bounded_to_maximum_100()
    {
        Governorate::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/governorates?per_page=999999');

        $response->assertStatus(200);
        $this->assertEquals(100, $response->json('meta.per_page'));
    }

    /** @test */
    public function s2_non_admin_cannot_escalate_or_modify_own_status()
    {
        $user = User::factory()->create(['status' => 'inactive']);
        Sanctum::actingAs($user);

        $response = $this->putJson("/api/v1/users/{$user->id}", [
            'name' => 'Updated Name',
            'status' => 'active',
        ]);

        $response->assertStatus(200);
        // Status must remain inactive for regular user
        $this->assertEquals('inactive', $user->fresh()->status);
        $this->assertEquals('Updated Name', $user->fresh()->name);
    }

    /** @test */
    public function s2_admin_can_modify_user_status()
    {
        $adminRole = Role::factory()->create(['name' => 'admin']);
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRole);

        $targetUser = User::factory()->create(['status' => 'inactive']);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/v1/users/{$targetUser->id}", [
            'status' => 'active',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('active', $targetUser->fresh()->status);
    }

    /** @test */
    public function s5_password_reset_revokes_all_active_personal_access_tokens()
    {
        $user = User::factory()->create([
            'email' => 'victim@example.com',
            'password_hash' => Hash::make('old-password'),
        ]);

        // Issue active tokens
        $token1 = $user->createToken('Device 1')->plainTextToken;
        $token2 = $user->createToken('Device 2')->plainTextToken;

        $this->assertCount(2, $user->fresh()->tokens);

        // Generate password reset token
        $resetToken = Password::createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $resetToken,
            'email' => 'victim@example.com',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ]);

        $response->assertStatus(200);
        $this->assertTrue(Hash::check('new-secure-password', $user->fresh()->password_hash));

        // Prior tokens must be completely deleted
        $this->assertCount(0, $user->fresh()->tokens);
    }
}
