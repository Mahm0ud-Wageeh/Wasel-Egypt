<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\Geo\PlaceGeocoderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Unified place + stop search behind one throttled proxy endpoint.
 *
 * GET /api/v1/places/search?q=جامعة القاهرة[&lat=&lng=]
 *
 * Returns matching transit STOPS (server-side, from the imported network)
 * and geocoded PLACES (Photon/OSM, Arabic-capable) so the client renders a
 * single merged suggestion list. The geocoder is keyless (Photon public)
 * and cached here — the client never talks to an external geocoder.
 */
class PlaceController extends AuthController
{
    public function search(Request $request, PlaceGeocoderService $geocoder): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $query = trim($validated['q']);
        $biasLat = isset($validated['lat']) ? (float) $validated['lat'] : null;
        $biasLng = isset($validated['lng']) ? (float) $validated['lng'] : null;

        // 1. Transit stops (real imported network).
        $stops = DB::table('transit_stops')
            ->leftJoin('areas', 'transit_stops.area_id', '=', 'areas.id')
            ->where('transit_stops.name', 'like', '%' . $query . '%')
            ->orderBy('transit_stops.name')
            ->limit(6)
            ->get([
                'transit_stops.id',
                'transit_stops.name',
                'transit_stops.latitude',
                'transit_stops.longitude',
                'areas.name as area_name',
            ])
            ->map(fn ($s) => [
                'id' => 'stop-' . $s->id,
                'stop_id' => $s->id,
                'name' => $s->name,
                'detail' => $s->area_name ?? 'Transit stop',
                'lat' => (float) $s->latitude,
                'lng' => (float) $s->longitude,
                'source' => 'stop',
            ])
            ->values()
            ->all();

        // 2. Geocoded places (Photon/OSM, Arabic-capable, cached).
        $places = $geocoder->search($query, $biasLat, $biasLng, 6);

        return response()->json([
            'success' => true,
            'data' => [
                'query' => $query,
                'stops' => $stops,
                'places' => $places,
            ],
        ]);
    }
}
