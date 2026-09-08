<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Requests\ReportModerationRequest;
use App\Http\Requests\StoreReportRequest;
use App\Http\Resources\CommunityReportResource;
use App\Http\Resources\ReportModerationResource;
use App\Models\CommunityReport;
use App\Models\User;
use App\Services\Reports\ReportService;
use App\Services\Reports\TrustScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class CommunityReportController extends AuthController
{
    public function __construct(
        private ReportService $reportService,
        private TrustScoreService $trust,
        private \App\Repositories\Contracts\CommunityReportRepositoryInterface $reports,
    ) {
    }

    /**
     * Create a community report (authenticated users).
     */
    public function store(StoreReportRequest $request)
    {
        try {
            $report = $this->reportService->create(Auth::user(), $request->validated());
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'Report submitted successfully and is pending moderation.',
            'data' => new CommunityReportResource($report->load(['relatedStop', 'relatedRoute'])),
        ], 201);
    }

    /**
     * List reports: own reports for regular users, all reports for
     * moderators/admins (with optional filters).
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $isStaff = $user->hasAnyRole(['moderator', 'admin']);

        $filters = ['per_page' => (int) $request->input('per_page', 15)];

        if (!$isStaff) {
            $filters['scope_user_id'] = $user->id;
        } elseif ($request->has('user_id')) {
            $filters['user_id'] = $request->input('user_id');
        }

        foreach (['status', 'report_type', 'related_stop_id', 'related_route_id'] as $key) {
            if ($request->has($key)) {
                $filters[$key] = $request->input($key);
            }
        }

        $reports = $this->reports->paginate($filters);

        return response()->json([
            'success' => true,
            'data' => CommunityReportResource::collection($reports->items()),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    /**
     * Show a report: owner, moderator or admin.
     */
    public function show($id)
    {
        $response = $this->authorizeReport($id);
        if ($response !== null) {
            return $response;
        }

        $report = $this->reports->findWithRelations((int) $id);

        if (!$report) {
            return $this->notFound('Report not found');
        }

        return response()->json([
            'success' => true,
            'data' => new CommunityReportResource($report),
        ]);
    }

    /**
     * Delete a report: owner (only while pending) or admin (any status).
     */
    public function destroy($id)
    {
        $user = Auth::user();

        if (!$user) {
            return $this->unauthenticated();
        }

        $report = $this->reports->find((int) $id);

        if (!$report) {
            return $this->notFound('Report not found');
        }

        $isAdmin = $user->hasRole('admin');

        if ($report->user_id !== $user->id && !$isAdmin) {
            return $this->forbidden('Only the report owner or an admin can delete it.');
        }

        if ($report->user_id === $user->id && !$isAdmin && $report->status !== 'pending') {
            return $this->conflict('Only pending reports can be deleted by their author.');
        }

        $report->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report deleted successfully',
        ]);
    }

    /**
     * Moderation history of a report (owner, moderator or admin).
     */
    public function moderations($id)
    {
        $response = $this->authorizeReport($id);
        if ($response !== null) {
            return $response;
        }

        $report = $this->reports->find((int) $id);

        if (!$report) {
            return $this->notFound('Report not found');
        }

        $moderations = $report->reportModerations()
            ->with('moderator')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => ReportModerationResource::collection($moderations),
        ]);
    }

    /**
     * Apply a moderation action (moderator or admin).
     */
    public function moderate(ReportModerationRequest $request, $id)
    {
        $report = $this->reports->find((int) $id);

        if (!$report) {
            return $this->notFound('Report not found');
        }

        $validated = $request->validated();

        try {
            [$report, $moderation] = $this->reportService->moderate(
                Auth::user(),
                $report,
                $validated['action_taken'],
                $validated['notes'] ?? null,
            );
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Moderation action applied successfully',
            'data' => [
                'report' => new CommunityReportResource($report->load(['relatedStop', 'relatedRoute', 'user'])),
                'moderation' => new ReportModerationResource($moderation->load('moderator')),
            ],
        ]);
    }

    /**
     * Public feed: only verified/resolved reports.
     */
    public function publicIndex(Request $request)
    {
        $filters = ['per_page' => (int) $request->input('per_page', 15)];
        foreach (['report_type', 'related_stop_id', 'related_route_id'] as $key) {
            if ($request->has($key)) {
                $filters[$key] = $request->input($key);
            }
        }

        $reports = $this->reports->paginatePublic($filters);

        return response()->json([
            'success' => true,
            'data' => CommunityReportResource::collection($reports->items()),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    /**
     * Public show: only verified/resolved reports are exposed.
     */
    public function publicShow($id)
    {
        $report = $this->reports->findPublicWithRelations((int) $id);

        if (!$report) {
            return $this->notFound('Report not found');
        }

        return response()->json([
            'success' => true,
            'data' => new CommunityReportResource($report),
        ]);
    }

    /**
     * Trust score of a user: self, moderator or admin.
     */
    public function trust($id)
    {
        $user = Auth::user();

        if (!$user) {
            return $this->unauthenticated();
        }

        $target = User::find($id);

        if (!$target) {
            return $this->notFound('User not found');
        }

        if ($target->id !== $user->id && !$user->hasAnyRole(['moderator', 'admin'])) {
            return $this->forbidden('Only the user, a moderator or an admin can view trust scores.');
        }

        return response()->json([
            'success' => true,
            'data' => $this->trust->score($target),
        ]);
    }

    private function authorizeReport($id): ?JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return $this->unauthenticated();
        }

        $report = $this->reports->find((int) $id);

        if (!$report) {
            return $this->notFound('Report not found');
        }

        if ($report->user_id !== $user->id && !$user->hasAnyRole(['moderator', 'admin'])) {
            return $this->forbidden('Only the report owner, a moderator or an admin can view it.');
        }

        return null;
    }

    private function unauthenticated(): JsonResponse
    {
        return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
    }

    private function notFound(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 404);
    }

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 403);
    }

    private function conflict(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 409);
    }
}
