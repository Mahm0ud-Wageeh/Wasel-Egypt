<?php

namespace Tests\Feature\Places;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PlaceSearchNormalizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed a sample area and transit stop
        $operatorId = DB::table('transit_operators')->insertGetId([
            'name' => 'Cairo Metro',
            'code' => 'CM',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $modeId = DB::table('transit_modes')->insertGetId([
            'name' => 'Metro',
            'code' => 'metro',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $govId = DB::table('governorates')->insertGetId([
            'name' => 'Cairo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $areaId = DB::table('areas')->insertGetId([
            'name' => 'Downtown',
            'governorate_id' => $govId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('transit_stops')->insert([
            [
                'name' => 'الشهداء (رمسيس)',
                'latitude' => 30.0614,
                'longitude' => 31.2497,
                'area_id' => $areaId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'الأهرام',
                'latitude' => 30.0901,
                'longitude' => 31.3262,
                'area_id' => $areaId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'جامعة القاهرة',
                'latitude' => 30.0268,
                'longitude' => 31.2059,
                'area_id' => $areaId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /** @test */
    public function searches_with_arabic_prefix_stripped_and_aliases()
    {
        Http::fake([
            'photon.komoot.io/*' => Http::response(['features' => []]),
        ]);

        // Search with "محطة رمسيس" -> should find "الشهداء (رمسيس)"
        $res1 = $this->getJson('/api/v1/places/search?q=' . urlencode('محطة رمسيس'));
        $res1->assertStatus(200);
        $stops1 = $res1->json('data.stops');
        $this->assertNotEmpty($stops1);
        $this->assertEquals('الشهداء (رمسيس)', $stops1[0]['name']);

        // Search with English typo "ramsis" -> alias maps to Shohadaa/Ramses
        $res2 = $this->getJson('/api/v1/places/search?q=ramsis');
        $res2->assertStatus(200);
        $stops2 = $res2->json('data.stops');
        $this->assertNotEmpty($stops2);
        $this->assertEquals('الشهداء (رمسيس)', $stops2[0]['name']);

        // Search with typo "الاهرام" (no hamza) -> wildcard matches "الأهرام"
        $res3 = $this->getJson('/api/v1/places/search?q=' . urlencode('الاهرام'));
        $res3->assertStatus(200);
        $stops3 = $res3->json('data.stops');
        $this->assertNotEmpty($stops3);
        $this->assertEquals('الأهرام', $stops3[0]['name']);

        // Search with typo "جامعه القاهره" (ta marbouta as ha) -> matches "جامعة القاهرة"
        $res4 = $this->getJson('/api/v1/places/search?q=' . urlencode('جامعه القاهره'));
        $res4->assertStatus(200);
        $stops4 = $res4->json('data.stops');
        $this->assertNotEmpty($stops4);
        $this->assertEquals('جامعة القاهرة', $stops4[0]['name']);
    }
}
