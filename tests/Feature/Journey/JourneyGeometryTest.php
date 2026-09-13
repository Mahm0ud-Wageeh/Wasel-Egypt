<?php

namespace Tests\Feature\Journey;

use App\Models\User;
use App\Services\Journey\GeoCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Route geometry integrity: whatever the durations say, the returned journey
 * must geographically connect origin → legs → destination.
 *
 * Guarantees (project-model tolerances — fixture stops sit ~55 m apart, and
 * walking approach legs are capped well under the default walk budget):
 *  1. the first leg starts geographically close to the journey origin,
 *  2. the final leg ends geographically close to the journey destination,
 *  3. consecutive legs connect without unexplained jumps,
 *  4. leg geometry polylines (when present) start and end at that leg's own
 *     endpoints — walking geometry belongs to walking legs, transit geometry
 *     to the corresponding transit leg,
 *  5. legs are rendered in chronological order.
 */
class JourneyGeometryTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createJourneyNetwork();
        $this->user = User::factory()->create();

        // Seed the metro variant's real stored polyline (route_geometry) —
        // deliberately spanning BEYOND the A→C ride (a line tail before the
        // boarding stop and a line head after the alighting stop, exactly how
        // imported GTFS shapes cover the whole line). The planner must trim
        // the drawn geometry to the ridden segment A→C.
        \App\Models\RouteGeometry::create([
            'route_variant_id' => $this->metroVariant->id,
            'geometry' => [
                [$this->stopA->latitude - 0.02, $this->stopA->longitude],
                [$this->stopA->latitude, $this->stopA->longitude],
                [($this->stopA->latitude + $this->stopC->latitude) / 2, ($this->stopA->longitude + $this->stopC->longitude) / 2],
                [$this->stopC->latitude, $this->stopC->longitude],
                [$this->stopC->latitude + 0.02, $this->stopC->longitude],
            ],
            'length_meters' => 6400,
        ]);
    }

    private function searchOptions(array $overrides = []): array
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        $payload = array_merge([
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $destination['lat'],
            'destination_lng' => $destination['lng'],
            'requested_at' => \Carbon\Carbon::today()->setTime(7, 30)->format('Y-m-d\TH:i'),
            'alternatives' => 3,
        ], $overrides);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $payload);

        $response->assertStatus(200);

        return $response->json('data.options') ?? [];
    }

    /** @test */
    public function every_option_geographically_chains_origin_to_destination()
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        $options = $this->searchOptions();
        $this->assertNotEmpty($options, 'Fixture must produce at least one option.');

        foreach ($options as $oi => $option) {
            $legs = $option['legs'];
            $this->assertNotEmpty($legs, "Option $oi has no legs.");

            // 1) first leg starts near the journey origin
            $first = $legs[0];
            $startGap = GeoCalculator::distanceMeters(
                (float) $origin['lat'],
                (float) $origin['lng'],
                (float) $first['from_lat'],
                (float) $first['from_lng'],
            );
            $this->assertLessThanOrEqual(
                400.0,
                $startGap,
                "Option $oi first leg starts {$startGap} m from the origin."
            );

            // 2) final leg ends near the journey destination
            $last = $legs[count($legs) - 1];
            $endGap = GeoCalculator::distanceMeters(
                (float) $destination['lat'],
                (float) $destination['lng'],
                (float) $last['to_lat'],
                (float) $last['to_lng'],
            );
            $this->assertLessThanOrEqual(
                400.0,
                $endGap,
                "Option $oi final leg ends {$endGap} m from the destination."
            );

            // 3) consecutive legs connect without unexplained jumps
            for ($i = 0; $i < count($legs) - 1; $i++) {
                $gap = GeoCalculator::distanceMeters(
                    (float) $legs[$i]['to_lat'],
                    (float) $legs[$i]['to_lng'],
                    (float) $legs[$i + 1]['from_lat'],
                    (float) $legs[$i + 1]['from_lng'],
                );
                $this->assertLessThanOrEqual(
                    300.0,
                    $gap,
                    "Option {$oi} legs {$i}->" . ($i + 1) . " are {$gap} m apart — unexplained geometry jump."
                );
            }

            // 5) chronological ordering
            for ($i = 0; $i < count($legs) - 1; $i++) {
                $this->assertLessThanOrEqual(
                    (string) $legs[$i + 1]['departure_time'],
                    (string) $legs[$i]['departure_time'],
                    "Option $oi legs are not in chronological order at index $i."
                );
            }
        }
    }

    /** @test */
    public function leg_geometry_polylines_start_and_end_at_their_own_leg_endpoints()
    {
        $options = $this->searchOptions();
        $this->assertNotEmpty($options);

        $checked = 0;

        foreach ($options as $oi => $option) {
            foreach ($option['legs'] as $li => $leg) {
                $geometry = $leg['geometry'] ?? null;
                if (!is_array($geometry) || count($geometry) < 2) {
                    continue;
                }
                $checked++;

                // 4a) geometry belongs to its own leg: first point ≈ leg start
                $headGap = GeoCalculator::distanceMeters(
                    (float) $leg['from_lat'],
                    (float) $leg['from_lng'],
                    (float) $geometry[0][0],
                    (float) $geometry[0][1],
                );
                $this->assertLessThanOrEqual(
                    250.0,
                    $headGap,
                    "Option $oi leg $li ({$leg['type']}/{$leg['mode']}) geometry starts {$headGap} m from its from-endpoint."
                );

                // 4b) …and the last point ≈ leg end
                $tail = $geometry[count($geometry) - 1];
                $tailGap = GeoCalculator::distanceMeters(
                    (float) $leg['to_lat'],
                    (float) $leg['to_lng'],
                    (float) $tail[0],
                    (float) $tail[1],
                );
                $this->assertLessThanOrEqual(
                    250.0,
                    $tailGap,
                    "Option $oi leg $li ({$leg['type']}/{$leg['mode']}) geometry ends {$tailGap} m from its to-endpoint."
                );

                // Walking geometry only on walking legs (typed payload).
                $this->assertContains(
                    $leg['type'],
                    ['walking', 'transit'],
                    "Option $oi leg $li has an unknown leg type."
                );

                // 5) Full-line polylines are trimmed to the ridden segment:
                //    a transit leg between A and C must not carry the line's
                //    tail before A nor its head after C.
                if ($leg['type'] === 'transit' && is_array($geometry) && count($geometry) >= 2) {
                    $this->assertSame(
                        'route_geometry',
                        $leg['geometry_source'] ?? null,
                        "Option $oi leg $li should carry trimmed variant geometry."
                    );
                    $this->assertEqualsWithDelta(
                        (float) $leg['from_lat'],
                        (float) $geometry[0][0],
                        0.01,
                        "Option $oi leg $li geometry starts outside its boarding stop."
                    );
                    $this->assertEqualsWithDelta(
                        (float) $leg['from_lng'],
                        (float) $geometry[0][1],
                        0.01,
                        "Option $oi leg $li geometry starts outside its boarding stop (lng)."
                    );
                    $this->assertEqualsWithDelta(
                        (float) $leg['to_lat'],
                        (float) $geometry[count($geometry) - 1][0],
                        0.01,
                        "Option $oi leg $li geometry ends outside its alighting stop."
                    );
                }
            }
        }

        $this->assertGreaterThan(0, $checked, 'Fixture produced no leg geometries to validate.');
    }
}
