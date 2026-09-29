<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. transit_modes
        Schema::table('transit_modes', function (Blueprint $table) {
            if (!Schema::hasColumn('transit_modes', 'code')) {
                $table->string('code', 50)->nullable()->after('id');
            }
            if (!Schema::hasColumn('transit_modes', 'name_ar')) {
                $table->string('name_ar', 100)->nullable()->after('name');
            }
            if (!Schema::hasColumn('transit_modes', 'color')) {
                $table->string('color', 7)->nullable()->after('name_ar');
            }
            if (!Schema::hasColumn('transit_modes', 'active')) {
                $table->boolean('active')->default(true)->after('icon');
            }
        });

        // Backfill transit_modes
        $modeData = [
            'metro' => ['code' => 'metro', 'name_ar' => 'مترو الأنفاق', 'color' => '#E11D48'],
            'lrt' => ['code' => 'lrt', 'name_ar' => 'القطار الكهربائي الخفيف LRT', 'color' => '#2563EB'],
            'monorail' => ['code' => 'monorail', 'name_ar' => 'مونوريل شرق/غرب النيل', 'color' => '#059669'],
            'brt' => ['code' => 'brt', 'name_ar' => 'أتوبيس ترددي BRT', 'color' => '#D97706'],
            'train' => ['code' => 'train', 'name_ar' => 'قطارات السكة الحديد ENR', 'color' => '#7C3AED'],
            'rail' => ['code' => 'train', 'name_ar' => 'قطارات السكة الحديد ENR', 'color' => '#7C3AED'],
            'bus' => ['code' => 'bus', 'name_ar' => 'أتوبيس هيئة النقل العام', 'color' => '#0284C7'],
            'minibus' => ['code' => 'bus', 'name_ar' => 'ميني باص', 'color' => '#0D9488'],
            'microbus' => ['code' => 'bus', 'name_ar' => 'ميكروباص', 'color' => '#EA580C'],
            'walking' => ['code' => 'walk', 'name_ar' => 'سير على الأقدام', 'color' => '#64748B'],
        ];

        foreach ($modeData as $name => $meta) {
            DB::table('transit_modes')
                ->where('name', $name)
                ->whereNull('code')
                ->update([
                    'code' => $meta['code'],
                    'name_ar' => $meta['name_ar'],
                    'color' => $meta['color'],
                    'active' => true,
                ]);
        }

        // Fill any remaining null codes with the name
        DB::statement("UPDATE transit_modes SET code = LOWER(name) WHERE code IS NULL");

        // 2. transit_operators
        Schema::table('transit_operators', function (Blueprint $table) {
            if (!Schema::hasColumn('transit_operators', 'code')) {
                $table->string('code', 50)->nullable()->after('id');
            }
            if (!Schema::hasColumn('transit_operators', 'name_ar')) {
                $table->string('name_ar', 100)->nullable()->after('name');
            }
            if (!Schema::hasColumn('transit_operators', 'active')) {
                $table->boolean('active')->default(true)->after('name_ar');
            }
        });

        // Copy short_code to code if present
        if (Schema::hasColumn('transit_operators', 'short_code')) {
            DB::statement("UPDATE transit_operators SET code = short_code WHERE code IS NULL AND short_code IS NOT NULL");
        }

        $operatorNamesAr = [
            'CMA' => 'هيئة مترو القاهرة',
            'NAT' => 'الهيئة القومية للأنفاق',
            'ENR' => 'سكك حديد مصر',
            'BRT_CAIRO' => 'أتوبيس القاهرة الترددي',
            'CTA' => 'هيئة النقل العام بالقاهرة',
            'ATRA' => 'هيئة نقل الركاب بالإسكندرية',
            'GBC' => 'شركة أتوبيس الجيزة',
            'PMOA' => 'جمعية الميني باص الخاص',
        ];

        foreach ($operatorNamesAr as $code => $nameAr) {
            DB::table('transit_operators')
                ->where(function($q) use ($code) {
                    $q->where('code', $code)->orWhere('short_code', $code);
                })
                ->whereNull('name_ar')
                ->update(['name_ar' => $nameAr, 'active' => true]);
        }
    }

    public function down(): void
    {
        Schema::table('transit_modes', function (Blueprint $table) {
            $table->dropColumn(['code', 'name_ar', 'color', 'active']);
        });

        Schema::table('transit_operators', function (Blueprint $table) {
            $table->dropColumn(['code', 'name_ar', 'active']);
        });
    }
};
