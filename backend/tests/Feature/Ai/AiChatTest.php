<?php

namespace Tests\Feature\Ai;

use App\Models\Route;
use App\Models\ServiceAlert;
use App\Models\SystemConfig;
use App\Models\TransitMode;
use App\Models\TransitStop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AiChatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // The mock provider memoises stop/line lookups; keep tests isolated.
        Cache::flush();
    }

    private function seedNetwork(): void
    {
        $mode = TransitMode::factory()->create(['name' => 'Metro', 'icon' => 'subway']);

        TransitStop::factory()->create([
            'name' => 'Tahrir Square Metro',
            'latitude' => 30.0444,
            'longitude' => 31.2357,
        ]);
        TransitStop::factory()->create([
            'name' => 'Giza Metro',
            'latitude' => 30.0131,
            'longitude' => 31.2089,
        ]);

        Route::factory()->create([
            'short_name' => '1',
            'long_name' => 'Helwan — El Marg',
            'transit_mode_id' => $mode->id,
            'active' => true,
        ]);
    }

    public function test_line_lookup_prefers_metro_over_digit_matching_bus(): void
    {
        $this->seedNetwork();
        // A bus route whose short_name merely contains "1" must not win.
        $busMode = TransitMode::factory()->create(['name' => 'Bus', 'icon' => 'bus']);
        Route::factory()->create([
            'short_name' => 'CTA 1',
            'long_name' => 'Downtown Shuttle',
            'transit_mode_id' => $busMode->id,
            'active' => true,
        ]);
        $metro = Route::where('short_name', '1')->first();

        $response = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'Show line 1'],
        ]));

        $response->assertOk();
        $actions = collect($response->json('actions'));
        $this->assertEquals($metro->id, $actions->firstWhere('type', 'open_route')['params']['route_id']);
        $this->assertStringContainsString('Helwan', $response->json('reply'));
    }

    private function chatPayload(array $messages, array $extra = []): array
    {
        return array_merge([
            'messages' => $messages,
            'language' => 'en',
        ], $extra);
    }

    public function test_status_reports_mock_provider(): void
    {
        $response = $this->getJson('/api/v1/ai/status');

        $response->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('provider.id', 'mock')
            ->assertJsonPath('provider.simulated', true);
    }

    public function test_chat_plans_trip_from_real_stops(): void
    {
        $this->seedNetwork();
        $tahrir = TransitStop::where('name', 'Tahrir Square Metro')->first();
        $giza = TransitStop::where('name', 'Giza Metro')->first();

        $response = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'Take me from Tahrir to Giza'],
        ]));

        $response->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('provider.id', 'mock');

        $actions = collect($response->json('actions'));
        $this->assertEquals($tahrir->id, $actions->firstWhere('type', 'set_origin')['params']['stop_id']);
        $this->assertEquals($giza->id, $actions->firstWhere('type', 'set_destination')['params']['stop_id']);
        $this->assertNotNull($actions->firstWhere('type', 'open_planner'));
    }

    public function test_chat_understands_arabic_plan_request(): void
    {
        $this->seedNetwork();

        $response = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'من التحرير إلى الجيزة'],
        ], ['language' => 'ar']));

        $response->assertOk();
        $actions = collect($response->json('actions'));
        $this->assertNotNull($actions->firstWhere('type', 'set_origin'));
        $this->assertNotNull($actions->firstWhere('type', 'set_destination'));
        $this->assertStringContainsString('المخطط', $response->json('reply'));
    }

    public function test_chat_line_lookup_opens_real_route(): void
    {
        $this->seedNetwork();
        $route = Route::where('short_name', '1')->first();

        $response = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'Show line 1'],
        ]));

        $response->assertOk();
        $actions = collect($response->json('actions'));
        $openRoute = $actions->firstWhere('type', 'open_route');
        $this->assertNotNull($openRoute);
        $this->assertEquals($route->id, $openRoute['params']['route_id']);
        $this->assertStringContainsString('Helwan', $response->json('reply'));
    }

    public function test_chat_fare_intent_uses_real_tier_data(): void
    {
        $this->seedNetwork();
        SystemConfig::create([
            'config_key' => 'tfc_metro_fares',
            'config_value' => json_encode([
                'as_of' => '2024-10',
                'matrix' => ['1' => ['2' => 8, '3' => 10], '2' => ['3' => 15], '3' => ['4' => 20]],
            ]),
            'config_type' => 'json',
        ]);

        $response = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'How much is a metro ticket?'],
        ]));

        $response->assertOk();
        $this->assertNotNull(collect($response->json('actions'))->firstWhere('type', 'open_fare'));
        $this->assertStringContainsString('8', $response->json('reply'));
        $this->assertStringContainsString('20', $response->json('reply'));
    }

    public function test_chat_reports_active_alerts(): void
    {
        $this->seedNetwork();
        ServiceAlert::factory()->create([
            'header_text' => 'Signal maintenance on Line 2',
            'severity' => 'severe',
            'active_period_start' => now()->subHour(),
            'active_period_end' => now()->addDay(),
        ]);

        $response = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'any alerts right now?'],
        ]));

        $response->assertOk();
        $this->assertNotNull(collect($response->json('actions'))->firstWhere('type', 'show_alerts'));
        $this->assertStringContainsString('Signal maintenance', $response->json('reply'));
    }

    public function test_chat_nearby_requires_location_or_answers_with_it(): void
    {
        $this->seedNetwork();

        // Without a position the assistant asks for one honestly.
        $without = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'stops near me'],
        ]));
        $without->assertOk();
        $this->assertStringNotContainsString('Tahrir', $without->json('reply'));

        // With a position it answers with real stops and focuses the map.
        $with = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'stops near me'],
        ], ['lat' => 30.0445, 'lng' => 31.2358]));
        $with->assertOk();
        $this->assertStringContainsString('Tahrir', $with->json('reply'));
        $this->assertNotNull(collect($with->json('actions'))->firstWhere('type', 'focus_map_location'));
    }

    public function test_chat_rejects_assistant_ending_payload(): void
    {
        $response = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'assistant', 'content' => 'hello'],
        ]));

        $response->assertStatus(422);
    }

    public function test_chat_rejects_oversized_history(): void
    {
        $messages = [];
        for ($i = 0; $i < 20; $i++) {
            $messages[] = ['role' => 'user', 'content' => 'message '.$i];
        }

        $this->postJson('/api/v1/ai/chat', $this->chatPayload($messages))
            ->assertStatus(422);
    }

    public function test_disabled_provider_reports_unavailable(): void
    {
        config(['ai.default' => 'disabled']);

        $status = $this->getJson('/api/v1/ai/status');
        $status->assertOk()->assertJsonPath('available', false);

        $chat = $this->postJson('/api/v1/ai/chat', $this->chatPayload([
            ['role' => 'user', 'content' => 'hi'],
        ]));
        $chat->assertOk()->assertJsonPath('available', false);
    }

    public function test_remote_provider_without_key_falls_back_to_mock(): void
    {
        config(['ai.default' => 'openai', 'ai.providers.openai.api_key' => null]);

        $this->getJson('/api/v1/ai/status')
            ->assertOk()
            ->assertJsonPath('provider.id', 'mock');
    }
}
