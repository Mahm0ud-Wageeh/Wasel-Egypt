<?php

namespace App\Services\Search\Providers;

use App\Services\Search\Contracts\PlaceSearchProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * GooglePlacesProvider
 *
 * Integrates Google Places API (Text Search) for global POI resolution in Egypt.
 * Key stays secure server-side; calls are bounded to Egyptian territory.
 */
class GooglePlacesProvider implements PlaceSearchProviderInterface
{
    private const EGYPT_BOUNDS = [
        'minLat' => 21.5,
        'maxLat' => 31.8,
        'minLng' => 24.5,
        'maxLng' => 37.0,
    ];

    public function name(): string
    {
        return 'google';
    }

    public function isAvailable(): bool
    {
        return !empty(config('services.google_places.key', env('GOOGLE_PLACES_API_KEY')));
    }

    public function search(string $query, ?float $biasLat = null, ?float $biasLng = null, int $limit = 6): array
    {
        $apiKey = config('services.google_places.key', env('GOOGLE_PLACES_API_KEY'));
        if (!$this->isAvailable() || empty($apiKey)) {
            return [];
        }

        try {
            $params = [
                'query' => $query,
                'key' => $apiKey,
                'language' => 'ar',
                'region' => 'eg',
            ];

            if ($biasLat !== null && $biasLng !== null) {
                $params['location'] = "{$biasLat},{$biasLng}";
                $params['radius'] = 25000; // 25km radius bias
            }

            $response = Http::timeout(4)
                ->get('https://maps.googleapis.com/maps/api/place/textsearch/json', $params);

            if (!$response->successful()) {
                Log::warning('Google Places API request failed', ['status' => $response->status()]);
                return [];
            }

            $data = $response->json();
            if (($data['status'] ?? '') !== 'OK' || empty($data['results'])) {
                return [];
            }

            $results = [];
            foreach ($data['results'] as $place) {
                $loc = $place['geometry']['location'] ?? null;
                if (!$loc) continue;

                $lat = (float) $loc['lat'];
                $lng = (float) $loc['lng'];

                // Bounded to Egyptian national territory
                if ($lat < self::EGYPT_BOUNDS['minLat'] || $lat > self::EGYPT_BOUNDS['maxLat'] ||
                    $lng < self::EGYPT_BOUNDS['minLng'] || $lng > self::EGYPT_BOUNDS['maxLng']) {
                    continue;
                }

                $types = $place['types'] ?? [];
                $primaryType = 'place';
                if (in_array('hospital', $types)) $primaryType = 'hospital';
                elseif (in_array('university', $types) || in_array('school', $types)) $primaryType = 'university';
                elseif (in_array('shopping_mall', $types)) $primaryType = 'mall';
                elseif (in_array('transit_station', $types) || in_array('subway_station', $types)) $primaryType = 'station';
                elseif (in_array('airport', $types)) $primaryType = 'airport';

                $results[] = [
                    'id' => 'gplace_' . ($place['place_id'] ?? md5($place['name'])),
                    'name' => $place['name'] ?? $query,
                    'detail' => $place['formatted_address'] ?? 'مصر',
                    'lat' => $lat,
                    'lng' => $lng,
                    'type' => $primaryType,
                    'source' => 'google_places',
                    'confidence' => 0.95,
                ];

                if (count($results) >= $limit) {
                    break;
                }
            }

            return $results;
        } catch (\Throwable $e) {
            Log::warning('Google Places exception: ' . $e->getMessage());
            return [];
        }
    }
}

