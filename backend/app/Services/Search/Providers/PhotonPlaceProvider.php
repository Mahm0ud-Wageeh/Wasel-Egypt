<?php

namespace App\Services\Search\Providers;

use App\Services\Search\Contracts\PlaceSearchProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PhotonPlaceProvider implements PlaceSearchProviderInterface
{
    // Egypt national geographic bounding box: minLng, minLat, maxLng, maxLat
    private const EGYPT_BBOX = '24.7,21.7,36.9,31.7';

    public function name(): string
    {
        return 'photon';
    }

    public function isAvailable(): bool
    {
        return true;
    }

    public function search(string $query, ?float $biasLat = null, ?float $biasLng = null, int $limit = 6): array
    {
        try {
            $params = [
                'q' => $query,
                'limit' => $limit,
                'lang' => 'ar',
                'bbox' => self::EGYPT_BBOX,
            ];

            if ($biasLat !== null && $biasLng !== null) {
                $params['lat'] = $biasLat;
                $params['lon'] = $biasLng;
            }

            $response = Http::timeout(3)
                ->withHeaders(['User-Agent' => 'Wasel-Egypt/2.0 (Egyptian Transit Assistant)'])
                ->get('https://photon.komoot.io/api/', $params);

            if (!$response->successful()) {
                return [];
            }

            $features = $response->json('features') ?? [];
            $results = [];

            foreach ($features as $f) {
                $props = $f['properties'] ?? [];
                $coords = $f['geometry']['coordinates'] ?? [];
                if (count($coords) < 2) continue;

                $lng = (float) $coords[0];
                $lat = (float) $coords[1];

                // Ensure strictly within Egyptian territory
                if ($lat < 21.7 || $lat > 31.7 || $lng < 24.7 || $lng > 36.9) {
                    continue;
                }

                $name = $props['name'] ?? $query;
                $city = $props['city'] ?? $props['state'] ?? $props['country'] ?? 'مصر';
                $street = $props['street'] ?? '';
                $detail = trim("{$street} {$city}");

                $results[] = [
                    'id' => 'osm-' . ($props['osm_id'] ?? md5($name . $lat . $lng)),
                    'name' => $name,
                    'detail' => !empty($detail) ? $detail : 'موقع جغرافي في مصر',
                    'lat' => $lat,
                    'lng' => $lng,
                    'type' => $this->mapOsmType($props['osm_value'] ?? $props['type'] ?? ''),
                    'source' => 'osm_photon',
                    'confidence' => 0.85,
                ];
            }

            return $results;
        } catch (\Throwable $e) {
            Log::info('Photon provider lookup gracefully skipped', ['message' => $e->getMessage()]);
            return [];
        }
    }

    public function reverse(float $lat, float $lng): ?array
    {
        try {
            $response = Http::timeout(3)
                ->withHeaders(['User-Agent' => 'Wasel-Egypt/2.0 (Egyptian Transit Assistant)'])
                ->get('https://photon.komoot.io/reverse', [
                    'lat' => $lat,
                    'lon' => $lng,
                    'lang' => 'ar',
                ]);

            if ($response->successful()) {
                $features = $response->json('features') ?? [];
                if (!empty($features)) {
                    $props = $features[0]['properties'] ?? [];
                    return [
                        'id' => 'osm-' . ($props['osm_id'] ?? 'rev'),
                        'name' => $props['name'] ?? 'موقع على الخريطة',
                        'detail' => $props['city'] ?? $props['state'] ?? 'مصر',
                        'lat' => $lat,
                        'lng' => $lng,
                        'type' => 'poi',
                        'source' => 'osm_photon_reverse',
                        'confidence' => 0.80,
                    ];
                }
            }
        } catch (\Throwable $e) {
            // graceful
        }

        return null;
    }

    private function mapOsmType(string $osmValue): string
    {
        return match ($osmValue) {
            'station', 'halt', 'subway_entrance', 'tram_stop', 'bus_stop' => 'station',
            'hospital', 'clinic' => 'hospital',
            'university', 'college', 'school' => 'university',
            'mall', 'department_store' => 'mall',
            'aerodrome' => 'airport',
            'suburb', 'neighbourhood', 'quarter', 'city', 'town' => 'district',
            default => 'poi',
        };
    }
}
