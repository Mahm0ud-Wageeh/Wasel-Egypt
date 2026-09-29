<?php

namespace Tests\Feature\Journey;

use App\Models\Area;
use App\Models\Governorate;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use Carbon\Carbon;

/**
 * Builds a small deterministic transit network for journey planning tests:
 *
 *   Metro route M1:  A (Tahrir) -> B (Opera) -> C (Garden City)
 *   Bus route  B1:   X (Ramses) -> B (Opera)
 *
 * Stop spacing is roughly 1.2 km between A/B and B/C, so origins placed
 * within ~100 m of a stop resolve to that stop with the default walk radius.
 */
trait CreatesJourneyNetwork
{
    protected TransitStop $stopA;
    protected TransitStop $stopB;
    protected TransitStop $stopC;
    protected TransitStop $stopX;
    protected ?TransitStop $stopW = null;
    protected ?TransitStop $stopY = null;
    protected RouteVariant $metroVariant;
    protected RouteVariant $busVariant;
    protected ?RouteVariant $busVariantW = null;
    protected ?RouteVariant $busVariant2 = null;

    protected function createJourneyNetwork(): void
    {
        $governorate = Governorate::create(['name' => 'Test Cairo', 'code' => 'TCA']);
        $area = Area::create(['governorate_id' => $governorate->id, 'name' => 'Test Downtown']);

        $metro = TransitMode::create(['name' => 'metro', 'description' => 'Metro', 'icon' => 'subway']);
        $bus = TransitMode::create(['name' => 'bus', 'description' => 'Bus', 'icon' => 'bus']);

        $operator = TransitOperator::create(['name' => 'Test CTA', 'short_code' => 'TCTA']);

        $this->stopA = $this->makeStop('Tahrir Square', 30.0440, 31.2350, $area);
        $this->stopB = $this->makeStop('Opera Square', 30.0530, 31.2430, $area);
        $this->stopC = $this->makeStop('Garden City', 30.0620, 31.2510, $area);
        $this->stopX = $this->makeStop('Ramses Station', 30.0640, 31.2410, $area);

        // Metro: A -> B -> C
        $metroRoute = Route::create([
            'transit_operator_id' => $operator->id,
            'transit_mode_id' => $metro->id,
            'short_name' => 'M1',
            'long_name' => 'Tahrir - Garden City Metro',
            'type' => 1,
            'active' => true,
        ]);

        $this->metroVariant = RouteVariant::create([
            'route_id' => $metroRoute->id,
            'name' => 'Trip M1 Outbound',
            'direction' => 'outbound',
            'headsign' => 'Garden City',
            'active' => true,
            'reliability_score' => 0.90,
        ]);

        foreach ([$this->stopA, $this->stopB, $this->stopC] as $index => $stop) {
            RouteStop::create([
                'route_variant_id' => $this->metroVariant->id,
                'transit_stop_id' => $stop->id,
                'sequence' => $index + 1,
            ]);
        }

        $this->createSchedule($this->metroVariant, 'M1T1', [
            $this->stopA->id => ['08:00:00', '08:00:00'],
            $this->stopB->id => ['08:10:00', '08:10:00'],
            $this->stopC->id => ['08:20:00', '08:20:00'],
        ]);

        // Bus: X -> B
        $busRoute = Route::create([
            'transit_operator_id' => $operator->id,
            'transit_mode_id' => $bus->id,
            'short_name' => 'B1',
            'long_name' => 'Ramses - Opera Bus',
            'type' => 3,
            'active' => true,
        ]);

        $this->busVariant = RouteVariant::create([
            'route_id' => $busRoute->id,
            'name' => 'Trip B1 Outbound',
            'direction' => 'outbound',
            'headsign' => 'Opera Square',
            'active' => true,
            'reliability_score' => 0.70,
        ]);

        foreach ([$this->stopX, $this->stopB] as $index => $stop) {
            RouteStop::create([
                'route_variant_id' => $this->busVariant->id,
                'transit_stop_id' => $stop->id,
                'sequence' => $index + 1,
            ]);
        }

        $this->createSchedule($this->busVariant, 'B1T1', [
            $this->stopX->id => ['08:08:00', '08:08:00'],
            $this->stopB->id => ['08:18:00', '08:18:00'],
        ]);
    }

    private function makeStop(string $name, float $lat, float $lng, Area $area): TransitStop
    {
        return TransitStop::create([
            'gtfs_stop_id' => 'GTFS_'.md5($name),
            'name' => $name,
            'latitude' => $lat,
            'longitude' => $lng,
            'area_id' => $area->id,
            'wheelchair_accessible' => true,
        ]);
    }

    private function createSchedule(RouteVariant $variant, string $tripId, array $timesByStopId): Schedule
    {
        $schedule = Schedule::create([
            'route_variant_id' => $variant->id,
            'gtfs_trip_id' => $tripId,
            'service_id' => 'SVC_'.$tripId,
            'direction_id' => 0,
            'headsign' => $variant->headsign,
            'wheelchair_accessible' => true,
            'start_date' => '2026-01-01',
            'end_date' => '2030-12-31',
            'is_active' => true,
        ]);

        $sequence = 1;
        foreach ($timesByStopId as $stopId => [$arrival, $departure]) {
            StopTime::create([
                'schedule_id' => $schedule->id,
                'transit_stop_id' => $stopId,
                'sequence' => $sequence++,
                'arrival_time' => $arrival,
                'departure_time' => $departure,
            ]);
        }

        return $schedule;
    }

    /**
     * Coordinates ~60-70 m from the given stop (inside the walk radius).
     */
    protected function nearStop(TransitStop $stop, float $latOffset = 0.0005, float $lngOffset = 0.0005): array
    {
        return [
            'lat' => (float) $stop->latitude + $latOffset,
            'lng' => (float) $stop->longitude + $lngOffset,
        ];
    }

    /**
     * Extend network with stops and connecting services to form a deterministic
     * 2-transfer journey: BW (W->B) -> M1 (B->C) -> B2 (C->Y).
     * Stops W and Y are placed ~4-5 km away from B/C so walking is impossible.
     */
    protected function createTwoTransferExtension(): void
    {
        $area = Area::first();
        $bus = TransitMode::where('name', 'bus')->first();
        $operator = TransitOperator::first();

        // Far-north origin stop (~4 km from stopB/stopC, well outside walk radius)
        $this->stopW = $this->makeStop('Shoubra Terminal', 30.0900, 31.2400, $area);
        // Far-east destination stop (~5 km from stopB/stopC, well outside walk radius)
        $this->stopY = $this->makeStop('New Cairo Terminal', 30.0950, 31.2850, $area);

        // Variant 1 (Bus BW): stopW -> stopB
        $busRouteW = Route::create([
            'transit_operator_id' => $operator->id,
            'transit_mode_id' => $bus->id,
            'short_name' => 'BW',
            'long_name' => 'Shoubra - Opera Bus',
            'type' => 3,
            'active' => true,
        ]);
        $this->busVariantW = RouteVariant::create([
            'route_id' => $busRouteW->id,
            'name' => 'Trip BW Outbound',
            'direction' => 'outbound',
            'headsign' => 'Opera Square',
            'active' => true,
            'reliability_score' => 0.85,
        ]);
        foreach ([$this->stopW, $this->stopB] as $index => $stop) {
            RouteStop::create([
                'route_variant_id' => $this->busVariantW->id,
                'transit_stop_id' => $stop->id,
                'sequence' => $index + 1,
            ]);
        }
        $this->createSchedule($this->busVariantW, 'BWT1', [
            $this->stopW->id => ['08:02:00', '08:02:00'],
            $this->stopB->id => ['08:12:00', '08:12:00'],
        ]);

        // Second trip on Metro M1 connecting with BW at stopB
        $this->createSchedule($this->metroVariant, 'M1T2', [
            $this->stopA->id => ['08:05:00', '08:05:00'],
            $this->stopB->id => ['08:15:00', '08:15:00'],
            $this->stopC->id => ['08:25:00', '08:25:00'],
        ]);

        // Variant 3 (Bus B2): stopC -> stopY
        $busRoute2 = Route::create([
            'transit_operator_id' => $operator->id,
            'transit_mode_id' => $bus->id,
            'short_name' => 'B2',
            'long_name' => 'Garden City - New Cairo Bus',
            'type' => 3,
            'active' => true,
        ]);
        $this->busVariant2 = RouteVariant::create([
            'route_id' => $busRoute2->id,
            'name' => 'Trip B2 Outbound',
            'direction' => 'outbound',
            'headsign' => 'New Cairo Terminal',
            'active' => true,
            'reliability_score' => 0.80,
        ]);
        foreach ([$this->stopC, $this->stopY] as $index => $stop) {
            RouteStop::create([
                'route_variant_id' => $this->busVariant2->id,
                'transit_stop_id' => $stop->id,
                'sequence' => $index + 1,
            ]);
        }
        $this->createSchedule($this->busVariant2, 'B2T1', [
            $this->stopC->id => ['08:30:00', '08:30:00'],
            $this->stopY->id => ['08:45:00', '08:45:00'],
        ]);
    }
}
