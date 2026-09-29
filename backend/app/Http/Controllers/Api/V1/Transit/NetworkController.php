<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\CommunityReport;
use App\Models\Fare;
use App\Models\Governorate;
use App\Models\Route;
use App\Models\RouteGeometry;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\ServiceAlert;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Verified network snapshot for the public landing page and dashboards.
 * Every number is computed from the database — the landing page must
 * never display invented metrics. Cached briefly; cheap aggregates only.
 */
class NetworkController extends Controller
{
    public function stats(): JsonResponse
    {
        $stats = Cache::remember('network.stats', 300, function () {
            $now = now();

            $activeAlerts = ServiceAlert::query()
                ->where('active_period_start', '<=', $now)
                ->where(function ($q) use ($now) {
                    $q->whereNull('active_period_end')->orWhere('active_period_end', '>=', $now);
                })->count();

            $modes = TransitMode::query()
                ->withCount(['routes' => fn ($q) => $q->where('active', true)])
                ->get(['id', 'name', 'icon'])
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'icon' => $m->icon,
                    'routes' => $m->routes_count,
                ])
                ->filter(fn ($m) => $m['routes'] > 0 || $m['name'] === 'walking')
                ->values();

            $metroFares = Fare::query()
                ->active()
                ->where('data_status', 'real')
                ->count();

            $demoFares = Fare::query()
                ->active()
                ->where('data_status', 'demo_estimated')
                ->count();

            return [
                'stops' => TransitStop::query()->count(),
                'routes' => Route::query()->where('active', true)->count(),
                'route_variants' => RouteVariant::query()->count(),
                'variants_with_geometry' => RouteGeometry::query()->count(),
                'modes' => $modes,
                'mode_count' => $modes->count(),
                'operators' => TransitOperator::query()->count(),
                'metro_lines' => Route::query()
                    ->where('active', true)
                    ->whereHas('transitMode', fn ($q) => $q->where('name', 'metro'))
                    ->count(),
                'schedules' => Schedule::query()->count(),
                'governorates' => Governorate::query()->count(),
                'areas' => Area::query()->count(),
                'active_alerts' => $activeAlerts,
                'public_reports' => CommunityReport::query()
                    ->whereIn('status', ['verified', 'resolved'])
                    ->count(),
                'fares' => [
                    'real_rows' => $metroFares,
                    'demo_estimated_rows' => $demoFares,
                ],
            ];
        });

        return response()->json([
            'data' => $stats,
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'source' => 'live database',
            ],
        ]);
    }
}
