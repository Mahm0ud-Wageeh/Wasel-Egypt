<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Search\EgyptianQueryUnderstandingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * QueryUnderstandingController
 *
 * Exposes the Egyptian colloquial, English, and Arabizi NLP parser for transit intent extraction.
 * POST /api/v1/search/understand
 */
class QueryUnderstandingController extends Controller
{
    public function __construct(
        private readonly EgyptianQueryUnderstandingService $service
    ) {
    }

    public function understand(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:250'],
        ]);

        $parsed = $this->service->parse($validated['q']);

        return response()->json([
            'success' => true,
            'data' => $parsed,
        ]);
    }
}

