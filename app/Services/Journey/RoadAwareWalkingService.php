<?php

namespace App\Services\Journey;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Road-aware walking routes via a self-hosted OSRM (foot profile) server.
 *
 * Laravel remains the business/API layer; OSRM owns road-network routing.
 * Every query degrades gracefully: if OSRM is unreachable, returns null and
 * callers fall back to the existing haversine estimate — never a failure of
 * the whole search.
 *
 * Results are memoized per coordinate pair (rounded to ~1 m) because the
 * planner resolves the same access/egress/transfer walks many times per
 * search.
 */
class RoadAwareWalkingService
{
    /** Cache TTL for road routes (foot network rarely changes intra-day). */
    public const CACHE_TTL_MINUTES = 60;

    /** Snap coordinates to this many decimals (~11 m) for cache stability. */
    private const SNAP_DECIMALS = 4;

    private array $memo = [];

    public function __construct(private readonly ?string $baseUrl = null)
    {
    }

    protected function url(): string
    {
        return $this->baseUrl
            ?? config('services.osrm.url', env('OSRM_URL', 'http://127.0.0.1:5001'));
    }

    protected function enabled(): bool
    {
        return (bool) config(
            'services.osrm.enabled',
            env('OSRM_ENABLED', true)
        );
    }

    /**
     * Road walking route between two points.
     *
     * @return array|null {
     *   @var int   $distance_meters  Actual road distance.
     *   @var int   $duration_sec     Realistic walking duration.
     *   @var array $geometry        [[lat, lng], ...] road-following polyline.
     *   @var string $source          'osrm' (always; the fallback path is
     *                                handled by the caller via null returns).
     * } or null when OSRM is unavailable / no route exists.
     */
    public function walkingRoute(float $fromLat, float $fromLng, float $toLat, float $toLng): ?array
    {
        if (!$this->enabled()) {
            return null;
        }

        // Trivially short walks gain nothing from a road route.
        if (GeoCalculator::distanceMeters($fromLat, $fromLng, $toLat, $toLng) < 25) {
            return null;
        }

        $key = $this->cacheKey($fromLat, $fromLng, $toLat, $toLng);

        if (array_key_exists($key, $this->memo)) {
            return $this->memo[$key];
        }

        $cached = cache()->get($key);
        if ($cached !== null) {
            return $this->memo[$key] = $cached;
        }

        $route = $this->queryOsmr($fromLat, $fromLng, $toLat, $toLng);

        if ($route !== null) {
            cache()->put($key, $route, now()->addMinutes(self::CACHE_TTL_MINUTES));
        }

        return $this->memo[$key] = $route;
    }

    /**
     * Batch walking routes (e.g. all access-walk candidates of a search).
     * Queries the OSRM table service when available for efficiency, falling
     * back to per-pair /route calls.
     *
     * @param array $origins  [[lat, lng], ...]
     * @param array $destinations [[lat, lng], ...]
     * @return array|null distances[i][j] in meters, or null on failure.
     */
    public function walkingDistanceMatrix(array $origins, array $destinations): ?array
    {
        if (!$this->enabled() || $origins === [] || $destinations === []) {
            return null;
        }

        $coords = array_merge(
            array_map(fn ($p) => [$p[1], $p[0]], $origins),
            array_map(fn ($p) => [$p[1], $p[0]], $destinations)
        );
        $coordStr = implode(';', array_map(
            fn ($p) => round($p[0], self::SNAP_DECIMALS) . ',' . round($p[1], self::SNAP_DECIMALS),
            $coords
        ));
        $srcCount = count($origins);

        try {
            $response = Http::timeout(5)
                ->get("{$this->url()}/table/v1/foot/{$coordStr}?sources=" . implode(',', range(0, $srcCount - 1))
                    . '&destinations=' . implode(',', range($srcCount, count($coords) - 1)));

            if ($response->failed()) {
                return null;
            }

            $data = $response->json();
            if (($data['code'] ?? null) !== 'Ok' || !isset($data['distances'])) {
                return null;
            }

            return $data['distances'];
        } catch (\Throwable $e) {
            Log::debug('OSRM table request failed: ' . $e->getMessage());

            return null;
        }
    }

    protected function queryOsmr(float $fromLat, float $fromLng, float $toLat, float $toLng): ?array
    {
        $from = round($fromLng, self::SNAP_DECIMALS) . ',' . round($fromLat, self::SNAP_DECIMALS);
        $to = round($toLng, self::SNAP_DECIMALS) . ',' . round($toLat, self::SNAP_DECIMALS);

        try {
            $response = Http::timeout(5)
                ->get("{$this->url()}/route/v1/foot/{$from};{$to}"
                    . '?overview=full&geometries=geojson');

            if ($response->failed()) {
                return null;
            }

            $data = $response->json();

            if (($data['code'] ?? null) !== 'Ok' || empty($data['routes'][0])) {
                return null;
            }

            $route = $data['routes'][0];

            $geometry = array_map(
                fn (array $c) => [$c[1], $c[0]], // geojson [lng,lat] → [lat,lng]
                $route['geometry']['coordinates'] ?? []
            );

            return [
                'distance_meters' => (int) round($route['distance']),
                'duration_sec' => (int) round($route['duration']),
                'geometry' => $geometry,
                'source' => 'osrm',
            ];
        } catch (\Throwable $e) {
            Log::debug('OSRM route request failed: ' . $e->getMessage());

            return null;
        }
    }

    protected function cacheKey(float $fromLat, float $fromLng, float $toLat, float $toLng): string
    {
        return 'osrm:walk:' . md5(sprintf(
            '%.4F,%.4F;%.4F,%.4F',
            $fromLat,
            $fromLng,
            $toLat,
            $toLng
        ));
    }
}
