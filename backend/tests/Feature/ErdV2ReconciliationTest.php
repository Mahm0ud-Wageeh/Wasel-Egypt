<?php

namespace Tests\Feature;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\IncidentReport;
use App\Models\IncidentVote;
use App\Models\Journey;
use App\Models\JourneyLeg;
use App\Models\JourneyTrack;
use App\Models\Route;
use App\Models\RouteGeometry;
use App\Models\RouteVariant;
use App\Models\Transfer;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ErdV2ReconciliationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private TransitMode $metroMode;
    private TransitOperator $operator;
    private TransitStop $stopA;
    private TransitStop $stopB;
    private TransitStop $parentStation;
    private Route $route;
    private RouteVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->metroMode = TransitMode::create([
            'code' => 'metro',
            'name' => 'Metro',
            'name_ar' => 'مترو',
            'color' => '#E11D48',
            'active' => true,
        ]);

        $this->operator = TransitOperator::create([
            'code' => 'CMA',
            'name' => 'Cairo Metro Authority',
            'name_ar' => 'شركة مترو القاهرة',
            'active' => true,
        ]);

        $this->parentStation = TransitStop::create([
            'gtfs_stop_id' => 'cairo:station:sadat',
            'name' => 'Sadat Station Hub',
            'name_ar' => 'محطة السادات التبادلية',
            'latitude' => 30.0444,
            'longitude' => 31.2357,
            'is_interchange' => true,
            'active' => true,
        ]);

        $this->stopA = TransitStop::create([
            'gtfs_stop_id' => 'cairo:metro:l1:sadat',
            'name' => 'Sadat (Line 1)',
            'name_ar' => 'السادات الخط 1',
            'latitude' => 30.0444,
            'longitude' => 31.2357,
            'parent_station_id' => $this->parentStation->id,
            'is_interchange' => true,
            'active' => true,
        ]);

        $this->stopB = TransitStop::create([
            'gtfs_stop_id' => 'cairo:metro:l2:sadat',
            'name' => 'Sadat (Line 2)',
            'name_ar' => 'السادات الخط 2',
            'latitude' => 30.0445,
            'longitude' => 31.2358,
            'parent_station_id' => $this->parentStation->id,
            'is_interchange' => true,
            'active' => true,
        ]);

        $this->route = Route::create([
            'gtfs_route_id' => 'cairo:metro:l1',
            'transit_mode_id' => $this->metroMode->id,
            'operator_id' => $this->operator->id,
            'short_name' => 'M1',
            'long_name' => 'Line 1',
            'long_name_ar' => 'الخط الأول',
            'color' => '#E11D48',
            'active' => true,
        ]);

        $this->variant = RouteVariant::create([
            'route_id' => $this->route->id,
            'direction' => 'outbound',
            'name' => 'Line 1 Outbound',
            'name_ar' => 'الخط الأول اتجاه المرج',
            'headsign' => 'New El-Marg',
            'reliability_score' => 0.98,
            'active' => true,
        ]);

        RouteGeometry::create([
            'route_variant_id' => $this->variant->id,
            'shape' => json_encode([[30.0444, 31.2357], [30.0531, 31.2398]]),
            'point_count' => 2,
        ]);
    }

    /** @test */
    public function incident_report_can_be_created_and_voted_on_once_per_user()
    {
        Sanctum::actingAs($this->user);

        // 1. Create incident report
        $res = $this->postJson('/api/v1/incidents', [
            'transit_stop_id' => $this->stopA->id,
            'kind' => 'delay',
            'severity' => 'med',
            'description' => 'Crowded platform at Sadat Station due to train delay',
        ]);

        $res->assertStatus(201);
        $reportId = $res->json('data.id');
        $this->assertNotNull($reportId);

        // 2. Vote 'confirm' on the report
        $voteRes = $this->postJson("/api/v1/incidents/{$reportId}/vote", [
            'vote' => 'confirm',
        ]);

        $voteRes->assertOk();
        $voteRes->assertJsonPath('data.confirms', 1);
        $voteRes->assertJsonPath('data.denies', 0);

        // 3. Second vote from the same user is rejected (409 Conflict)
        $secondVoteRes = $this->postJson("/api/v1/incidents/{$reportId}/vote", [
            'vote' => 'confirm',
        ]);

        $secondVoteRes->assertStatus(409);

        // 4. Another user can vote 'deny'
        $otherUser = User::factory()->create();
        Sanctum::actingAs($otherUser);

        $otherVoteRes = $this->postJson("/api/v1/incidents/{$reportId}/vote", [
            'vote' => 'deny',
        ]);

        $otherVoteRes->assertOk();
        $otherVoteRes->assertJsonPath('data.confirms', 1);
        $otherVoteRes->assertJsonPath('data.denies', 1);

        $report = IncidentReport::find($reportId);
        $this->assertSame(1, $report->confirms);
        $this->assertSame(1, $report->denies);
    }

    /** @test */
    public function route_variant_shape_endpoint_returns_geojson_and_points()
    {
        $res = $this->getJson("/api/v1/route-variants/{$this->variant->id}/geometry");

        $res->assertOk();
        $res->assertJsonPath('data.route_variant_id', $this->variant->id);
        $res->assertJsonPath('data.points', 2);
        $res->assertJsonPath('data.geojson.type', 'Feature');
        $res->assertJsonPath('data.geojson.geometry.type', 'LineString');
    }

    /** @test */
    public function station_interchange_transfers_link_parent_and_platform_stops()
    {
        Transfer::create([
            'from_stop_id' => $this->stopA->id,
            'to_stop_id' => $this->stopB->id,
            'min_transfer_time_s' => 120,
            'distance_m' => 80,
            'is_accessible' => true,
        ]);

        $this->assertDatabaseHas('transfers', [
            'from_stop_id' => $this->stopA->id,
            'to_stop_id' => $this->stopB->id,
            'min_transfer_time_s' => 120,
        ]);

        $this->assertSame($this->parentStation->id, $this->stopA->parent_station_id);
        $this->assertSame($this->parentStation->id, $this->stopB->parent_station_id);
    }

    /** @test */
    public function ai_chat_writes_ai_conversations_and_messages_with_tokens()
    {
        Sanctum::actingAs($this->user);

        $res = $this->postJson('/api/v1/ai/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'How do I get to Sadat station?'],
            ],
            'language' => 'en',
        ]);

        $res->assertOk();

        $conversation = AiConversation::where('user_id', $this->user->id)->first();
        $this->assertNotNull($conversation);

        $userMsg = AiMessage::where('ai_conversation_id', $conversation->id)
            ->where('role', 'user')
            ->first();

        $this->assertNotNull($userMsg);
        $this->assertGreaterThan(0, $userMsg->tokens_in);
    }

    /** @test */
    public function journeys_store_and_expose_gps_and_walk_legs()
    {
        $journey = Journey::create([
            'user_id' => $this->user->id,
            'origin_stop_id' => $this->stopA->id,
            'dest_stop_id' => $this->stopB->id,
            'origin_lat' => 30.0440,
            'origin_lng' => 31.2350,
            'dest_lat' => 30.0450,
            'dest_lng' => 31.2360,
            'total_fare' => 8.0,
            'status' => 'completed',
        ]);

        $walkLeg = JourneyLeg::create([
            'journey_id' => $journey->id,
            'sequence' => 1,
            'leg_type' => 'walk',
            'from_lat' => 30.0440,
            'from_lng' => 31.2350,
            'to_lat' => 30.0444,
            'to_lng' => 31.2357,
            'distance_m' => 80,
            'fare' => 0.0,
        ]);

        $transitLeg = JourneyLeg::create([
            'journey_id' => $journey->id,
            'sequence' => 2,
            'leg_type' => 'transit',
            'transit_mode_id' => $this->metroMode->id,
            'route_variant_id' => $this->variant->id,
            'from_stop_id' => $this->stopA->id,
            'to_stop_id' => $this->stopB->id,
            'distance_m' => 1200,
            'fare' => 8.0,
        ]);

        $this->assertSame('walk', $walkLeg->leg_type);
        $this->assertSame('walk', $walkLeg->mode);
        $this->assertSame('transit', $transitLeg->leg_type);
        $this->assertSame('metro', $transitLeg->mode);
        $this->assertSame(2, $journey->total_legs);
    }
}
