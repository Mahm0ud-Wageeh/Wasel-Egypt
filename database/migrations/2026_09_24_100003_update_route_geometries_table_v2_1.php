<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('route_geometries')) {
            Schema::create('route_geometries', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('route_variant_id')->unique();
                $table->longText('shape')->comment('Encoded polyline / GeoJSON LineString coordinates');
                $table->integer('point_count')->default(0);
                $table->unsignedInteger('length_meters')->nullable();
                $table->timestamps();

                $table->foreign('route_variant_id')->references('id')->on('route_variants')->onDelete('cascade');
            });
        } else {
            Schema::table('route_geometries', function (Blueprint $table) {
                if (!Schema::hasColumn('route_geometries', 'length_meters')) {
                    $table->unsignedInteger('length_meters')->nullable()->after('point_count');
                }
            });
        }

        // Migrate data from route_geometry to route_geometries
        if (Schema::hasTable('route_geometry')) {
            $rows = DB::table('route_geometry')->get();
            foreach ($rows as $row) {
                $coords = json_decode($row->geometry, true);
                $pointCount = is_array($coords) ? count($coords) : 0;

                DB::table('route_geometries')->updateOrInsert(
                    ['route_variant_id' => $row->route_variant_id],
                    [
                        'shape' => $row->geometry,
                        'point_count' => $pointCount,
                        'created_at' => $row->created_at ?? now(),
                        'updated_at' => $row->updated_at ?? now(),
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('route_geometries');
    }
};
