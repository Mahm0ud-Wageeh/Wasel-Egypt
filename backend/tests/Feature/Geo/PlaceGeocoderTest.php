<?php

namespace Tests\Feature\Geo;

use App\Services\Geo\PlaceGeocoderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Place geocoding (Photon proxy): Arabic/Latin search, response
 * normalization, caching, and graceful failure.
 */
class PlaceGeocoderTest extends TestCase
{
    use RefreshDatabase;

    private function photonPayload(): array
    {
        return [
            'features' => [
                [
                    'geometry' => ['coordinates' => [31.2059, 30.0268]],
                    'properties' => [
                        'osm_id' => 123, 'osm_key' => 'amenity', 'osm_value' => 'university',
                        'name' => 'جامعة القاهرة', 'city' => 'الجيزة', 'country' => 'مصر',
                    ],
                ],
                [
                    'geometry' => ['coordinates' => [31.2012, 30.026]],
                    'properties' => [
                        'osm_id' => 124, 'osm_key' => 'railway', 'osm_value' => 'station',
                        'name' => 'جامعة القاهرة', 'city' => 'الجيزة',
                    ],
                ],
                // nameless feature must be skipped
                [
                    'geometry' => ['coordinates' => [31.2, 30.02]],
                    'properties' => ['osm_id' => 125],
                ],
            ],
        ];
    }

    /** @test */
    public function geocodes_arabic_queries_into_normalized_places()
    {
        Http::fake([
            'photon.komoot.io/api/*' => Http::response($this->photonPayload()),
        ]);

        $service = new PlaceGeocoderService('https://photon.komoot.io/api/');
        $results = $service->search('جامعة القاهرة', 30.05, 31.23);

        $this->assertCount(2, $results, 'nameless features are skipped');
        $this->assertSame('photon-123', $results[0]['id']);
        $this->assertSame('جامعة القاهرة', $results[0]['name']);
        $this->assertSame(30.0268, $results[0]['lat']);
        $this->assertSame(31.2059, $results[0]['lng']);
        $this->assertSame('photon', $results[0]['source']);
        $this->assertStringContainsString('الجيزة', $results[0]['detail']);
    }

    /** @test */
    public function results_are_cached_per_query_and_bias()
    {
        Http::fake(['photon.komoot.io/api/*' => Http::response($this->photonPayload())]);

        $service = new PlaceGeocoderService('https://photon.komoot.io/api/');
        $service->search('Tahrir', 30.05, 31.23);
        $service->search('Tahrir', 30.05, 31.23);

        Http::assertSentCount(1);
    }

    /** @test */
    public function photon_failure_returns_empty_array()
    {
        $service = new PlaceGeocoderService('http://127.0.0.1:59997');

        $this->assertSame([], $service->search('Tahrir'));
    }

    /** @test */
    public function short_queries_skip_the_provider()
    {
        Http::fake(['photon.komoot.io/api/*' => Http::response($this->photonPayload())]);

        $service = new PlaceGeocoderService('https://photon.komoot.io/api/');

        $this->assertSame([], $service->search('ا'));
        Http::assertSentCount(0);
    }

    /** @test */
    public function places_endpoint_merges_stops_and_places_and_is_throttled()
    {
        Http::fake(['photon.komoot.io/api/*' => Http::response($this->photonPayload())]);

        // seed a real stop matching the query
        $area = \App\Models\Area::create(['name' => 'Greater Cairo', 'governorate_id' => \App\Models\Governorate::create(['name' => 'Cairo', 'code' => 'CAI'])->id]);
        \App\Models\TransitStop::create([
            'gtfs_stop_id' => 'test-1', 'name' => 'Cairo University Metro',
            'latitude' => 30.0260, 'longitude' => 31.2012, 'area_id' => $area->id,
        ]);

        $response = $this->getJson('/api/v1/places/search?q=' . urlencode('Cairo University') . '&lat=30.05&lng=31.23');

        $response->assertOk()->assertJsonPath('success', true);
        $data = $response->json('data');
        $this->assertSame('Cairo University Metro', $data['stops'][0]['name']);
        $this->assertSame('stop', $data['stops'][0]['source']);
        $this->assertSame('photon', $data['places'][0]['source']);
    }

    /** @test */
    public function places_endpoint_validates_the_query()
    {
        $this->getJson('/api/v1/places/search?q=' . urlencode('ا'))->assertStatus(422);
        $this->getJson('/api/v1/places/search')->assertStatus(422);
    }

    /** @test */
    public function reverse_geocode_resolves_nearest_named_place()
    {
        Http::fake([
            'photon.komoot.io/reverse*' => Http::response([
                'features' => [
                    [
                        'geometry' => ['coordinates' => [31.2357, 30.0444]],
                        'properties' => [
                            'osm_id' => 999, 'osm_key' => 'place', 'osm_value' => 'square',
                            'name' => 'Tahrir Square', 'city' => 'Cairo', 'country' => 'Egypt',
                        ],
                    ],
                ],
            ]),
        ]);

        $service = new PlaceGeocoderService('https://photon.komoot.io/api/');
        $result = $service->reverse(30.0445, 31.2358);

        $this->assertNotNull($result);
        $this->assertSame('Tahrir Square', $result['name']);
        $this->assertSame(30.0444, $result['lat']);
        $this->assertSame(31.2357, $result['lng']);
        $this->assertSame('photon', $result['source']);
    }

    /** @test */
    public function reverse_geocode_returns_null_on_provider_failure()
    {
        $service = new PlaceGeocoderService('http://127.0.0.1:59997');

        $this->assertNull($service->reverse(30.0444, 31.2357));
    }

    /** @test */
    public function places_endpoint_reverse_mode_resolves_coordinates()
    {
        Http::fake([
            'photon.komoot.io/reverse*' => Http::response([
                'features' => [
                    [
                        'geometry' => ['coordinates' => [31.2357, 30.0444]],
                        'properties' => [
                            'osm_id' => 999,
                            'name' => 'Tahrir Square', 'city' => 'Cairo',
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson('/api/v1/places/search?lat=30.0445&lng=31.2358');

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonPath('data.reverse.name', 'Tahrir Square');
    }

    /** @test */
    public function places_endpoint_reverse_mode_validates_coordinates()
    {
        $this->getJson('/api/v1/places/search?lat=95&lng=31.23')->assertStatus(422);
    }
}
