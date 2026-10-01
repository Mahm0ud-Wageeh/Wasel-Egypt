<?php

namespace App\Services\Search\Providers;

use App\Services\Search\Contracts\PlaceSearchProviderInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * LocalVerifiedPlaceProvider searches:
 * 1. Curated National Points of Interest (Hospitals, Universities, Airports, Major Malls, Terminals).
 * 2. Real database transit stations and stops from the imported GTFS/network tables.
 */
class LocalVerifiedPlaceProvider implements PlaceSearchProviderInterface
{
    /**
     * Curated major Egyptian national landmarks, hospitals, universities, malls, and transit terminals.
     */
    public const VERIFIED_POIS = [
        [
            'id' => 'poi_57357',
            'name' => 'مستشفى 57357 لعلاج سرطان الأطفال',
            'name_en' => "Children's Cancer Hospital 57357",
            'detail' => 'شارع سكة الإمام · السيدة زينب · القاهرة',
            'lat' => 30.0219,
            'lng' => 31.2372,
            'type' => 'hospital',
            'aliases' => ['57357', 'مستشفي 57357', 'مستشفى سرطان الاطفال', 'مستشفى الاطفال', 'مستشفي سرطان الاطفال'],
        ],
        [
            'id' => 'poi_cairo_airport',
            'name' => 'مطار القاهرة الدولي (صالة 1، 2، 3)',
            'name_en' => 'Cairo International Airport',
            'detail' => 'مصر الجديدة · طريق المطار · القاهرة',
            'lat' => 30.1219,
            'lng' => 31.4056,
            'type' => 'airport',
            'aliases' => ['المطار', 'مطار القاهره', 'مطار القاهره الدولى', 'cairo airport', 'airport'],
        ],
        [
            'id' => 'poi_mall_of_arabia',
            'name' => 'مول العرب',
            'name_en' => 'Mall of Arabia',
            'detail' => 'ميدان جهينة · السادس من أكتوبر · الجيزة',
            'lat' => 30.0078,
            'lng' => 30.9733,
            'type' => 'mall',
            'aliases' => ['مول العرب', 'mall of arabia', 'جهينة', 'ميدان جهينة'],
        ],
        [
            'id' => 'poi_mall_of_egypt',
            'name' => 'مول مصر',
            'name_en' => 'Mall of Egypt',
            'detail' => 'طريق الواحات · السادس من أكتوبر · الجيزة',
            'lat' => 29.9725,
            'lng' => 31.0183,
            'type' => 'mall',
            'aliases' => ['مول مصر', 'mall of egypt'],
        ],
        [
            'id' => 'poi_cairo_univ',
            'name' => 'جامعة القاهرة (المبنى الرئيسي)',
            'name_en' => 'Cairo University',
            'detail' => 'شارع جامعة القاهرة · الجيزة',
            'lat' => 30.0275,
            'lng' => 31.2083,
            'type' => 'university',
            'aliases' => ['جامعة القاهرة', 'جامعه القاهره', 'cairo university', 'cairo univ'],
        ],
        [
            'id' => 'poi_ain_shams_univ',
            'name' => 'جامعة عين شمس',
            'name_en' => 'Ain Shams University',
            'detail' => 'العباسية · القاهرة',
            'lat' => 30.0772,
            'lng' => 31.2853,
            'type' => 'university',
            'aliases' => ['جامعة عين شمس', 'جامعه عين شمس', 'ain shams university'],
        ],
        [
            'id' => 'poi_alazhar_univ',
            'name' => 'جامعة الأزهر',
            'name_en' => 'Al-Azhar University',
            'detail' => 'مدينة نصر · القاهرة',
            'lat' => 30.0592,
            'lng' => 31.3142,
            'type' => 'university',
            'aliases' => ['جامعة الازهر', 'جامعه الازهر', 'al azhar university'],
        ],
        [
            'id' => 'poi_city_stars',
            'name' => 'سيتي ستارز مول',
            'name_en' => 'City Stars Mall',
            'detail' => 'شارع عمر بن الخطاب · مدينة نصر · القاهرة',
            'lat' => 30.0731,
            'lng' => 31.3458,
            'type' => 'mall',
            'aliases' => ['سيتي ستارز', 'city stars', 'سيتى ستارز'],
        ],
        [
            'id' => 'poi_cfc',
            'name' => 'كايرو فيستيفال سيتي مول',
            'name_en' => 'Cairo Festival City Mall',
            'detail' => 'التجمع الخامس · القاهرة الجديدة',
            'lat' => 30.0308,
            'lng' => 31.4069,
            'type' => 'mall',
            'aliases' => ['كايرو فيستيفال', 'cfc', 'cairo festival'],
        ],
        [
            'id' => 'poi_tahrir',
            'name' => 'ميدان التحرير',
            'name_en' => 'Tahrir Square',
            'detail' => 'وسط البلد · القاهرة',
            'lat' => 30.0444,
            'lng' => 31.2357,
            'type' => 'landmark',
            'aliases' => ['التحرير', 'tahrir', 'tahrir square'],
        ],
        [
            'id' => 'poi_ramses',
            'name' => 'ميدان رمسيس (محطة مصر)',
            'name_en' => 'Ramses Square (Cairo Main Station)',
            'detail' => 'وسط القاهرة · محطة قطارات مصر',
            'lat' => 30.0625,
            'lng' => 31.2469,
            'type' => 'station',
            'aliases' => ['رمسيس', 'محطة مصر', 'ramses', 'ramsis'],
        ],
        [
            'id' => 'poi_smart_village',
            'name' => 'القرية الذكية',
            'name_en' => 'Smart Village',
            'detail' => 'طريق مصر الإسكندرية الصحراوي · أبو رواش · الجيزة',
            'lat' => 30.0758,
            'lng' => 31.0189,
            'type' => 'landmark',
            'aliases' => ['القريه الذكيه', 'smart village'],
        ],
        [
            'id' => 'poi_kasr_elainy',
            'name' => 'مستشفى قصر العيني',
            'name_en' => 'Kasr Al-Ainy Hospital',
            'detail' => 'المنيل · القاهرة',
            'lat' => 30.0303,
            'lng' => 31.2294,
            'type' => 'hospital',
            'aliases' => ['قصر العيني', 'القصر العيني', 'مستشفي قصر العيني'],
        ],
        [
            'id' => 'poi_fayoum_center',
            'name' => 'مدينة الفيوم (ميدان السواقي / محطة الفيوم)',
            'name_en' => 'Fayoum City Center',
            'detail' => 'محافظة الفيوم',
            'lat' => 29.3084,
            'lng' => 30.8428,
            'type' => 'district',
            'aliases' => ['الفيوم', 'fayoum', 'faiyum', 'مدينة الفيوم'],
        ],
        [
            'id' => 'poi_giza_square',
            'name' => 'ميدان الجيزة',
            'name_en' => 'Giza Square',
            'detail' => 'حي الجيزة · محافظة الجيزة',
            'lat' => 30.0108,
            'lng' => 31.2064,
            'type' => 'landmark',
            'aliases' => ['ميدان الجيزة', 'ميدان الجيزه', 'giza square'],
        ],
        [
            'id' => 'poi_faisal',
            'name' => 'شارع فيصل (الملك فيصل)',
            'name_en' => 'Faisal Street',
            'detail' => 'حي فيصل · الجيزة',
            'lat' => 30.0131,
            'lng' => 31.1878,
            'type' => 'district',
            'aliases' => ['فيصل', 'شارع فيصل', 'faisal'],
        ],
        [
            'id' => 'poi_haram',
            'name' => 'شارع الهرم',
            'name_en' => 'Al-Haram Street',
            'detail' => 'الهرم · الجيزة',
            'lat' => 30.0069,
            'lng' => 31.1989,
            'type' => 'district',
            'aliases' => ['الهرم', 'شارع الهرم', 'haram'],
        ],
        [
            'id' => 'poi_nasr_city',
            'name' => 'مدينة نصر',
            'name_en' => 'Nasr City',
            'detail' => 'شرق القاهرة',
            'lat' => 30.0569,
            'lng' => 31.3419,
            'type' => 'district',
            'aliases' => ['مدينة نصر', 'مدينه نصر', 'nasr city'],
        ],
        [
            'id' => 'poi_october',
            'name' => 'مدينة السادس من أكتوبر (الحصري)',
            'name_en' => '6th of October City (Hosary)',
            'detail' => 'محافظة الجيزة',
            'lat' => 29.9739,
            'lng' => 30.9458,
            'type' => 'district',
            'aliases' => ['اكتوبر', 'أكتوبر', 'الحصري', 'ميدان الحصري', '6 october'],
        ],
    ];

    public function name(): string
    {
        return 'local';
    }

    public function isAvailable(): bool
    {
        return true;
    }

    public function search(string $query, ?float $biasLat = null, ?float $biasLng = null, int $limit = 6): array
    {
        $q = trim($query);
        if (mb_strlen($q) < 2) {
            return [];
        }

        $results = [];

        // 1. Check curated national POIs first
        $normalizedQ = $this->normalizeArabic($q);
        foreach (self::VERIFIED_POIS as $poi) {
            $matched = false;
            if (str_contains($this->normalizeArabic($poi['name']), $normalizedQ) ||
                str_contains(mb_strtolower($poi['name_en']), mb_strtolower($q))) {
                $matched = true;
            } else {
                foreach ($poi['aliases'] as $alias) {
                    if (str_contains($this->normalizeArabic($alias), $normalizedQ) ||
                        str_contains(mb_strtolower($alias), mb_strtolower($q))) {
                        $matched = true;
                        break;
                    }
                }
            }

            if ($matched) {
                $results[] = [
                    'id' => $poi['id'],
                    'name' => $poi['name'],
                    'detail' => $poi['detail'],
                    'lat' => (float) $poi['lat'],
                    'lng' => (float) $poi['lng'],
                    'type' => $poi['type'],
                    'source' => 'local_verified',
                    'confidence' => 0.98,
                ];
            }
        }

        // 2. Query transit_stops table if database is connected
        try {
            if (Schema::hasTable('transit_stops')) {
                $like = addcslashes($q, '%_\\');
                $stops = DB::table('transit_stops')
                    ->leftJoin('areas', 'transit_stops.area_id', '=', 'areas.id')
                    ->where('transit_stops.name', 'like', "%{$like}%")
                    ->limit($limit)
                    ->get([
                        'transit_stops.id',
                        'transit_stops.name',
                        'transit_stops.latitude',
                        'transit_stops.longitude',
                        'areas.name as area_name',
                    ]);

                foreach ($stops as $s) {
                    $results[] = [
                        'id' => 'stop-' . $s->id,
                        'name' => $s->name,
                        'detail' => $s->area_name ?? 'محطة نقل في مصر',
                        'lat' => (float) $s->latitude,
                        'lng' => (float) $s->longitude,
                        'type' => 'station',
                        'source' => 'transit_database',
                        'confidence' => 0.95,
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Database might be temporarily unavailable or unseeded; gracefully continue
        }

        // Deduplicate and slice to limit
        $unique = [];
        $seen = [];
        foreach ($results as $item) {
            $key = $item['name'] . '|' . round($item['lat'], 3) . '|' . round($item['lng'], 3);
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $item;
            }
        }

        return array_slice($unique, 0, $limit);
    }

    public function reverse(float $lat, float $lng): ?array
    {
        // Find nearest POI within 500m
        $closest = null;
        $minDist = PHP_FLOAT_MAX;

        foreach (self::VERIFIED_POIS as $poi) {
            $d = $this->haversineMeters($lat, $lng, $poi['lat'], $poi['lng']);
            if ($d < $minDist && $d <= 1500) {
                $minDist = $d;
                $closest = [
                    'id' => $poi['id'],
                    'name' => $poi['name'],
                    'detail' => $poi['detail'],
                    'lat' => $poi['lat'],
                    'lng' => $poi['lng'],
                    'type' => $poi['type'],
                    'source' => 'local_verified',
                    'confidence' => max(0.5, 1.0 - ($d / 1500)),
                ];
            }
        }

        return $closest;
    }

    private function normalizeArabic(string $text): string
    {
        $normalized = preg_replace('/[\x{064B}-\x{0652}\x{0670}]/u', '', $text);
        $normalized = preg_replace('/[أإآ]/u', 'ا', $normalized);
        $normalized = preg_replace('/ة/u', 'ه', $normalized);
        $normalized = preg_replace('/ى/u', 'ي', $normalized);
        return mb_strtolower(trim($normalized));
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
