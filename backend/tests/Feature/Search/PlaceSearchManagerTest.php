<?php

namespace Tests\Feature\Search;

use App\Services\Search\PlaceSearchManager;
use App\Services\Search\Providers\LocalVerifiedPlaceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlaceSearchManagerTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_verified_provider_finds_hospital_57357(): void
    {
        $provider = new LocalVerifiedPlaceProvider();
        $results = $provider->search('57357');

        $this->assertNotEmpty($results);
        $this->assertStringContainsString('57357', $results[0]['name']);
        $this->assertEquals('hospital', $results[0]['type']);
        $this->assertEquals('local_verified', $results[0]['source']);
    }

    public function test_local_verified_provider_finds_mall_of_arabia(): void
    {
        $provider = new LocalVerifiedPlaceProvider();
        $results = $provider->search('مول العرب');

        $this->assertNotEmpty($results);
        $this->assertStringContainsString('مول العرب', $results[0]['name']);
        $this->assertEquals('mall', $results[0]['type']);
    }

    public function test_local_verified_provider_finds_cairo_airport(): void
    {
        $provider = new LocalVerifiedPlaceProvider();
        $results = $provider->search('المطار');

        $this->assertNotEmpty($results);
        $this->assertStringContainsString('مطار القاهرة', $results[0]['name']);
        $this->assertEquals('airport', $results[0]['type']);
    }

    public function test_places_search_endpoint_returns_verified_places(): void
    {
        $response = $this->getJson('/api/v1/places/search?q=57357');

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $places = $response->json('data.places');
        $this->assertNotEmpty($places);
        $this->assertStringContainsString('57357', $places[0]['name']);
    }

    public function test_search_understand_endpoint_parses_natural_query(): void
    {
        $response = $this->postJson('/api/v1/search/understand', [
            'q' => 'أنا في فيصل وعايز أروح جامعة القاهرة من غير مترو',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $this->assertEquals('فيصل', $response->json('data.origin'));
        $this->assertEquals('جامعة القاهرة', $response->json('data.destination'));
        $this->assertContains('metro', $response->json('data.preferences.avoid_modes'));
    }
}
