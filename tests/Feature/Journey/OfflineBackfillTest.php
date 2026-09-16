<?php

namespace Tests\Feature\Journey;

use App\Models\DeviationEvent;
use App\Models\JourneyProgress;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Offline-queue backfill & retry idempotency.
 *
 * Contract:
 * - A ping carrying client_seq is recorded once; redelivery returns
 *   gap_ack.duplicate=true with no new row, no deviation, no regression.
 * - A ping older than the newest recorded ping (out-of-order retry / tunnel
 *   flush arriving late) is stored honestly (is_backfill) but never fires
 *   deviation and never regresses progress.
 * - The same off-route coordinates evaluated IN ORDER still deviate
 *   (backfill suppression must not mute genuine live deviations).
 */
class OfflineBackfillTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createJourneyNetwork();
        $this->user = User::factory()->create();
    }

    private function startRidingJourney(string $startTime = '07:30'): int
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', [
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'destination_lat' => $destination['lat'],
                'destination_lng' => $destination['lng'],
                'requested_at' => Carbon::today()->setTime(7, 30)->format('Y-m-d\TH:i'),
            ])
            ->assertStatus(201)
            ->json('data.id');

        return $this->actingAs($this->user)
            ->postJson("/api/v1/journeys/{$journeyId}/start", [
                'started_at' => Carbon::today()->setTimeFromTimeString($startTime)->format('Y-m-d\TH:i'),
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    private function sendLocation(int $activeJourneyId, array $body)
    {
        return $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeJourneyId}/location", $body);
    }

    private function boardAtOriginStop(int $activeJourneyId): void
    {
        $this->sendLocation($activeJourneyId, [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'recorded_at' => Carbon::today()->setTime(7, 31)->format('Y-m-d\TH:i'),
        ])->assertStatus(200);
    }

    /** @test */
    public function duplicate_client_seq_is_acknowledged_without_new_row_or_deviation()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        $body = [
            'latitude' => 30.0532,
            'longitude' => 31.2432,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
            'client_seq' => 7,
        ];

        $first = $this->sendLocation($activeId, $body)->assertStatus(200);
        $this->assertFalse((bool) $first->json('data.gap_ack.duplicate'));
        $this->assertEquals(7, $first->json('data.gap_ack.client_seq'));
        $rowsAfterFirst = JourneyProgress::where('active_journey_id', $activeId)->count();

        $second = $this->sendLocation($activeId, $body)->assertStatus(200);
        $this->assertTrue((bool) $second->json('data.gap_ack.duplicate'));
        $this->assertEquals(7, $second->json('data.gap_ack.client_seq'));
        $this->assertEquals(
            $rowsAfterFirst,
            JourneyProgress::where('active_journey_id', $activeId)->count(),
            'Redelivered seq must not create a second row.'
        );
        $this->assertEquals('active', $second->json('data.status'));
        $this->assertEquals(0, DeviationEvent::count());
    }

    /** @test */
    public function out_of_order_retry_does_not_fire_deviation_or_regress_progress()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        // Newer on-route ping first (becomes the newest recorded fix).
        $newer = $this->sendLocation($activeId, [
            'latitude' => 30.0532,
            'longitude' => 31.2432,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ])->assertStatus(200);
        $progressBefore = $newer->json('data.tracking.progress_percent');

        // Older off-route ping arrives late (tunnel-flush retry ordering).
        // Live, these coordinates would deviate — stale, they must not.
        $late = $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.2900,
            'recorded_at' => Carbon::today()->setTime(7, 35)->format('Y-m-d\TH:i'),
        ])->assertStatus(200);

        $this->assertTrue((bool) $late->json('data.gap_ack.backfill'));
        $this->assertFalse((bool) $late->json('data.gap_ack.duplicate'));
        $this->assertEquals('active', $late->json('data.status'));
        $this->assertNull($late->json('data.tracking.deviation'));
        $this->assertEquals(0, DeviationEvent::count());
        $this->assertEquals(
            $progressBefore,
            $late->json('data.tracking.progress_percent'),
            'Backfill must never regress live progress.'
        );
        $this->assertDatabaseHas('journey_progress', [
            'active_journey_id' => $activeId,
            'is_backfill' => true,
        ]);
    }

    /** @test */
    public function explicit_is_backfill_flag_skips_deviation_but_stores_row()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.2900,
            'recorded_at' => Carbon::today()->setTime(7, 52)->format('Y-m-d\TH:i'),
            'is_backfill' => true,
        ])->assertStatus(200);

        $this->assertTrue((bool) $response->json('data.gap_ack.backfill'));
        $this->assertEquals('active', $response->json('data.status'));
        $this->assertEquals(0, DeviationEvent::count());
        $this->assertDatabaseHas('journey_progress', [
            'active_journey_id' => $activeId,
            'is_backfill' => true,
        ]);
    }

    /** @test */
    public function fresh_off_route_ping_still_deviates_backfill_mutes_nothing_live()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.2900,
            'recorded_at' => Carbon::today()->setTime(7, 52)->format('Y-m-d\TH:i'),
        ]);

        $response->assertStatus(200);
        $this->assertEquals('deviated', $response->json('data.status'));
        $this->assertFalse((bool) $response->json('data.gap_ack.backfill'));
        $this->assertEquals(1, DeviationEvent::count());
    }
}
