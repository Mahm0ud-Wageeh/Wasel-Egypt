<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Requests\AnalyticsDateRangeRequest;
use App\Services\Analytics\AdminAnalyticsService;

/**
 * Admin dashboard analytics endpoints. The route group enforces
 * auth:sanctum + role:admin; the service methods are aggregation-only.
 */
class AnalyticsController extends AuthController
{
    public function __construct(private AdminAnalyticsService $analytics)
    {
    }

    public function dashboard(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->dashboard($from, $to),
        ]);
    }

    public function journeys(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->journeys($from, $to),
        ]);
    }

    public function deviations(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->deviations($from, $to),
        ]);
    }

    public function usage(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->usage($from, $to),
        ]);
    }

    public function reports(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->reports($from, $to),
        ]);
    }

    public function trust(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->trust($from, $to),
        ]);
    }

    public function notifications(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->notifications($from, $to),
        ]);
    }

    public function modes(AnalyticsDateRangeRequest $request)
    {
        [$from, $to] = $request->range();

        return response()->json([
            'success' => true,
            'data' => $this->analytics->modes($from, $to),
        ]);
    }
}
