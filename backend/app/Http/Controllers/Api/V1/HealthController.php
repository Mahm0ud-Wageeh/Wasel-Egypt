<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $dbOk = false;
        try {
            DB::connection()->getPdo();
            $dbOk = true;
        } catch (\Throwable) {
            $dbOk = false;
        }

        $osrmEnabled = (bool) config('services.osrm.enabled', env('OSRM_ENABLED', false));
        $osrmOk = false;
        if ($osrmEnabled) {
            try {
                $osrmUrl = rtrim((string) config('services.osrm.url', env('OSRM_URL', 'http://127.0.0.1:5001')), '/');
                $res = Http::timeout(2)->get("{$osrmUrl}/nearest/v1/driving/31.2357,30.0444");
                $osrmOk = $res->successful();
            } catch (\Throwable) {
                // In local environments without running OSRM container, internal fallback router handles routing
                $osrmOk = false;
            }
        } else {
            $osrmOk = true;
        }

        $fallbackCount = (int) \Illuminate\Support\Facades\Cache::get('osrm:fallback_count', 0);
        $healthy = $dbOk && (!$osrmEnabled || $osrmOk);
        $degraded = $dbOk && $osrmEnabled && !$osrmOk;

        return response()->json([
            'status' => $healthy ? 'ok' : ($degraded ? 'degraded' : 'unhealthy'),
            'database' => $dbOk,
            'osrm' => $osrmOk,
            'osrm_fallbacks' => $fallbackCount,
            'version' => (string) config('app.version', '1.0.0'),
            'timestamp' => now()->toIso8601String(),
        ], ($healthy || $degraded) ? 200 : 503);
    }
}
