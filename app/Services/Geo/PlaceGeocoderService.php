<?php

namespace App\Services\Geo;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Place geocoding via Photon (komoot) — Apache-2.0, OSM data (ODbL).
 *
 * Solved problem: the transit stop index only contains stop names, so
 * riders could not search Arabic place names ("جامعة القاهرة", "ميدان
 * التحرير"). Photon returns OSM places (incl. Arabic names) with
 * coordinates that flow into the existing journey search.
 *
 * Hardening:
 *  - results cached per (query, bias) for CACHE_TTL_MINUTES (respects the
 *    public instance's fair-use policy);
 *  - in-process memo for repeated identical queries;
 *  - 5s timeout, graceful failure (returns []) — the UI keeps working
 *    with stop-only results;
 *  - no API key exists or is needed; if a keyed provider is ever adopted
 *    its secret stays server-side here.
 */
class PlaceGeocoderService
{
    public const CACHE_TTL_MINUTES = 60;

    private array $memo = [];

    public function __construct(private readonly ?string $baseUrl = null)
    {
    }

    protected function url(): string
    {
        return $this->baseUrl
            ?? config('services.geocoding.url', 'https://photon.komoot.io/api/');
    }

    protected function enabled(): bool
    {
        return (bool) config('services.geocoding.enabled', true);
    }

    /**
     * Geocode a free-text query (Arabic or Latin) into normalized place
     * candidates, optionally biased toward a coordinate.
     *
     * @return array[] { id, name, detail, lat, lng, source, osm_key? }
     */
    public function search(string $query, ?float $biasLat = null, ?float $biasLng = null, int $limit = 6): array
    {
        $query = trim($query);

        if (!$this->enabled() || mb_strlen($query) < 2) {
            return [];
        }

        $biasPart = $biasLat !== null && $biasLng !== null
            ? sprintf('@%.4F,%.4F', $biasLat, $biasLng)
            : 'nobias';
        $key = 'geocode:' . md5(mb_strtolower($query) . '|' . $biasPart . '|' . $limit);

        if (array_key_exists($key, $this->memo)) {
            return $this->memo[$key];
        }

        $cached = cache()->get($key);
        if ($cached !== null) {
            return $this->memo[$key] = $cached;
        }

        $results = $this->queryPhoton($query, $biasLat, $biasLng, $limit);

        if ($results !== []) {
            cache()->put($key, $results, now()->addMinutes(self::CACHE_TTL_MINUTES));
        }

        return $this->memo[$key] = $results;
    }

    /**
     * Reverse geocode a coordinate to the nearest named place (Photon
     * reverse mode). Returns [] on failure — the caller falls back to a
     * coordinate label. Cached like forward lookups.
     *
     * @return array|null { id, name, detail, lat, lng, source }
     */
    public function reverse(float $lat, float $lng, int $limit = 5): ?array
    {
        if (!$this->enabled()) {
            return null;
        }

        $key = 'geocode-r:' . md5(sprintf('%.5F,%.5F|%d', $lat, $lng, $limit));

        if (array_key_exists($key, $this->memo)) {
            return $this->memo[$key];
        }

        $cached = cache()->get($key);
        if ($cached !== null) {
            return $this->memo[$key] = $cached;
        }

        $result = $this->queryPhotonReverse($lat, $lng, $limit);

        cache()->put($key, $result, now()->addMinutes(self::CACHE_TTL_MINUTES));

        return $this->memo[$key] = $result;
    }

    protected function queryPhotonReverse(float $lat, float $lng, int $limit): ?array
    {
        try {
            // Photon reverse endpoint: /reverse?lat=&lon=
            $url = rtrim(str_replace('/api/', '/reverse', $this->url()), '/') ?: $this->url();
            $response = Http::timeout(5)->get($url, [
                'lat' => round($lat, 5),
                'lon' => round($lng, 5),
                'limit' => 1,
            ]);

            if ($response->failed()) {
                return null;
            }

            $feature = $response->json('features.0');
            $props = $feature['properties'] ?? [];
            $coords = $feature['geometry']['coordinates'] ?? null;
            $name = $props['name'] ?? null;

            if ($name === null || $name === '' || !is_array($coords) || count($coords) < 2) {
                return null;
            }

            $detailParts = array_filter([
                $props['street'] ?? null,
                $props['district'] ?? null,
                $props['city'] ?? $props['county'] ?? null,
                $props['state'] ?? null,
            ]);

            return [
                'id' => 'photon-' . ($props['osm_id'] ?? md5($name . implode(',', $coords))),
                'name' => $name,
                'detail' => implode(' · ', $detailParts),
                'lat' => (float) $coords[1],
                'lng' => (float) $coords[0],
                'source' => 'photon',
            ];
        } catch (\Throwable $e) {
            Log::debug('Photon reverse geocode failed: ' . $e->getMessage());

            return null;
        }
    }

    protected function queryPhoton(string $query, ?float $biasLat, ?float $biasLng, int $limit): array
    {
        $params = [
            'q' => $query,
            'limit' => min(10, max(1, $limit)),
            'lang' => 'default',
        ];

        if ($biasLat !== null && $biasLng !== null) {
            $params['lat'] = round($biasLat, 4);
            $params['lon'] = round($biasLng, 4);
        }

        try {
            $response = Http::timeout(5)->get($this->url(), $params);

            if ($response->failed()) {
                return [];
            }

            $features = $response->json('features') ?? [];

            $out = [];
            foreach ($features as $feature) {
                $props = $feature['properties'] ?? [];
                $coords = $feature['geometry']['coordinates'] ?? null;

                if (!is_array($coords) || count($coords) < 2) {
                    continue;
                }

                $name = $props['name'] ?? null;
                if ($name === null || $name === '') {
                    continue;
                }

                $detailParts = array_filter([
                    $props['street'] ?? null,
                    $props['district'] ?? null,
                    $props['city'] ?? $props['county'] ?? null,
                    $props['state'] ?? null,
                ]);

                $out[] = [
                    'id' => 'photon-' . ($props['osm_id'] ?? md5($name . implode(',', $coords))),
                    'name' => $name,
                    'detail' => implode(' · ', $detailParts),
                    'lat' => (float) $coords[1],
                    'lng' => (float) $coords[0],
                    'kind' => $props['osm_value'] ?? null,
                    'source' => 'photon',
                ];

                if (count($out) >= $limit) {
                    break;
                }
            }

            return $out;
        } catch (\Throwable $e) {
            Log::debug('Photon geocode failed: ' . $e->getMessage());

            return [];
        }
    }
}
