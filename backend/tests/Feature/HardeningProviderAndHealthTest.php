<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Ai\AiProviderFactory;
use App\Services\Ai\Providers\MockTransitProvider;
use App\Services\Ai\Providers\OpenAiCompatibleProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Hardening pass: Groq rides the existing OpenAI-compatible provider
 * abstraction (key in environment secrets only — never code/git), and the
 * admin system-health endpoint reports real values without leaking secrets.
 */
class HardeningProviderAndHealthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\RolePermissionSeeder::class);
    }

    /** @test */
    public function groq_selects_the_openai_compatible_provider_with_groq_settings()
    {
        config()->set('ai.default', 'groq');
        config()->set('ai.providers.groq.base_url', 'https://api.groq.com/openai/v1');
        config()->set('ai.providers.groq.api_key', 'test-key-not-real');
        config()->set('ai.providers.groq.model', 'llama-3.3-70b-versatile');

        $provider = AiProviderFactory::make();

        $this->assertInstanceOf(OpenAiCompatibleProvider::class, $provider);
        $this->assertTrue($provider->isAvailable());
    }

    /** @test */
    public function groq_without_a_key_degrades_to_the_offline_mock_engine()
    {
        config()->set('ai.default', 'groq');
        config()->set('ai.providers.groq.api_key', null);

        $provider = AiProviderFactory::make();

        $this->assertInstanceOf(MockTransitProvider::class, $provider);
        $this->assertTrue($provider->isAvailable());
    }

    /** @test */
    public function system_health_requires_admin_and_never_leaks_ai_credentials()
    {
        $user = User::factory()->create();
        $admin = User::factory()->create();
        $admin->roles()->syncWithoutDetaching([\App\Models\Role::where('name', 'admin')->value('id')]);

        // Guest → unauthorized.
        $this->getJson('/api/v1/admin/analytics/system-health')->assertStatus(401);

        // Non-admin → forbidden (server-side authorization).
        $this->actingAs($user)
            ->getJson('/api/v1/admin/analytics/system-health')
            ->assertStatus(403);

        // Admin → real health snapshot, credentials never included.
        $response = $this->actingAs($admin)
            ->getJson('/api/v1/admin/analytics/system-health');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertArrayHasKey('network', $data);
        $this->assertArrayHasKey('ai', $data);
        $this->assertArrayHasKey('data_freshness', $data);

        $body = $response->getContent();
        $this->assertStringNotContainsString('api_key', $body);
        $this->assertStringNotContainsString('apiKey', $body);
        $this->assertSame(0, preg_match('/gsk_|sk-[A-Za-z0-9]{16,}/', $body));
    }
}
