<?php

namespace Tests\Feature\Ai;

use App\Models\TransitStop;
use App\Models\User;
use App\Services\Ai\AiChatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AiTransitAssistantScenarioTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $operatorId = DB::table('transit_operators')->insertGetId([
            'name' => 'Cairo Metro',
            'code' => 'CM',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $govId = DB::table('governorates')->insertGetId([
            'name' => 'Cairo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $areaId = DB::table('areas')->insertGetId([
            'name' => 'Greater Cairo',
            'governorate_id' => $govId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('transit_stops')->insert([
            [
                'name' => 'Fayoum Bus Terminal',
                'latitude' => 29.3084,
                'longitude' => 30.8428,
                'area_id' => $areaId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Cairo University Station',
                'latitude' => 30.0268,
                'longitude' => 31.2059,
                'area_id' => $areaId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'October Hosary Stand',
                'latitude' => 29.9737,
                'longitude' => 30.9456,
                'area_id' => $areaId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Abbassiya Station',
                'latitude' => 30.0689,
                'longitude' => 31.2858,
                'area_id' => $areaId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /** @test */
    public function resolves_fayoum_to_cairo_university_colloquial_query()
    {
        /** @var AiChatService $service */
        $service = app(AiChatService::class);

        // Phase 20 exact scenario: "أنا في الفيوم وعايز أروح جامعة القاهرة بأقل تكلفة"
        $result = $service->handle([
            ['role' => 'user', 'content' => 'أنا في الفيوم وعايز أروح جامعة القاهرة بأقل تكلفة'],
        ], ['language' => 'ar']);

        $this->assertTrue($result['available']);
        $this->assertNotEmpty($result['reply']);
        $this->assertStringContainsString('المخطط', $result['reply']);

        $actions = $result['actions'];
        $this->assertNotEmpty($actions);

        $actionTypes = array_column($actions, 'type');
        $this->assertContains('set_origin', $actionTypes);
        $this->assertContains('set_destination', $actionTypes);
        $this->assertContains('plan_journey', $actionTypes);
    }

    /** @test */
    public function resolves_october_to_abbassiya_min_transfers_colloquial_query()
    {
        /** @var AiChatService $service */
        $service = app(AiChatService::class);

        // Phase 31 Scenario 5: "أروح من أكتوبر للعباسية إزاي بأقل تحويلات؟"
        $result = $service->handle([
            ['role' => 'user', 'content' => 'أروح من أكتوبر للعباسية إزاي بأقل تحويلات؟'],
        ], ['language' => 'ar']);

        $this->assertTrue($result['available']);
        $this->assertNotEmpty($result['reply']);

        $actions = $result['actions'];
        $actionTypes = array_column($actions, 'type');
        $this->assertContains('set_origin', $actionTypes);
        $this->assertContains('set_destination', $actionTypes);
        $this->assertContains('plan_journey', $actionTypes);
    }
}
