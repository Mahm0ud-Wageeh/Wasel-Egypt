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
    protected RouteVariant $metroVariant;
    protected RouteVariant $busVariant;

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
            $this->stopX->id => ['08:05:00', '08:05:00'],
            $this->stopB->id => ['08:15:00', '08:15:00'],
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
            'start_date' => Carbon::today()->subDay()->toDateString(),
            'end_date' => Carbon::today()->addDay()->toDateString(),
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
}
