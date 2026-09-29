<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Backfill Arabic names in transit_stops
        $this->backfillArabicStopNames();

        // 2. Backfill parent stations and interchange flags
        $this->backfillParentStationsAndInterchanges();

        // 3. Seed transfers table for interchanges
        $this->seedTransfers();

        // 4. Backfill route_stops distance_m and travel_time_s
        $this->backfillRouteStops();

        // 5. Backfill stop_times route_stop_id
        $this->backfillStopTimesRouteStopId();
    }

    private function backfillArabicStopNames(): void
    {
        // Source 1: metro stations dictionary
        $metroStops = [
            'Helwan' => 'حلوان', 'Ain Helwan' => 'عين حلوان', 'Helwan University' => 'جامعة حلوان',
            'Wadi Hof' => 'وادي حوف', 'Hadayeq Helwan' => 'حدائق حلوان', 'El-Maasara' => 'المعصرة',
            'Tora El-Asmant' => 'طرة الأسمنت', 'Kotsika' => 'كوتسيكا', 'Tora El-Balad' => 'طرة البلد',
            'Sakanat El-Maadi' => 'ثكنات المعادي', 'Maadi' => 'المعادي', 'Hadayeq El-Maadi' => 'حدائق المعادي',
            'Dar El-Salam' => 'دار السلام', 'El-Zahraa' => 'الزهراء', 'Mar Girgis' => 'مار جرجس',
            'El-Malek El-Saleh' => 'الملك الصالح', 'Sayeda Zeinab' => 'السيدة زينب', 'Saad Zaghloul' => 'سعد زغلول',
            'Sadat (Tahrir)' => 'السادات (التحرير)', 'Sadat' => 'السادات', 'Gamal Abdel Nasser' => 'جمال عبد الناصر',
            'Nasser' => 'جمال عبد الناصر', 'Orabi' => 'أحمد عرابي', 'Al-Shohadaa (Ramses)' => 'الشهداء (رمسيس)',
            'Al-Shohadaa' => 'الشهداء', 'Shohadaa' => 'الشهداء', 'Ramses' => 'رمسيس',
            'Ghamra' => 'غمرة', 'El-Demerdash' => 'الدمرداش', 'Manshiet El-Sadr' => 'منشية الصدر',
            'Kobri El-Qobba' => 'كوبري القبة', 'Hammamat El-Qobba' => 'حمامات القبة', 'Saray El-Qobba' => 'سراي القبة',
            'Hadayeq El-Zaytoun' => 'حدائق الزيتون', 'Helmeyet El-Zaytoun' => 'حلمية الزيتون', 'El-Matareyya' => 'المطرية',
            'Ain Shams' => 'عين شمس', 'Ezbet El-Nakhl' => 'عزبة النخل', 'El-Marg' => 'المرج', 'New El-Marg' => 'المرج الجديدة',
            'El-Moneeb' => 'المنيب', 'Moneeb' => 'المنيب', 'Sakiat Mekki' => 'ساقية مكي', 'Omm El-Masryeen' => 'أم المصريين',
            'Giza Station' => 'محطة الجيزة', 'Giza' => 'الجيزة', 'Faisal' => 'فيصل', 'Cairo University' => 'جامعة القاهرة',
            'El-Bohoth' => 'البحوث', 'Dokki' => 'الدقي', 'Opera' => 'الأوبرا', 'Mohamed Naguib' => 'محمد نجيب',
            'Al-Ataba' => 'العتبة', 'Attaba' => 'العتبة', 'Massara' => 'مسرة', 'Rod El-Farag' => 'روض الفرج',
            'St. Teresa' => 'سانت تريزا', 'Khalafawy' => 'الخلفاوي', 'Mezallat' => 'المظلات',
            'Kolleyet El-Zeraa' => 'كلية الزراعة', 'Shubra El-Kheima' => 'شبرا الخيمة',
            'Adly Mansour' => 'عدلي منصور المركزية', 'Adly Mansour Central' => 'عدلي منصور المركزية',
            'El-Haykestep' => 'الهايكستب', 'Omar Ibn El-Khattab' => 'عمر بن الخطاب', 'Qobaa' => 'قباء',
            'Hisham Barakat' => 'هشام بركات', 'El-Nozha' => 'النزهة', 'Nadi El-Shams' => 'نادي الشمس',
            'Alf Maskan' => 'ألف مسكن', 'Heliopolis' => 'هليوبوليس', 'Haroun' => 'هارون', 'Al-Ahram' => 'الأهرام',
            'Koleyet El-Banat' => 'كلية البنات', 'The Stadium' => 'الاستاد', 'Stadium' => 'الاستاد',
            'Fair Zone' => 'أرض المعارض', 'Abbassiya' => 'العباسية', 'Abdou Pasha' => 'عبده باشا',
            'El-Geish' => 'الجيش', 'Bab El-Shaariya' => 'باب الشعرية', 'Maspero' => 'ماسبيرو',
            'Safaa Hijazi' => 'صفاء حجازي', 'Zamalek' => 'الزمالك', 'Kit Kat' => 'الكيت كات',
            'Sudan' => 'السودان', 'Imbaba' => 'إمبابة', 'El-Bohy' => 'البوهي', 'El-Qawmia' => 'القومية العربية',
            'Ring Road' => 'الطريق الدائري', 'Rod El Farag Corridor' => 'محور روض الفرج',
            'Tawfikia' => 'التوفيقية', 'Wadi El-Nile' => 'وادي النيل', 'Gamet El-Dowal' => 'جامعة الدول العربية',
            'Boulak El-Dakrour' => 'بولاق الدكرور',
        ];

        foreach ($metroStops as $en => $ar) {
            DB::table('transit_stops')
                ->where(function($q) use ($en) {
                    $q->where('name', $en)
                      ->orWhere('name', 'like', "%{$en}%");
                })
                ->whereNull('name_ar')
                ->update(['name_ar' => $ar]);
        }

        // For remaining stops without name_ar, if name is already Arabic use it, else provide Arabic label
        DB::statement("UPDATE transit_stops SET name_ar = name WHERE name_ar IS NULL");
    }

    private function backfillParentStationsAndInterchanges(): void
    {
        // Major physical interchange hubs in Cairo
        $interchangeNames = [
            'السادات', 'الشهداء', 'العتبة', 'جمال عبد الناصر', 'جامعة القاهرة',
            'عدلي منصور', 'الكيت كات', 'الجيزة', 'الملك الصالح', 'روض الفرج'
        ];

        foreach ($interchangeNames as $hubName) {
            $stops = DB::table('transit_stops')
                ->where(function($q) use ($hubName) {
                    $q->where('name_ar', 'like', "%{$hubName}%")
                      ->orWhere('name', 'like', "%{$hubName}%");
                })
                ->get();

            if ($stops->count() >= 2) {
                // First stop becomes the parent station
                $parent = $stops->first();
                $childIds = $stops->pluck('id')->toArray();

                DB::table('transit_stops')
                    ->whereIn('id', $childIds)
                    ->update([
                        'parent_station_id' => $parent->id,
                        'is_interchange' => true,
                    ]);
            } elseif ($stops->count() === 1) {
                DB::table('transit_stops')
                    ->where('id', $stops->first()->id)
                    ->update(['is_interchange' => true]);
            }
        }
    }

    private function seedTransfers(): void
    {
        if (!Schema::hasTable('transfers')) return;

        // Find stops sharing the same parent_station_id
        $groups = DB::table('transit_stops')
            ->whereNotNull('parent_station_id')
            ->select('parent_station_id', DB::raw('GROUP_CONCAT(id) as stop_ids'))
            ->groupBy('parent_station_id')
            ->get();

        foreach ($groups as $g) {
            $ids = explode(',', $g->stop_ids);
            if (count($ids) < 2) continue;

            for ($i = 0; $i < count($ids); $i++) {
                for ($j = 0; $j < count($ids); $j++) {
                    if ($i === $j) continue;
                    $from = (int)$ids[$i];
                    $to = (int)$ids[$j];

                    DB::table('transfers')->updateOrInsert(
                        ['from_stop_id' => $from, 'to_stop_id' => $to],
                        [
                            'min_transfer_time_s' => 180,
                            'distance_m' => 60,
                            'is_accessible' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }
        }
    }

    private function backfillRouteStops(): void
    {
        // Compute distance and travel_time along variants
        $variants = DB::table('route_stops')->select('route_variant_id')->distinct()->pluck('route_variant_id');

        foreach ($variants as $variantId) {
            $stops = DB::table('route_stops')
                ->join('transit_stops', 'route_stops.transit_stop_id', '=', 'transit_stops.id')
                ->where('route_stops.route_variant_id', $variantId)
                ->orderBy('route_stops.sequence')
                ->select(
                    'route_stops.id as rs_id',
                    'route_stops.sequence',
                    'transit_stops.latitude',
                    'transit_stops.longitude'
                )
                ->get();

            $prevLat = null;
            $prevLng = null;

            foreach ($stops as $s) {
                if ($prevLat === null) {
                    $dist = 0;
                    $time = 0;
                } else {
                    $dist = $this->haversine($prevLat, $prevLng, $s->latitude, $s->longitude);
                    // Average transit speed: ~30 km/h = 8.3 m/s + 20s dwell
                    $time = (int) round(($dist / 8.3) + 20);
                }

                DB::table('route_stops')
                    ->where('id', $s->rs_id)
                    ->update([
                        'distance_m' => $dist,
                        'travel_time_s' => $time,
                        'is_timing_point' => ($s->sequence % 5 === 1),
                    ]);

                $prevLat = $s->latitude;
                $prevLng = $s->longitude;
            }
        }
    }

    private function backfillStopTimesRouteStopId(): void
    {
        // Link stop_times to route_stops using (schedules.route_variant_id, stop_times.transit_stop_id, stop_times.sequence)
        try {
            DB::statement("
                UPDATE stop_times st
                JOIN schedules s ON st.schedule_id = s.id
                JOIN route_stops rs ON rs.route_variant_id = s.route_variant_id
                    AND rs.transit_stop_id = st.transit_stop_id
                    AND rs.sequence = st.sequence
                SET st.route_stop_id = rs.id
                WHERE st.route_stop_id IS NULL
            ");
        } catch (\Throwable $e) {
            // SQLite or MariaDB fallback
            $unlinked = DB::table('stop_times')->whereNull('route_stop_id')->take(5000)->get();
            foreach ($unlinked as $st) {
                $variantId = DB::table('schedules')->where('id', $st->schedule_id)->value('route_variant_id');
                if ($variantId) {
                    $rsId = DB::table('route_stops')
                        ->where('route_variant_id', $variantId)
                        ->where('transit_stop_id', $st->transit_stop_id)
                        ->where('sequence', $st->sequence)
                        ->value('id');
                    if ($rsId) {
                        DB::table('stop_times')->where('id', $st->id)->update(['route_stop_id' => $rsId]);
                    }
                }
            }
        }
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return (int) round($earthRadius * $c);
    }

    public function down(): void
    {
        // Non-destructive data migration rollback: values can remain or be cleared
    }
};
