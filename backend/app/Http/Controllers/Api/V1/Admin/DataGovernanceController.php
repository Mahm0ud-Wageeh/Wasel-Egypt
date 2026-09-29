<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\Transit\DataGovernanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin data-governance console backend: import history, audit history,
 * data-quality dashboard, and authorized import rollback (preview +
 * confirmed execution). All routes sit behind role:admin — server-side
 * permission checks are mandatory and never delegated to the frontend.
 */
class DataGovernanceController extends Controller
{
    public function __construct(private DataGovernanceService $governance)
    {
    }

    /** GET /admin/data/imports — full import history with provenance. */
    public function imports(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        return response()->json($this->governance->imports($perPage));
    }

    /** GET /admin/data/quality — live data-quality indicators. */
    public function quality(): JsonResponse
    {
        return response()->json([
            'data' => $this->governance->quality(),
        ]);
    }

    /** GET /admin/data/audit — admin audit history (actor/action/before-after). */
    public function audit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'resource_type' => ['nullable', 'string', 'max:50'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $perPage = min(100, max(1, (int) $request->input('per_page', 25)));

        return response()->json($this->governance->auditHistory($validated, $perPage));
    }

    /** GET /admin/data/imports/{id}/rollback-preview — what a rollback would delete. */
    public function rollbackPreview(int $id): JsonResponse
    {
        $preview = $this->governance->rollbackPreview($id);

        if ($preview === null) {
            return response()->json(['message' => 'Import not found.'], 404);
        }

        return response()->json(['data' => $preview]);
    }

    /**
     * POST /admin/data/imports/{id}/rollback — execute the rollback.
     * Requires explicit confirmation in the payload (a second, deliberate
     * confirmation step on top of the admin role gate).
     */
    public function executeRollback(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'confirm' => ['required', 'accepted'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->governance->executeRollback($id, $request->user()->id, [
            'reason' => $validated['reason'] ?? null,
        ]);

        if ($result === null) {
            return response()->json([
                'message' => 'This import owns no stamped rows. Rollback refused — nothing was deleted.',
            ], 409);
        }

        return response()->json([
            'data' => [
                'deleted' => $result,
                'import_log_id' => $id,
                'audit_recorded' => true,
            ],
        ]);
    }
}
