<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. governorates
        Schema::table('governorates', function (Blueprint $table) {
            if (!Schema::hasColumn('governorates', 'name_ar')) {
                $table->string('name_ar', 100)->nullable()->after('name');
            }
        });

        $govMap = [
            'Cairo' => 'القاهرة',
            'Giza' => 'الجيزة',
            'Alexandria' => 'الإسكندرية',
            'Fayoum' => 'الفيوم',
            'Qalyubia' => 'القليوبية',
            'Sharqia' => 'الشرقية',
            'Gharbia' => 'الغربية',
            'Monufia' => 'المنوفية',
            'Beheira' => 'البحيرة',
            'Dakahlia' => 'الدقهلية',
            'Damietta' => 'دمياط',
            'Port Said' => 'بورسعيد',
            'Ismailia' => 'الإسماعيلية',
            'Suez' => 'السويس',
            'Beni Suef' => 'بني سويف',
            'Minya' => 'المنيا',
            'Asyut' => 'أسيوط',
            'Sohag' => 'سوهاج',
            'Qena' => 'قنا',
            'Luxor' => 'الأقصر',
            'Aswan' => 'أسوان',
            'Red Sea' => 'البحر الأحمر',
            'New Valley' => 'الوادي الجديد',
            'Matrouh' => 'مطروح',
            'North Sinai' => 'شمال سيناء',
            'South Sinai' => 'جنوب سيناء',
            'Kafr El Sheikh' => 'كفر الشيخ',
        ];

        foreach ($govMap as $en => $ar) {
            DB::table('governorates')->where('name', $en)->whereNull('name_ar')->update(['name_ar' => $ar]);
        }

        // 2. areas
        Schema::table('areas', function (Blueprint $table) {
            if (!Schema::hasColumn('areas', 'name_ar')) {
                $table->string('name_ar', 100)->nullable()->after('name');
            }
            if (!Schema::hasColumn('areas', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('name_ar');
            }
            if (!Schema::hasColumn('areas', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
            if (!Schema::hasColumn('areas', 'location_accuracy')) {
                $table->enum('location_accuracy', ['exact', 'approximate'])->default('approximate')->after('longitude');
            }
        });

        // 3. saved_places
        if (!Schema::hasTable('saved_places')) {
            Schema::create('saved_places', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('name', 100);
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->enum('type', ['home', 'work', 'favorite'])->default('favorite');
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index(['user_id', 'type']);
            });

            // Add virtual generated column for partial unique slot (home/work) in MySQL/MariaDB
            try {
                if (DB::getDriverName() === 'mysql') {
                    DB::statement("ALTER TABLE `saved_places` ADD COLUMN `type_unique_slot` VARCHAR(20) AS (CASE WHEN type IN ('home', 'work') THEN type ELSE NULL END) VIRTUAL");
                    DB::statement("ALTER TABLE `saved_places` ADD UNIQUE KEY `saved_places_user_slot_unique` (`user_id`, `type_unique_slot`)");
                }
            } catch (\Throwable $e) {}

            // Migrate favorite_locations if present
            if (Schema::hasTable('favorite_locations')) {
                $favs = DB::table('favorite_locations')->get();
                foreach ($favs as $f) {
                    $t = in_array($f->place_type, ['home', 'work']) ? $f->place_type : 'favorite';
                    DB::table('saved_places')->insert([
                        'user_id' => $f->user_id,
                        'name' => $f->name,
                        'latitude' => $f->latitude,
                        'longitude' => $f->longitude,
                        'type' => $t,
                        'created_at' => $f->created_at ?? now(),
                        'updated_at' => $f->updated_at ?? now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_places');

        Schema::table('areas', function (Blueprint $table) {
            $table->dropColumn(['name_ar', 'latitude', 'longitude', 'location_accuracy']);
        });

        Schema::table('governorates', function (Blueprint $table) {
            $table->dropColumn('name_ar');
        });
    }
};
