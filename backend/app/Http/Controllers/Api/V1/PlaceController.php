<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
class PlaceController extends Controller
{
    public function search(Request $request, PlaceGeocoderService $geocoder): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'min:2', 'max:100'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $query = trim($validated['q'] ?? '');
        $biasLat = isset($validated['lat']) ? (float) $validated['lat'] : null;
        $biasLng = isset($validated['lng']) ? (float) $validated['lng'] : null;

        // Reverse mode: coordinate-only request (no q) resolves the nearest
        // named place — used to label the user's current location. Same
        // throttled proxy path as forward search.
        if ($query === '' && $biasLat !== null && $biasLng !== null) {
            return response()->json([
                'success' => true,
                'data' => [
                    'query' => null,
                    'reverse' => $geocoder->reverse($biasLat, $biasLng),
                    'stops' => [],
                    'places' => [],
                ],
            ]);
        }

        if ($query === '') {
            return response()->json([
                'success' => false,
                'message' => 'A search query (q) or coordinates (lat, lng) are required.',
            ], 422);
        }

        // 1. Transit stops (real imported network).
        // Escape LIKE wildcards so a literal % _ \ in the query cannot turn
        // the lookup into an unintended full-table wildcard scan.
        $like = addcslashes($query, '%_\\');

        // Bilingual alias support for Egyptian transit stations (Arabic & English)
        $aliasMap = [
            'رمسيس' => ['الشهداء', 'رمسيس', 'Ramses'],
            'الشهداء' => ['الشهداء', 'رمسيس', 'Shohadaa'],
            'التحرير' => ['السادات', 'التحرير', 'Sadat', 'Tahrir'],
            'السادات' => ['السادات', 'التحرير', 'Sadat', 'Tahrir'],
            'الجيزة' => ['الجيزة', 'Giza'],
            'العاصمة' => ['العاصمة', 'Capital'],
            'عدلي منصور' => ['عدلي منصور', 'Adly Mansour'],
            'حلوان' => ['حلوان', 'Helwan'],
            'المرج' => ['المرج', 'Marg'],
            'شبرا' => ['شبرا', 'Shubra'],
            'المعادي' => ['المعادي', 'Maadi'],
            'المطرية' => ['المطرية', 'Matariya'],
            'عين شمس' => ['عين شمس', 'Ain Shams'],
            'الدقي' => ['الدقي', 'Dokki'],
            'البحوث' => ['البحوث', 'Bohooth'],
            'جامعة القاهرة' => ['جامعة القاهرة', 'Cairo University'],
            'فيصل' => ['فيصل', 'Faisal'],
            'المنيب' => ['المنيب', 'Mounib', 'Moneeb'],
            'العتبة' => ['العتبة', 'Attaba'],
            'العباسية' => ['العباسية', 'Abbassiya'],
            'الأهرام' => ['الأهرام', 'الاهرام', 'Ahram'],
            'الفيوم' => ['الفيوم', 'Fayoum'],
            'الحصري' => ['الحصري', 'Hosary', 'October'],
            'عبود' => ['عبود', 'Abboud'],
            'السلام' => ['السلام', 'Salam'],
            'ramses' => ['الشهداء', 'رمسيس', 'Ramses'],
            'ramsis' => ['الشهداء', 'رمسيس', 'Ramses'],
            'shohadaa' => ['الشهداء', 'رمسيس', 'Shohadaa'],
            'tahrir' => ['السادات', 'التحرير', 'Sadat'],
            'sadat' => ['السادات', 'التحرير', 'Sadat'],
            'giza' => ['الجيزة', 'Giza'],
            'dokki' => ['الدقي', 'Dokki'],
            'doky' => ['الدقي', 'Dokki'],
            'ataba' => ['العتبة', 'Attaba'],
            'attaba' => ['العتبة', 'Attaba'],
            'cairo university' => ['جامعة القاهرة', 'Cairo University'],
            'fayoum' => ['الفيوم', 'Fayoum'],
            'faiyum' => ['الفيوم', 'Fayoum'],
            'hosary' => ['الحصري', 'Hosary'],
            'moneeb' => ['المنيب', 'Moneeb', 'Mounib'],
            'abboud' => ['عبود', 'Abboud'],
            'salam' => ['السلام', 'Salam'],
            'october' => ['أكتوبر', 'اكتوبر', 'الحصري', 'October'],
        ];

        // Strip common prefixes like "محطة", "موقف", "ميدان", "جامعة"
        $stripped = preg_replace('/^(محطة|محطه|موقف|ميدان|شارع|جامعة|جامعه|مستشفى|مستشفي|مول|نادي|نادى)\s+/iu', '', $query);

        // Generate Arabic spelling variants (أ/إ/آ <-> ا, ة <-> ه, ى <-> ي)
        $searchTerms = [$query];
        if ($stripped !== $query && mb_strlen($stripped) >= 2) {
            $searchTerms[] = $stripped;
        }

        foreach ([$query, $stripped] as $base) {
            if (!$base) continue;
            // Variant 1: swap alefs
            $searchTerms[] = preg_replace('/[أإآ]/u', 'ا', $base);
            $searchTerms[] = preg_replace('/ال([ا])/u', 'الأ', $base);
            $searchTerms[] = preg_replace('/^ا/u', 'أ', $base);
            // Variant 2: swap ة and ه only at the end of words (Ta Marbouta never appears in the middle of words)
            $searchTerms[] = preg_replace('/ه(\s|$)/u', 'ة$1', $base);
            $searchTerms[] = preg_replace('/ة(\s|$)/u', 'ه$1', $base);
            // Combined alef + ta marbouta swap
            $combined = preg_replace('/ال([ا])/u', 'الأ', $base);
            $combined = preg_replace('/ه(\s|$)/u', 'ة$1', $combined);
            $searchTerms[] = $combined;
        }

        // Match against alias map
        $aliasTerms = [];
        $lowQuery = mb_strtolower($query);
        $lowStripped = mb_strtolower($stripped);
        foreach ($aliasMap as $key => $targets) {
            if (mb_stripos($lowQuery, (string)$key) !== false || mb_stripos($lowStripped, (string)$key) !== false) {
                foreach ($targets as $t) {
                    $aliasTerms[] = $t;
                }
            }
        }

        $allTerms = array_unique(array_filter(array_merge($searchTerms, $aliasTerms), fn($t) => mb_strlen(trim($t)) >= 2));

        $stopsQuery = DB::table('transit_stops')
            ->leftJoin('areas', 'transit_stops.area_id', '=', 'areas.id')
            ->where(function ($q) use ($allTerms) {
                foreach ($allTerms as $idx => $term) {
                    $escaped = addcslashes($term, '%_\\');
                    if ($idx === 0) {
                        $q->where('transit_stops.name', 'like', '%' . $escaped . '%');
                    } else {
                        $q->orWhere('transit_stops.name', 'like', '%' . $escaped . '%');
                    }
                }
            });

        $stops = $stopsQuery
            ->orderBy('transit_stops.name')
            ->limit(8)
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
