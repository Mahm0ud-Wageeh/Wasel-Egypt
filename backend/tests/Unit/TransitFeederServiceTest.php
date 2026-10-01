<?php

namespace Tests\Unit;

use App\Services\Journey\TransitFeederService;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class TransitFeederServiceTest extends TestCase
{
    private TransitFeederService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TransitFeederService();
    }

    public function test_calculates_realistic_microbus_fares_based_on_distance(): void
    {
        $this->assertEquals(5.50, $this->service->calculateMicrobusFare(2000));
        $this->assertEquals(7.50, $this->service->calculateMicrobusFare(6000));
        $this->assertEquals(10.00, $this->service->calculateMicrobusFare(12000));
        $this->assertEquals(15.00, $this->service->calculateMicrobusFare(20000));
        $this->assertEquals(25.00, $this->service->calculateMicrobusFare(40000));
        $this->assertEquals(40.00, $this->service->calculateMicrobusFare(80000));
    }

    public function test_builds_first_mile_feeder_leg_with_accurate_metadata(): void
    {
        $departure = Carbon::parse('2026-10-01 08:00:00');
        $leg = $this->service->buildFeederLeg(
            30.0100, 31.1900,
            30.0260, 31.2080,
            'فيصل',
            'محطة مترو فيصل',
            $departure,
            'first_mile'
        );

        $this->assertEquals('transit', $leg['type']);
        $this->assertEquals('microbus', $leg['mode']);
        $this->assertEquals('فيصل', $leg['from_stop']['name']);
        $this->assertEquals('محطة مترو فيصل', $leg['to_stop']['name']);
        $this->assertGreaterThan(0, $leg['duration_sec']);
        $this->assertGreaterThan(0, $leg['fare']);
        $this->assertEquals('estimated', $leg['data_source']);
    }

    public function test_builds_last_mile_feeder_leg_with_accurate_metadata(): void
    {
        $departure = Carbon::parse('2026-10-01 08:30:00');
        $leg = $this->service->buildFeederLeg(
            30.0750, 31.2850,
            30.0820, 31.3000,
            'محطة الاستاد',
            'مدينة نصر',
            $departure,
            'last_mile'
        );

        $this->assertEquals('transit', $leg['type']);
        $this->assertEquals('microbus', $leg['mode']);
        $this->assertStringContainsString('مدينة نصر', $leg['to_stop']['name']);
        $this->assertEquals('last_mile', $leg['leg_steps'][0]['type'] === 'depart' ? 'last_mile' : '');
    }

    public function test_finds_regional_corridor_by_name_keywords(): void
    {
        $departure = Carbon::parse('2026-10-01 09:00:00');
        $plan = $this->service->findRegionalCorridor('الفيوم', 'ميدان الجيزة', $departure);

        $this->assertNotNull($plan);
        $this->assertCount(1, $plan['legs']);
        $this->assertEquals('microbus', $plan['legs'][0]['mode']);
        $this->assertEquals(40.0, $plan['fare']['amount']);
        $this->assertStringContainsString('الفيوم', $plan['summary_ar']);
    }

    public function test_finds_regional_corridor_by_coords(): void
    {
        $departure = Carbon::parse('2026-10-01 09:00:00');
        $plan = $this->service->findRegionalCorridorByCoords(
            29.3080, 30.8420,
            29.9810, 31.2110,
            $departure
        );

        $this->assertNotNull($plan);
        $this->assertNotEmpty($plan['legs']);
        $this->assertEquals('microbus', $plan['legs'][0]['mode']);
        $this->assertEquals(40.0, $plan['fare']['amount']);
    }
}

