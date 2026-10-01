<?php

namespace App\Services\Search;

use App\Services\Search\Contracts\PlaceSearchProviderInterface;
use App\Services\Search\Providers\GooglePlacesProvider;
use App\Services\Search\Providers\LocalVerifiedPlaceProvider;
use App\Services\Search\Providers\PhotonPlaceProvider;
use Illuminate\Support\Facades\Cache;

/**
 * PlaceSearchManager
 *
 * Tiered hybrid search coordinator for Egyptian places:
 * 1. LocalVerifiedPlaceProvider (Verified national POIs + imported transit stations)
 * 2. GooglePlacesProvider (Commercial global POI search, if configured)
 * 3. PhotonPlaceProvider (OSM open geocoding, Egyptian bounding box)
 *
 * Features spatial deduplication (<80m), result caching, and strict bounds filtering.
 */
class PlaceSearchManager
{
    /** @var PlaceSearchProviderInterface[] */
    private array $providers;

    public function __construct(
        LocalVerifiedPlaceProvider $localProvider,
        GooglePlacesProvider $googleProvider,
        PhotonPlaceProvider $photonProvider
    ) {
        $this->providers = [
            $localProvider,
            $googleProvider,
            $photonProvider,
        ];
    }

    /**
     * Search across all available providers with fallback, spatial deduplication, and caching.
     *
     * @return array[] Normalized place results
     */
    public function search(string $query, ?float $biasLat = null, ?float $biasLng = null, int $limit = 6): array
    {
        $q = trim($query);
        if (mb_strlen($q) < 2) {
            return [];
        }

        $cacheKey = 'places_search_v2_' . md5("{$q}|{$biasLat}|{$biasLng}|{$limit}");

        return Cache::remember($cacheKey, 3600, function () use ($q, $biasLat, $biasLng, $limit) {
            $accumulated = [];

            foreach ($this->providers as $provider) {
                if (!$provider->isAvailable()) {
                    continue;
                }

                try {
                    $results = $provider->search($q, $biasLat, $biasLng, $limit);
                    foreach ($results as $res) {
                        $accumulated[] = $res;
                    }
                } catch (\Throwable $e) {
                    // Gracefully continue with remaining providers
                }

                // If high-confidence local results satisfy limit, no need to over-query external APIs
                if ($provider->name() === 'local' && count($accumulated) >= $limit) {
                    break;
                }
            }

            return $this->deduplicateAndRank($accumulated, $limit);
        });
    }

    /**
     * Reverse geocoding to resolve nearest place for coordinates.
     */
    public function reverse(float $lat, float $lng): ?array
    {
        foreach ($this->providers as $provider) {
            if (method_exists($provider, 'reverse')) {
                $res = $provider->reverse($lat, $lng);
                if ($res !== null) {
                    return $res;
                }
            }
        }
        return null;
    }

    /**
     * Deduplicate places spatially within 80 meters and slice to requested limit.
     */
    private function deduplicateAndRank(array $places, int $limit): array
    {
        $unique = [];

        foreach ($places as $place) {
            $isDuplicate = false;
            foreach ($unique as $existing) {
                $dist = $this->haversineMeters($place['lat'], $place['lng'], $existing['lat'], $existing['lng']);
                if ($dist < 80.0) {
                    $isDuplicate = true;
                    break;
                }
            }

            if (!$isDuplicate) {
                $unique[] = $place;
            }

            if (count($unique) >= $limit) {
                break;
            }
        }

        return $unique;
    }

    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }
}

