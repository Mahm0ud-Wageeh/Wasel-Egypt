<?php

namespace Tests\Feature\Ai;

use App\Models\Governorate;
use App\Models\Area;
use App\Models\Route;
use App\Models\TransitMode;
use App\Models\TransitStop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * AI grounding verification: Egyptian Arabic and MSA prompts about the
 * Fayoum network must resolve to the real Fayoum stops (via the Arabic
 * name hints) and never to unrelated Greater-Cairo street names that
 * merely contain the word. Fare answers must come only from the real TfC
 * matrix and stay honest about demo/estimated data.
 */
class FayoumGroundingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        $fayoum = Governorate::firstOrCreate(['name' => 'Faiyum'], ['code' => 'FYM']);
        $area = Area::firstOrCreate(['name' => 'Fayoum', 'governorate_id' => $fayoum->id]);

        $mode = TransitMode::factory()->create(['name' => 'Metro', 'icon' => 'subway']);
        $giza = TransitStop::factory()->create([
            'name' => 'Giza',
            'latitude' => 30.0131,
            'longitude' => 31.2089,
            'area_id' => $area->id,
        ]);

        // A Greater Cairo street whose name contains "Fayoum" — the decoy
        // the resolver must NOT pick when the user means the governorate.
        TransitStop::factory()->create([
            'name' => 'Al Fayoum Rd.',
            'latitude' => 30.05,
            'longitude' => 31.23,
            'area_id' => $area->id,
        ]);

        // The real Fayoum pack stops (subset).
        TransitStop::factory()->create([
            'name' => 'Fayoum Bus Terminal',
            'gtfs_stop_id' => 'fayoum:terminal',
            'latitude' => 29.3084,
            'longitude' => 30.8428,
            'area_id' => $area->id,
        ]);

        Route::factory()->create([
            'short_name' => '1',
            'long_name' => 'Helwan — El Marg',
            'transit_mode_id' => $mode->id,
            'active' => true,
        ]);

        // Real TfC tier data so fare answers are grounded.
        \App\Models\SystemConfig::create([
            'config_key' => 'tfc_metro_fares',
            'config_value' => json_encode([
                'as_of' => '2024-10',
                'matrix' => ['1' => ['2' => 8, '3' => 15], '2' => ['1' => 8, '3' => 10], '3' => ['1' => 15, '2' => 10]],
            ]),
            'config_type' => 'json',
        ]);
    }

    private function chat(string $message): array
    {
        return $this->postJson('/api/v1/ai/chat', [
            'messages' => [['role' => 'user', 'content' => $message]],
            'language' => 'ar',
        ])->assertOk()->json();
    }

    /** @test */
    public function egyptian_arabic_fayoum_giza_plans_from_the_real_terminal()
    {
        $res = $this->chat('عايز أروح من الفيوم للجيزة');

        $origin = collect($res['actions'])->firstWhere('type', 'set_origin');
        $this->assertNotNull($origin, 'set_origin action missing');
        $this->assertSame('Fayoum Bus Terminal', $origin['params']['name']);

        $destination = collect($res['actions'])->firstWhere('type', 'set_destination');
        $this->assertSame('Giza', $destination['params']['name']);
    }

    /** @test */
    public function msa_fayoum_cairo_resolves_terminal_not_the_decoy_street()
    {
        $res = $this->chat('من الفيوم إلى القاهرة');

        $origin = collect($res['actions'])->firstWhere('type', 'set_origin');
        $this->assertNotNull($origin);
        $this->assertSame('Fayoum Bus Terminal', $origin['params']['name']);
        $this->assertStringNotContainsString('Al Fayoum Rd', $res['reply']);
    }

    /** @test */
    public function arabic_fare_answer_is_grounded_in_real_tfc_tiers_and_labels_demo_data()
    {
        $res = $this->chat('الأجرة كام؟');

        $this->assertStringContainsString('8', $res['reply']);
        $this->assertStringContainsString('15', $res['reply']);
        $this->assertStringContainsString('تقديرية', $res['reply']); // demo honesty label
        $this->assertNotNull(collect($res['actions'])->firstWhere('type', 'open_fare'));
    }

    /** @test */
    public function arabic_prompts_without_a_journey_get_the_honest_help_reply()
    {
        foreach (['أنا وصلت فين؟', 'المحطة الجاية إيه؟', 'أنا فوت المحطة'] as $msg) {
            $res = $this->chat($msg);
            // No fabricated stop/times: the help reply offers capabilities.
            $this->assertStringContainsString('واصل', $res['reply']);
            $this->assertStringNotContainsString('Fayoum', $res['reply']);
        }
    }
}
