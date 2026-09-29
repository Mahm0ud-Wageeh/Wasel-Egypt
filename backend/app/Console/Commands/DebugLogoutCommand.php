<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DebugLogoutCommand extends Command
{
    protected $signature = 'debug:logout';
    protected $description = 'Debug logout functionality';

    public function handle()
    {
        // Clean up any existing test user
        User::where('email', 'like', 'test%@example.com')->forceDelete();

        // Create a test user
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test_' . time() . '@example.com',
            'password_hash' => Hash::make('password'),
            'phone' => '1234567890',
            'status' => 'active',
        ]);

        $this->info("Created user with ID: {$user->id}");

        // Login to get token
        $loginRequest = \Illuminate\Http\Request::create('/api/v1/auth/login', 'POST', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);
        $kernel = app(\Illuminate\Contracts\Http\Kernel::class);
        $loginResponse = $kernel->handle($loginRequest);

        $loginData = json_decode($loginResponse->getContent(), true);
        $token = $loginData['data']['token'] ?? null;

        $this->info("Login status: " . $loginResponse->getStatusCode());
        $this->info("Token generated: " . ($token ? '[REDACTED]' : 'NONE'));

        // Check token in DB before logout
        $hashedTokenBefore = hash('sha256', explode('|', $token, 2)[1] ?? $token);
        $tokenExistsBefore = $user->fresh()->tokens()->where('token', $hashedTokenBefore)->exists();
        $this->info("Token exists in DB before logout: " . ($tokenExistsBefore ? 'YES' : 'NO'));

        // Test accessing protected route before logout
        $checkRequestBefore = \Illuminate\Http\Request::create('/api/v1/auth/user', 'GET', [], [], [], [], null);
        $checkRequestBefore->headers->set('Authorization', 'Bearer ' . $token);
        $checkResponseBefore = $kernel->handle($checkRequestBefore);

        $this->info("Before logout - Access protected route status: " . $checkResponseBefore->getStatusCode());
        $this->info("Before logout - Access protected route body: " . $checkResponseBefore->getContent());

        // Test logout
        $logoutRequest = \Illuminate\Http\Request::create('/api/v1/auth/logout', 'POST', [], [], [], null);
        $logoutRequest->headers->set('Authorization', 'Bearer ' . $token);
        $logoutResponse = $kernel->handle($logoutRequest);

        $this->info("Logout status: " . $logoutResponse->getStatusCode());
        $this->info("Logout body: " . $logoutResponse->getContent());

        // Check token in DB after logout
        $hashedTokenAfter = hash('sha256', explode('|', $token, 2)[1] ?? $token);
        $tokenExistsAfter = $user->fresh()->tokens()->where('token', $hashedTokenAfter)->exists();
        $this->info("Token exists in DB after logout: " . ($tokenExistsAfter ? 'YES' : 'NO'));

        // Test accessing protected route after logout
        $checkRequestAfter = \Illuminate\Http\Request::create('/api/v1/auth/user', '', 'GET', [], [], [], [
            'Authorization' => 'Bearer ' . $token
        ]);
        $checkResponseAfter = $kernel->handle($checkRequestAfter);

        $this->info("After logout - Access protected route status: " . $checkResponseAfter->getStatusCode());
        $this->info("After logout - Access protected route body: " . $checkResponseAfter->getContent());

        // Cleanup
        $user->forceDelete();

        return 0;
    }
}
