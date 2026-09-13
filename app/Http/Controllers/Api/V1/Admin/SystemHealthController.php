<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fare;
use App\Models\Route;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\ServiceAlert;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Admin system health — one real, honest snapshot for the control center:
 * network size, data freshness (import logs), AI provider status, and active
 * alerts. Never exposes credentials: the AI section reports provider name and
 * availability only.
 */
class SystemHealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $aiProvider = (string) config('ai.default', 'mock');
        $aiAvailable = $aiProvider === 'mock'
            ? true // offline demo engine is always available
            : (bool) config("ai.providers.{$aiProvider}.api_key"); // configured key = usable

        $latestImports = DB::table('data_import_logs')
            ->orderByDesc('imported_at')
            ->limit(3)
            ->get(['source', 'dataset_version', 'status', 'imported_at'])
            ->map(fn ($row) => [
                'source' => $row->source,
                'dataset_version' => $row->dataset_version,
                'status' => $row->status,
                'imported_at' => $row->imported_at,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'network' => [
                    'stops' => TransitStop::count(),
                    'routes' => Route::count(),
                    'active_variants' => RouteVariant::where('active', true)->count(),
                    'schedules' => Schedule::count(),
                    'operators' => TransitOperator::count(),
                    'fares' => [
                        'real' => Fare::where('data_status', 'real')->count(),
                        'demo_estimated' => Fare::where('data_status', 'demo_estimated')->count(),
                    ],
                ],
                'data_freshness' => [
                    'latest_imports' => $latestImports,
                ],
                'ai' => [
                    'provider' => $aiProvider,
                    'available' => $aiAvailable,
                    'disabled' => $aiProvider === 'disabled',
                ],
                // "Active" = now inside the alert's published active period (GTFS semantics).
        'alerts_active' => ServiceAlert::query()
            ->where('active_period_start', '<=', Carbon::now('Africa/Cairo'))
            ->where('active_period_end', '>=', Carbon::now('Africa/Cairo'))
            ->count(),
                'generated_at' => Carbon::now('Africa/Cairo')->toIso8601String(),
            ],
        ]);
    }
}
