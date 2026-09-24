<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelemetryStreamController extends Controller
{
    /**
     * Get live telemetry snapshot of running BRT buses, LRT, Monorail and Metro lines.
     */
    public function snapshot(): JsonResponse
    {
        $time = microtime(true);

        $routes = [
            [
                'id' => 'METRO-L1-04',
                'line' => 'الخط الأول (حلوان - المرج)',
                'mode' => 'metro',
                'headsign' => 'حلوان ↔ المرج الجديدة',
                'color' => '#10B981',
                'waypoints' => [
                    ['lat' => 29.8492, 'lng' => 31.3342, 'name' => 'حلوان'],
                    ['lat' => 29.9590, 'lng' => 31.2610, 'name' => 'المعادي'],
                    ['lat' => 30.0444, 'lng' => 31.2357, 'name' => 'السادات'],
                    ['lat' => 30.0610, 'lng' => 31.2460, 'name' => 'الشهداء (رمسيس)'],
                    ['lat' => 30.1652, 'lng' => 31.3382, 'name' => 'المرج الجديدة'],
                ],
                'speed_base' => 65,
                'period' => 120,
            ],
            [
                'id' => 'METRO-L2-11',
                'line' => 'الخط الثاني (شبرا - المنيب)',
                'mode' => 'metro',
                'headsign' => 'شبرا الخيمة ↔ المنيب',
                'color' => '#EF4444',
                'waypoints' => [
                    ['lat' => 30.1235, 'lng' => 31.2450, 'name' => 'شبرا الخيمة'],
                    ['lat' => 30.0610, 'lng' => 31.2460, 'name' => 'الشهداء'],
                    ['lat' => 30.0444, 'lng' => 31.2357, 'name' => 'السادات'],
                    ['lat' => 30.0260, 'lng' => 31.2080, 'name' => 'جامعة القاهرة'],
                    ['lat' => 29.9815, 'lng' => 31.2120, 'name' => 'المنيب'],
                ],
                'speed_base' => 60,
                'period' => 100,
            ],
            [
                'id' => 'METRO-L3-22',
                'line' => 'الخط الثالث الأخضر',
                'mode' => 'metro',
                'headsign' => 'عدلي منصور ↔ الكيت كات / جامعة القاهرة',
                'color' => '#3B82F6',
                'waypoints' => [
                    ['lat' => 30.1469, 'lng' => 31.4206, 'name' => 'عدلي منصور'],
                    ['lat' => 30.1110, 'lng' => 31.3380, 'name' => 'هيليوبوليس'],
                    ['lat' => 30.0890, 'lng' => 31.3270, 'name' => 'الأهرام'],
                    ['lat' => 30.0520, 'lng' => 31.2420, 'name' => 'العتبة'],
                    ['lat' => 30.0620, 'lng' => 31.2130, 'name' => 'الكيت كات'],
                ],
                'speed_base' => 70,
                'period' => 90,
            ],
            [
                'id' => 'LRT-CAPITAL-01',
                'line' => 'القطار الكهربائي الخفيف (LRT)',
                'mode' => 'lrt',
                'headsign' => 'عدلي منصور ↔ مدينة الفنون والثقافة',
                'color' => '#8B5CF6',
                'waypoints' => [
                    ['lat' => 30.1469, 'lng' => 31.4206, 'name' => 'عدلي منصور'],
                    ['lat' => 30.1410, 'lng' => 31.4920, 'name' => 'العبور'],
                    ['lat' => 30.1380, 'lng' => 31.6050, 'name' => 'الشروق'],
                    ['lat' => 30.1180, 'lng' => 31.6880, 'name' => 'بدر'],
                    ['lat' => 30.0070, 'lng' => 31.7450, 'name' => 'مدينة الفنون بالعاصمة'],
                ],
                'speed_base' => 95,
                'period' => 140,
            ],
            [
                'id' => 'MONORAIL-E03',
                'line' => 'مونوريل شرق النيل',
                'mode' => 'monorail',
                'headsign' => 'الاستاد ↔ العاصمة الإدارية',
                'color' => '#EC4899',
                'waypoints' => [
                    ['lat' => 30.0712, 'lng' => 31.3190, 'name' => 'الاستاد'],
                    ['lat' => 30.0530, 'lng' => 31.3650, 'name' => 'المشير طنطاوي'],
                    ['lat' => 30.0380, 'lng' => 31.4650, 'name' => 'التجمع الخامس (المستثمرين)'],
                    ['lat' => 30.0210, 'lng' => 31.5720, 'name' => 'الجامعة الأمريكية'],
                    ['lat' => 30.0120, 'lng' => 31.7310, 'name' => 'حي السفارات بالعاصمة'],
                ],
                'speed_base' => 75,
                'period' => 110,
            ],
            [
                'id' => 'BRT-RING-101',
                'line' => 'أوتوبيس التردد السريع (BRT)',
                'mode' => 'brt',
                'headsign' => 'محور المشير ↔ موقف العاشر (السلام)',
                'color' => '#F59E0B',
                'waypoints' => [
                    ['lat' => 30.0150, 'lng' => 31.3300, 'name' => 'محور المشير'],
                    ['lat' => 30.0450, 'lng' => 31.3850, 'name' => 'أكاديمية الشرطة'],
                    ['lat' => 30.0950, 'lng' => 31.4120, 'name' => 'السويس / ألماظة'],
                    ['lat' => 30.1550, 'lng' => 31.4250, 'name' => 'موقف العاشر (السلام)'],
                ],
                'speed_base' => 50,
                'period' => 80,
            ],
            [
                'id' => 'BRT-RING-104',
                'line' => 'أوتوبيس التردد السريع (BRT جنوب)',
                'mode' => 'brt',
                'headsign' => 'دائري المنيب ↔ التجمع الخامس',
                'color' => '#F59E0B',
                'waypoints' => [
                    ['lat' => 29.9800, 'lng' => 31.2500, 'name' => 'دائري المنيب'],
                    ['lat' => 29.9700, 'lng' => 31.3050, 'name' => 'الأوتوستراد / البساتين'],
                    ['lat' => 29.9820, 'lng' => 31.3650, 'name' => 'كارفور المعادي'],
                    ['lat' => 30.0150, 'lng' => 31.4300, 'name' => 'مدخل القاهرة الجديدة'],
                ],
                'speed_base' => 55,
                'period' => 85,
            ],
        ];

        $vehicles = [];

        foreach ($routes as $route) {
            $wps = $route['waypoints'];
            $n = count($wps);
            if ($n < 2) continue;

            // Ping-pong progress (0 to 1 and back to 0)
            $cycle = fmod($time, $route['period']) / $route['period']; // 0.0 .. 1.0
            $progress = $cycle < 0.5 ? ($cycle * 2.0) : (2.0 - $cycle * 2.0); // 0 -> 1 -> 0
            
            $scaledIdx = $progress * ($n - 1);
            $segmentIdx = min($n - 2, (int) floor($scaledIdx));
            $t = $scaledIdx - $segmentIdx;

            $p1 = $wps[$segmentIdx];
            $p2 = $wps[$segmentIdx + 1];

            $lat = $p1['lat'] + ($p2['lat'] - $p1['lat']) * $t;
            $lng = $p1['lng'] + ($p2['lng'] - $p1['lng']) * $t;

            // Compute bearing
            $dLng = deg2rad($p2['lng'] - $p1['lng']);
            $y = sin($dLng) * cos(deg2rad($p2['lat']));
            $x = cos(deg2rad($p1['lat'])) * sin(deg2rad($p2['lat'])) - sin(deg2rad($p1['lat'])) * cos(deg2rad($p2['lat'])) * cos($dLng);
            $bearing = (int) round((rad2deg(atan2($y, $x)) + 360) % 360);

            // Speed variation
            $speed = (int) ($route['speed_base'] + sin($time / 5) * 8);

            $occupancies = ['low', 'moderate', 'moderate', 'crowded'];
            $occIdx = ((int) ($lat * 1000 + $lng * 1000)) % count($occupancies);

            $vehicles[] = [
                'id' => $route['id'],
                'line' => $route['line'],
                'mode' => $route['mode'],
                'headsign' => $route['headsign'],
                'color' => $route['color'],
                'lat' => round($lat, 6),
                'lng' => round($lng, 6),
                'bearing' => $bearing,
                'speed_kmh' => max(20, $speed),
                'next_stop' => $cycle < 0.5 ? $p2['name'] : $p1['name'],
                'eta_next_stop_mins' => max(1, (int) round((1 - $t) * 4)),
                'occupancy' => $occupancies[$occIdx],
                'status' => 'on_time',
            ];
        }

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601String(),
            'active_vehicles_count' => count($vehicles),
            'data' => $vehicles,
        ]);
    }
}
