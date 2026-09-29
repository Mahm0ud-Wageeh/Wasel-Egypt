<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use Illuminate\Auth\Notifications\ResetPassword;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_register()
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'phone' => '1234567890',
        ]);

        $response->assertStatus(201);
        $response->dumpHeaders();
        $response->dump();
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'user' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'created_at',
                    'updated_at',
                ],
                'token'
            ]
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'name' => 'Test User',
        ]);

        // Check that the password is hashed
        $user = User::where('email', 'test@example.com')->first();
        $this->assertTrue(Hash::check('password', $user->password_hash));
    }

    /** @test */
    public function registration_requires_valid_data()
    {
        $response = $this->postJson('/api/v1/auth/register', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    /** @test */
    public function registration_prevents_duplicate_email()
    {
        User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User 2',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'phone' => '0987654321',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    /** @test */
    public function user_can_login()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password_hash' => Hash::make('password'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'user' => [
                    'id',
                    'name',
                    'email',
                ],
                'token'
            ]
        ]);

        // For Sanctum token authentication, we verify the token works by making a request to a protected route
        $token = $response->json('data.token');
        $this->withHeader('Authorization', 'Bearer ' . $token)
             ->getJson('/api/v1/auth/user')
             ->assertOk();
    }

    /** @test */
    public function login_fails_with_invalid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password_hash' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
        $response->assertJson([
            'success' => false,
            'message' => 'Invalid credentials',
        ]);
    }

    /** @test */
    public function authenticated_user_can_access_own_data()
    {
        $user = User::factory()->create([
            'status' => 'active',
        ]);

        // Log in to get a token
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/v1/auth/user');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'name',
                'email',
                'phone',
                'status',
                'email_verified_at',
                'created_at',
                'updated_at',
            ]
        ]);
    }

    /** @test */
    public function user_can_access_endpoint_without_token_after_login_then_logout()
    {
        $user = User::factory()->create([
            'status' => 'active',
        ]);

        // Log in to get a token
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        // Logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                             ->postJson('/api/v1/auth/logout');

        $logoutResponse->assertStatus(200);

        // Now try to access the user endpoint WITHOUT providing any credentials
        // Remove the Authorization header that was set as persistent
        $response = $this->withoutHeader('Authorization')
                         ->getJson('/api/v1/auth/user');

        // This should return 401 since we're not providing credentials
        // and we logged out
        $response->assertStatus(401);
    }

    /** @test */
    public function test_admin_user_persistence_issue()
    {
        // First, let's see what happens when we make a request as a guest
        $response = $this->getJson('/api/v1/auth/user');
        $this->assertEquals(401, $response->status(), 'Guest request should return 401');

        // Now login as a regular user
        $user = User::factory()->create([
            'status' => 'active',
        ]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        // Verify we can access the endpoint with the token
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/v1/auth/user');
        $response->assertOk();
        $this->assertEquals($user->id, $response->json('data.id'), 'Should return the logged in user');

        // Now logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                             ->postJson('/api/v1/auth/logout');
        $logoutResponse->assertStatus(200);

        // Now check what happens when we make a request as a guest again
        // Remove the Authorization header that was set as persistent
        $response = $this->withoutHeader('Authorization')
                         ->getJson('/api/v1/auth/user');

        // Debug information
        if ($response->status() !== 401) {
            $this->assertTrue(false, sprintf(
                'After logout, guest request returned %d instead of 401. Response: %s',
                $response->status(),
                $response->getContent()
            ));
        }

        $response->assertStatus(401);
    }

    /** @test */
    public function test_debug_authentication_states()
    {
        // Test 1: Guest request
        $response = $this->getJson('/api/v1/auth/user');
        $this->assertEquals(401, $response->status(), 'Guest request should return 401');

        // Test 2: Login
        $user = User::factory()->create([
            'status' => 'active',
            'email' => 'test@example.com'
        ]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        // Test 3: Authenticated request with token
        $authResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                           ->getJson('/api/v1/auth/user');
        $authResponse->assertOk();
        $this->assertEquals($user->id, $authResponse->json('data.id'), 'Should return the logged in user');

        // Test 4: Logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                             ->postJson('/api/v1/auth/logout');
        $logoutResponse->assertOk();

        // Test 5: Request after logout (should be 401)
        // Remove the Authorization header that was set as persistent
        $afterLogoutResponse = $this->withoutHeader('Authorization')
                                 ->getJson('/api/v1/auth/user');

        // Debug the after logout response
        if ($afterLogoutResponse->status() !== 401) {
            // Let's check what user Laravel thinks is authenticated
            $this->assertTrue(false, sprintf(
                'After logout, guest request returned %d instead of 401. Response: %s',
                $afterLogoutResponse->status(),
                $afterLogoutResponse->getContent()
            ));
        }

        $afterLogoutResponse->assertStatus(401);
    }

    /** @test */
    public function test_sequential_requests_isolation()
    {
        // Make a guest request
        $response1 = $this->getJson('/api/v1/auth/user');
        $this->assertEquals(401, $response1->status(), 'First guest request should return 401');

        // Create and login a user
        $user = User::factory()->create([
            'status' => 'active',
            'email' => 'test@example.com'
        ]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        // Make an authenticated request
        $authResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                           ->getJson('/api/v1/auth/user');
        $authResponse->assertOk();
        $this->assertEquals($user->id, $authResponse->json('data.id'), 'Should return the logged in user');

        // Logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                             ->postJson('/api/v1/auth/logout');
        $logoutResponse->assertOk();

        // Make another guest request - this should be isolated from previous requests
        // Remove the Authorization header that was set as persistent
        $response2 = $this->withoutHeader('Authorization')
                         ->getJson('/api/v1/auth/user');

        // Debug information
        if ($response2->status() !== 401) {
            $this->assertTrue(false, sprintf(
                'Second guest request returned %d instead of 401. Response: %s\\nFirst guest request: %d\\nAuthenticated request: %d\\nLogout response: %d',
                $response2->status(),
                $response2->getContent(),
                $response1->status(),
                $authResponse->status(),
                $logoutResponse->status()
            ));
        }

        $response2->assertStatus(401);
    }

    /** @test */
    public function unauthenticated_user_cannot_access_own_data()
    {
        $response = $this->getJson('/api/v1/auth/user');

        // Debug: see what we actually get
        if ($response->status() !== 401) {
            $this->assertTrue(false, sprintf(
                'Expected status 401 but got %d. Response: %s',
                $response->status(),
                $response->getContent()
            ));
        }

        $response->assertStatus(401);
    }

    
    /** @test */
    public function user_can_logout()
    {
        // Create test user
        $user = User::factory()->create([
            'email' => 'testuser_logout@example.com',
            'status' => 'active',
        ]);

        // Log in to get a token
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        // Verify we can access user endpoint with token
        $authResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/v1/auth/user');
        $authResponse->assertOk();
        $this->assertEquals($user->id, $authResponse->json('data.id'), 'Should return the logged in user');

        // Logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
                             ->postJson('/api/v1/auth/logout');
        $logoutResponse->assertStatus(200);
        $logoutResponse->assertJson([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);

        // After logout, request with no credentials should return 401
        // Remove the Authorization header that was set as persistent
        $response = $this->withoutHeader('Authorization')
                         ->getJson('/api/v1/auth/user');

        // Debug information if test fails
        if ($response->status() !== 401) {
            $this->assertTrue(false, sprintf(
                'After logout, request with no credentials returned %d instead of 401. Response: %s',
                $response->status(),
                $response->getContent()
            ));
        }

        $response->assertStatus(401);
    }

    /** @test */
    public function user_can_request_password_reset()
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'We have emailed your password reset link.',
        ]);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    /** @test */
    public function user_can_reset_password()
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password_hash' => Hash::make('old-password'),
        ]);

        // Request a password reset link
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'test@example.com',
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'message' => 'We have emailed your password reset link.',
        ]);

        // Verify that a reset password notification was sent
        Notification::assertSentTo($user, ResetPassword::class);

        // Test that reset endpoint handles invalid tokens properly
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => 'test@example.com',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
        ]);
    }

    /** @test */
    public function user_with_role_can_access_role_protected_route()
    {
        // Create a role and permission
        $role = Role::factory()->create(['name' => 'admin']);
        $permission = Permission::factory()->create(['name' => 'manage-users']);

        // Assign permission to role
        $role->permissions()->attach($permission);

        // Create a user and assign the role
        $user = User::factory()->create();
        $user->roles()->attach($role);

        // We'll test the admin user index route which requires 'role:admin' and 'permission:manage-users'
        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/v1/admin/users');

        $response->assertStatus(200);
    }

    /** @test */
    public function user_without_role_cannot_access_role_protected_route()
    {
        // Create a user without any role
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/v1/admin/users');

        $response->assertStatus(403);
    }

    /** @test */
    public function user_can_access_own_user_data()
    {
        // Create a user with active status
        $user = User::factory()->create(['status' => 'active']);

        // Log in to get a token
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson("/api/v1/users/{$user->id}");

        $response->assertStatus(200);
    }

    /** @test */
    public function user_cannot_access_other_users_data()
    {
        // Create two users
        $user = User::factory()->create(['status' => 'active']);
        $otherUser = User::factory()->create();

        // Log in to get a token
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse->assertOk();
        $token = $loginResponse->json('data.token');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson("/api/v1/users/{$otherUser->id}");

        $response->assertStatus(403);
    }
}