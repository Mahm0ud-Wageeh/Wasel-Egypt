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

        // Bilingual alias support for Egyptian transit stations
        $aliasMap = [
            'رمسيس' => 'Ramses',
            'الشهداء' => 'Shohadaa',
            'التحرير' => 'Tahrir',
            'السادات' => 'Sadat',
            'الجيزة' => 'Giza',
            'العاصمة' => 'Capital',
            'عدلي منصور' => 'Adly Mansour',
            'حلوان' => 'Helwan',
            'المرج' => 'Marg',
            'شبرا' => 'Shubra',
            'المعادي' => 'Maadi',
            'المطرية' => 'Matariya',
            'عين شمس' => 'Ain Shams',
            'سراي القبة' => 'Saray',
            'الأوبرا' => 'Opera',
            'الدقي' => 'Dokki',
            'البحوث' => 'Bohooth',
            'جامعة القاهرة' => 'Cairo University',
            'فيصل' => 'Faisal',
            'أم المصريين' => 'Omm El-Misryeen',
            'ساقية مكي' => 'Mekki',
            'المنيب' => 'Mounib',
            'العتبة' => 'Attaba',
            'باب الشعرية' => 'Shaariya',
            'الجيش' => 'Geish',
            'عبده باشا' => 'Abdou',
            'العباسية' => 'Abbassiya',
            'أرض المعارض' => 'Fair Zone',
            'استاد' => 'Stadium',
            'كلية البنات' => 'Banat',
            'الأهرام' => 'Ahram',
            'هارون' => 'Haroun',
            'هليوبوليس' => 'Heliopolis',
            'ألف مسكن' => 'Maskan',
            'نادي الشمس' => 'Shams',
            'النزهة' => 'Nozha',
            'هشام بركات' => 'Hesham Barakat',
            'قباء' => 'Qobaa',
            'عمر بن الخطاب' => 'Omar',
            'الهايكستب' => 'Hikestep',
            'الكيت كات' => 'Kit Kat',
            'السودان' => 'Sudan',
            'إمبابة' => 'Imbaba',
            'البوهي' => 'Bohy',
            'القومية' => 'Qawmeya',
            'الدائري' => 'Ring Rd',
            'روض الفرج' => 'Farag',
            'التوفيقية' => 'Tawfikiya',
            'وادي النيل' => 'Wadi',
            'جامعة الدول' => 'Dowal',
            'بولاق' => 'Bulaq',
            'الشروق' => 'Shorouq',
            'بدر' => 'Badr',
            'العاشر' => '10th',
            'المستقبل' => 'Mostaqbal',
            'الروبيكي' => 'Roubiky',
            'حدائق العاصمة' => 'Capital',
            'مطار' => 'Airport',
            'مدينة نصر' => 'Nasr City',
            'مصر الجديدة' => 'Heliopolis',
            'التجمع' => 'Tagamoa',
            'القاهرة الجديدة' => 'New Cairo',
            'أكتوبر' => 'October',
            'زايد' => 'Zayed',
        ];

        $englishTerm = null;
        foreach ($aliasMap as $ar => $en) {
            if (mb_stripos($query, $ar) !== false) {
                $englishTerm = $en;
                break;
            }
        }

        $stopsQuery = DB::table('transit_stops')
            ->leftJoin('areas', 'transit_stops.area_id', '=', 'areas.id')
            ->where(function ($q) use ($like, $englishTerm) {
                $q->where('transit_stops.name', 'like', '%' . $like . '%');
                if ($englishTerm) {
                    $q->orWhere('transit_stops.name', 'like', '%' . $englishTerm . '%');
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
