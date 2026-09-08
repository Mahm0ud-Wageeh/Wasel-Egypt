<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Abuse-protection regression: auth endpoints must be rate limited
 * (audit B1 — brute-force / credential-stuffing protection).
 */
class AuthRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        $credentials = ['email' => 'ghost@example.com', 'password' => 'wrong'];

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', $credentials)->assertStatus(401);
        }

        // 6th attempt within the same minute -> 429, not 401
        $this->postJson('/api/v1/auth/login', $credentials)->assertStatus(429);
    }

    public function test_register_is_rate_limited(): void
    {
        $payload = [
            'name' => 'Flood Bot',
            'email' => 'flood@example.com',
            'password' => 'Password123!',
        ];

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/register', $payload)->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/register', $payload)->assertStatus(429);
    }
}
