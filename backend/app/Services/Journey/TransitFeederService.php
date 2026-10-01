<?php

namespace App\Services\Journey;

use Carbon\Carbon;

/**
 * TransitFeederService provides first-mile, last-mile, and regional transit
 * connectors (Microbus, CTA Bus, Minibus, Service corridors).
 *
 * Rules:
 *  - Honest labeling: Data is explicitly tagged as 'verified', 'estimated', or 'unavailable'.
 *  - Real Egyptian tariff ranges (Oct 2024 - 2026 Ministry of Transport / Governorate tariffs).
 *  - Eliminates the 1000m barrier by connecting origins/destinations to the nearest transit hubs.
 *  - Strictly NO fabricated transit lines or fake routes: regional corridors only match verified endpoints.
 */
class TransitFeederService
{
    /**
     * Verified Egyptian multimodal corridors & regional routes.
     */
    public const REGIONAL_CORRIDORS = [
        'fayoum_to_giza' => [
            'name_ar' => 'ميكروباص إقليمي: موقف الفيوم — موقف المنيب / الجيزة',
            'name_en' => 'Regional Microbus: Fayoum - Moneeb / Giza',
            'origin_keywords' => ['الفيوم', 'fayoum'],
            'dest_keywords' => ['الجيزة', 'الجيزه', 'المنيب', 'giza', 'moneeb'],
            'from_name' => 'موقف الفيوم العمومي',
            'to_name' => 'موقف المنيب / ميدان الجيزة',
            'from_lat' => 29.3084,
            'from_lng' => 30.8428,
            'to_lat' => 29.9814,
            'to_lng' => 31.2119,
            'distance_meters' => 88000,
            'duration_sec' => 4500, // 75 mins
            'fare' => 40.0,
            'mode' => 'microbus',
            'data_source' => 'verified_regional',
        ],
        'october_to_mall_of_arabia' => [
            'name_ar' => 'سرفيس / ميكروباص: الحصري — مول العرب',
            'name_en' => 'Microbus: Hosary - Mall of Arabia',
            'origin_keywords' => ['أكتوبر', 'اكتوبر', 'الحصري', 'october', 'hosary'],
            'dest_keywords' => ['مول العرب', 'mall of arabia', 'جهينة'],
            'from_name' => 'موقف ميدان الحصري',
            'to_name' => 'مول العرب (بوابة المحور)',
            'from_lat' => 29.9739,
            'from_lng' => 30.9458,
            'to_lat' => 30.0078,
            'to_lng' => 30.9733,
            'distance_meters' => 4800,
            'duration_sec' => 720, // 12 mins
            'fare' => 6.0,
            'mode' => 'microbus',
            'data_source' => 'verified_local',
        ],
    ];

    /**
     * Resolve a first-mile or last-mile feeder connection.
     *
     * @param float $fromLat
     * @param float $fromLng
     * @param float $toLat
     * @param float $toLng
     * @param string $fromName
     * @param string $toName
     * @param Carbon $departureTime
     * @param string $role 'first_mile' | 'last_mile'
     * @param mixed $fromStopId
     * @param mixed $toStopId
     * @return array Standardized journey leg array
     */
    public function buildFeederLeg(
        float $fromLat,
        float $fromLng,
        float $toLat,
        float $toLng,
        string $fromName,
        string $toName,
        Carbon $departureTime,
        string $role = 'first_mile',
        $fromStopId = null,
        $toStopId = null
    ): array {
        $distanceMeters = (int) round(GeoCalculator::distanceMeters($fromLat, $fromLng, $toLat, $toLng) * 1.25); // 25% road circuity

        $fare = $this->calculateMicrobusFare($distanceMeters);
        $durationSec = $this->calculateFeederDurationSec($distanceMeters);
        $arrivalTime = $departureTime->copy()->addSeconds($durationSec);

        $lineName = $role === 'first_mile'
            ? "ميكروباص / سرفيس مغذي إلى {$toName}"
            : "ميكروباص / سرفيس من {$fromName} إلى الوجهة";

        $fromId = $fromStopId ?? ('feeder_from_' . substr(md5($fromName . $fromLat), 0, 8));
        $toId = $toStopId ?? ('feeder_to_' . substr(md5($toName . $toLat), 0, 8));

        return [
            'type' => 'transit',
            'leg_type' => 'transit',
            'mode' => 'microbus',
            'transit_mode_id' => 7, // Microbus mode ID in transit_modes table
            'route_variant_id' => null,
            'route' => [
                'id' => null,
                'short_name' => 'سرفيس',
                'long_name' => $lineName,
                'long_name_ar' => $lineName,
                'color' => '#f59e0b', // Amber/orange for microbus
            ],
            'agency_id' => null,
            'from_stop' => [
                'id' => $fromId,
                'name' => $fromName,
                'name_ar' => $fromName,
                'lat' => $fromLat,
                'lng' => $fromLng,
                'is_interchange' => false,
                'parent_station_id' => null,
            ],
            'to_stop' => [
                'id' => $toId,
                'name' => $toName,
                'name_ar' => $toName,
                'lat' => $toLat,
                'lng' => $toLng,
                'is_interchange' => true,
                'parent_station_id' => null,
            ],
            'from_lat' => $fromLat,
            'from_lng' => $fromLng,
            'to_lat' => $toLat,
            'to_lng' => $toLng,
            'departure_time' => $departureTime,
            'arrival_time' => $arrivalTime,
            'duration_sec' => $durationSec,
            'distance_meters' => $distanceMeters,
            'distance_m' => $distanceMeters,
            'fare' => $fare,
            'geometry' => [
                [$fromLat, $fromLng],
                [$toLat, $toLng],
            ],
            'walk_source' => null,
            'geometry_source' => 'feeder_corridor',
            'leg_steps' => [
                [
                    'instruction' => $role === 'first_mile'
                        ? "اركب ميكروباص / سرفيس من {$fromName} باتجاه {$toName}"
                        : "اركب ميكروباص / سرفيس من {$fromName} إلى {$toName}",
                    'instruction_en' => "Take microbus from {$fromName} to {$toName}",
                    'distance_meters' => $distanceMeters,
                    'duration_sec' => $durationSec,
                    'type' => 'depart',
                ],
                [
                    'instruction' => "انزل عند {$toName}",
                    'instruction_en' => "Alight at {$toName}",
                    'distance_meters' => 0,
                    'duration_sec' => 0,
                    'type' => 'arrive',
                ],
            ],
            'reliability' => 0.85,
            'data_source' => 'estimated',
            'fare_status' => 'estimated',
        ];
    }

    /**
     * Check if a direct regional corridor exists between origin and destination names.
     */
    public function findRegionalCorridor(string $originName, string $destName, Carbon $departureTime): ?array
    {
        $lowOrig = mb_strtolower(trim($originName));
        $lowDest = mb_strtolower(trim($destName));

        foreach (self::REGIONAL_CORRIDORS as $corridor) {
            $origMatch = false;
            foreach ($corridor['origin_keywords'] as $kw) {
                if (str_contains($lowOrig, $kw)) {
                    $origMatch = true;
                    break;
                }
            }

            $destMatch = false;
            foreach ($corridor['dest_keywords'] as $kw) {
                if (str_contains($lowDest, $kw)) {
                    $destMatch = true;
                    break;
                }
            }

            if ($origMatch && $destMatch) {
                $arrivalTime = $departureTime->copy()->addSeconds($corridor['duration_sec']);

                $fromId = 'corridor_from_' . substr(md5($corridor['from_name']), 0, 8);
                $toId = 'corridor_to_' . substr(md5($corridor['to_name']), 0, 8);

                $leg = [
                    'type' => 'transit',
                    'leg_type' => 'transit',
                    'mode' => $corridor['mode'],
                    'transit_mode_id' => 7,
                    'route_variant_id' => null,
                    'route' => [
                        'id' => null,
                        'short_name' => 'خط مباشر',
                        'long_name' => $corridor['name_ar'],
                        'long_name_ar' => $corridor['name_ar'],
                        'color' => '#d97706',
                    ],
                    'agency_id' => null,
                    'from_stop' => [
                        'id' => $fromId,
                        'name' => $corridor['from_name'],
                        'name_ar' => $corridor['from_name'],
                        'lat' => $corridor['from_lat'],
                        'lng' => $corridor['from_lng'],
                        'is_interchange' => false,
                        'parent_station_id' => null,
                    ],
                    'to_stop' => [
                        'id' => $toId,
                        'name' => $corridor['to_name'],
                        'name_ar' => $corridor['to_name'],
                        'lat' => $corridor['to_lat'],
                        'lng' => $corridor['to_lng'],
                        'is_interchange' => false,
                        'parent_station_id' => null,
                    ],
                    'from_lat' => $corridor['from_lat'],
                    'from_lng' => $corridor['from_lng'],
                    'to_lat' => $corridor['to_lat'],
                    'to_lng' => $corridor['to_lng'],
                    'departure_time' => $departureTime,
                    'arrival_time' => $arrivalTime,
                    'duration_sec' => $corridor['duration_sec'],
                    'distance_meters' => $corridor['distance_meters'],
                    'distance_m' => $corridor['distance_meters'],
                    'fare' => $corridor['fare'],
                    'geometry' => [
                        [$corridor['from_lat'], $corridor['from_lng']],
                        [$corridor['to_lat'], $corridor['to_lng']],
                    ],
                    'walk_source' => null,
                    'geometry_source' => 'verified_corridor',
                    'leg_steps' => [
                        [
                            'instruction' => "اركب من {$corridor['from_name']} باتجاه {$corridor['to_name']}",
                            'instruction_en' => "Board at {$corridor['from_name']} towards {$corridor['to_name']}",
                            'distance_meters' => $corridor['distance_meters'],
                            'duration_sec' => $corridor['duration_sec'],
                            'type' => 'depart',
                        ],
                        [
                            'instruction' => "الوصول إلى {$corridor['to_name']}",
                            'instruction_en' => "Arrive at {$corridor['to_name']}",
                            'distance_meters' => 0,
                            'duration_sec' => 0,
                            'type' => 'arrive',
                        ],
                    ],
                    'reliability' => 0.90,
                    'data_source' => 'verified',
                    'fare_status' => 'estimated',
                ];

                return [
                    'legs' => [$leg],
                    'transfers' => [],
                    'total_duration_sec' => $corridor['duration_sec'],
                    'total_transfers' => 0,
                    'walk_distance_meters' => 0,
                    'fare' => ['amount' => $corridor['fare'], 'currency' => 'EGP'],
                    'score' => 90.0,
                    'reliability' => 0.90,
                    'recommended' => true,
                    'summary_ar' => "⏱ حوالي " . round($corridor['duration_sec'] / 60) . " دقيقة • 💰 {$corridor['fare']} جنيه • ميكروباص مباشر بدون تبديل",
                ];
            }
        }

        return null;
    }

    /**
     * Check if a verified regional corridor exists near given coordinates.
     */
    public function findRegionalCorridorByCoords(
        float $origLat,
        float $origLng,
        float $destLat,
        float $destLng,
        Carbon $departureTime
    ): ?array {
        foreach (self::REGIONAL_CORRIDORS as $corridor) {
            $dOrig = GeoCalculator::distanceMeters($origLat, $origLng, $corridor['from_lat'], $corridor['from_lng']);
            $dDest = GeoCalculator::distanceMeters($destLat, $destLng, $corridor['to_lat'], $corridor['to_lng']);

            // Origin and dest must be within 3500m of the known corridor terminals
            if ($dOrig <= 3500 && $dDest <= 3500) {
                return $this->buildDirectRegionalPlan($corridor, $origLat, $origLng, $destLat, $destLng, $departureTime);
            }

            // Reverse direction check
            $dOrigRev = GeoCalculator::distanceMeters($origLat, $origLng, $corridor['to_lat'], $corridor['to_lng']);
            $dDestRev = GeoCalculator::distanceMeters($destLat, $destLng, $corridor['from_lat'], $corridor['from_lng']);
            if ($dOrigRev <= 3500 && $dDestRev <= 3500) {
                $revCorridor = $corridor;
                $revCorridor['from_name'] = $corridor['to_name'];
                $revCorridor['to_name'] = $corridor['from_name'];
                $revCorridor['from_lat'] = $corridor['to_lat'];
                $revCorridor['from_lng'] = $corridor['to_lng'];
                $revCorridor['to_lat'] = $corridor['from_lat'];
                $revCorridor['to_lng'] = $corridor['from_lng'];
                return $this->buildDirectRegionalPlan($revCorridor, $origLat, $origLng, $destLat, $destLng, $departureTime);
            }
        }

        return null;
    }

    private function buildDirectRegionalPlan(
        array $corridor,
        float $origLat,
        float $origLng,
        float $destLat,
        float $destLng,
        Carbon $departureTime
    ): array {
        $arrivalTime = $departureTime->copy()->addSeconds($corridor['duration_sec']);
        $fromId = 'corridor_from_' . substr(md5($corridor['from_name']), 0, 8);
        $toId = 'corridor_to_' . substr(md5($corridor['to_name']), 0, 8);

        $leg = [
            'type' => 'transit',
            'leg_type' => 'transit',
            'mode' => $corridor['mode'],
            'transit_mode_id' => 7,
            'route_variant_id' => null,
            'route' => [
                'id' => null,
                'short_name' => 'خط مباشر',
                'long_name' => $corridor['name_ar'],
                'long_name_ar' => $corridor['name_ar'],
                'color' => '#d97706',
            ],
            'agency_id' => null,
            'from_stop' => [
                'id' => $fromId,
                'name' => $corridor['from_name'],
                'name_ar' => $corridor['from_name'],
                'lat' => $corridor['from_lat'],
                'lng' => $corridor['from_lng'],
                'is_interchange' => false,
                'parent_station_id' => null,
            ],
            'to_stop' => [
                'id' => $toId,
                'name' => $corridor['to_name'],
                'name_ar' => $corridor['to_name'],
                'lat' => $corridor['to_lat'],
                'lng' => $corridor['to_lng'],
                'is_interchange' => false,
                'parent_station_id' => null,
            ],
            'from_lat' => $origLat,
            'from_lng' => $origLng,
            'to_lat' => $destLat,
            'to_lng' => $destLng,
            'departure_time' => $departureTime,
            'arrival_time' => $arrivalTime,
            'duration_sec' => $corridor['duration_sec'],
            'distance_meters' => $corridor['distance_meters'],
            'distance_m' => $corridor['distance_meters'],
            'fare' => $corridor['fare'],
            'geometry' => [
                [$origLat, $origLng],
                [$corridor['from_lat'], $corridor['from_lng']],
                [$corridor['to_lat'], $corridor['to_lng']],
                [$destLat, $destLng],
            ],
            'walk_source' => null,
            'geometry_source' => 'verified_corridor',
            'leg_steps' => [
                [
                    'instruction' => "اركب من {$corridor['from_name']} باتجاه {$corridor['to_name']}",
                    'instruction_en' => "Board at {$corridor['from_name']} towards {$corridor['to_name']}",
                    'distance_meters' => $corridor['distance_meters'],
                    'duration_sec' => $corridor['duration_sec'],
                    'type' => 'depart',
                ],
                [
                    'instruction' => "الوصول إلى {$corridor['to_name']}",
                    'instruction_en' => "Arrive at {$corridor['to_name']}",
                    'distance_meters' => 0,
                    'duration_sec' => 0,
                    'type' => 'arrive',
                ],
            ],
            'reliability' => 0.90,
            'data_source' => 'verified',
            'fare_status' => 'estimated',
        ];

        $minutes = max(5, (int) round($corridor['duration_sec'] / 60));

        return [
            'legs' => [$leg],
            'transfers' => [],
            'total_duration_sec' => $corridor['duration_sec'],
            'total_transfers' => 0,
            'walk_distance_meters' => 0,
            'fare' => ['amount' => $corridor['fare'], 'currency' => 'EGP'],
            'score' => 90.0,
            'reliability' => 0.90,
            'recommended' => true,
            'summary_ar' => "⏱ حوالي {$minutes} دقيقة • 💰 {$corridor['fare']} جنيه • ميكروباص مباشر بدون تبديل",
        ];
    }

    /**
     * Realistic Egyptian microbus/feeder fare calculation by distance.
     */
    public function calculateMicrobusFare(int $distanceMeters): float
    {
        $km = $distanceMeters / 1000.0;
        if ($km <= 4.0) {
            return 5.50;
        } elseif ($km <= 8.0) {
            return 7.50;
        } elseif ($km <= 15.0) {
            return 10.00;
        } elseif ($km <= 25.0) {
            return 15.00;
        } elseif ($km <= 50.0) {
            return 25.00;
        } else {
            return 40.00;
        }
    }

    /**
     * Realistic Egyptian vehicle duration based on urban vs highway distance.
     */
    private function calculateFeederDurationSec(int $distanceMeters): int
    {
        $km = $distanceMeters / 1000.0;
        if ($km <= 10.0) {
            // Urban traffic speed ~ 22 km/h
            $speedKmh = 22.0;
        } elseif ($km <= 30.0) {
            // Ring road / mixed speed ~ 35 km/h
            $speedKmh = 35.0;
        } else {
            // Highway speed ~ 65 km/h
            $speedKmh = 65.0;
        }

        $hours = $km / $speedKmh;
        return max(300, (int) round($hours * 3600)); // Minimum 5 mins
    }
}
