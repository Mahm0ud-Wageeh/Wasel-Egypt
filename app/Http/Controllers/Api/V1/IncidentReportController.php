<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\IncidentReportResource;
use App\Models\IncidentReport;
use App\Models\IncidentVote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class IncidentReportController extends Controller
{
    /**
     * Display a listing of incident reports.
     */
    public function index(Request $request)
    {
        $query = IncidentReport::with(['route', 'transitStop', 'votes']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('kind')) {
            $query->where('kind', $request->input('kind'));
        }

        if ($request->filled('route_id')) {
            $query->where('route_id', $request->input('route_id'));
        }

        if ($request->filled('transit_stop_id')) {
            $query->where('transit_stop_id', $request->input('transit_stop_id'));
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $reports = $query->orderByDesc('created_at')->paginate($perPage);

        return IncidentReportResource::collection($reports);
    }

    /**
     * Store a newly created incident report.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'route_id' => ['nullable', 'exists:routes,id'],
            'transit_stop_id' => ['nullable', 'exists:transit_stops,id'],
            'kind' => ['required', 'string', 'in:delay,crowd,elevator,safety'],
            'severity' => ['required', 'string', 'in:low,med,high'],
            'description' => ['required', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        if (empty($validated['route_id']) && empty($validated['transit_stop_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'At least one of route_id or transit_stop_id must be provided.',
            ], 422);
        }

        $report = IncidentReport::create([
            'user_id' => Auth::id(),
            'route_id' => $validated['route_id'] ?? null,
            'transit_stop_id' => $validated['transit_stop_id'] ?? null,
            'kind' => $validated['kind'],
            'severity' => $validated['severity'],
            'status' => 'pending',
            'description' => $validated['description'],
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'confirms' => 0,
            'denies' => 0,
            'trust_score' => 1.0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Incident report submitted successfully',
            'data' => new IncidentReportResource($report->load(['route', 'transitStop'])),
        ], 201);
    }

    /**
     * Display the specified incident report.
     */
    public function show($id)
    {
        $report = IncidentReport::with(['route', 'transitStop', 'votes'])->find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Incident report not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new IncidentReportResource($report),
        ]);
    }

    /**
     * Vote on an incident report (one vote per user, counters updated in a transaction).
     */
    public function vote(Request $request, $id)
    {
        $validated = $request->validate([
            'vote' => ['required', 'string', 'in:confirm,deny'],
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $report = IncidentReport::find($id);
        if (!$report) {
            return response()->json(['success' => false, 'message' => 'Incident report not found'], 404);
        }

        // A second vote from the same user is rejected
        $existingVote = IncidentVote::where('incident_report_id', $report->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existingVote) {
            return response()->json([
                'success' => false,
                'message' => 'You have already voted on this incident report.',
            ], 409);
        }

        DB::transaction(function () use ($report, $user, $validated) {
            IncidentVote::create([
                'incident_report_id' => $report->id,
                'user_id' => $user->id,
                'vote' => $validated['vote'],
                'created_at' => now(),
            ]);

            $report->recalculateVotes();
        });

        $report->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Vote recorded successfully',
            'data' => [
                'incident_report_id' => $report->id,
                'vote' => $validated['vote'],
                'confirms' => (int) $report->confirms,
                'denies' => (int) $report->denies,
            ],
        ]);
    }
}
