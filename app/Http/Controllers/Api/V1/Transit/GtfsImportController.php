<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\GtfsImportRequest;
use App\Services\Transit\GtfsImportService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Exception;

class GtfsImportController extends Controller
{
    protected $gtfsImportService;

    public function __construct(GtfsImportService $gtfsImportService)
    {
        $this->gtfsImportService = $gtfsImportService;
    }

    /**
     * Validate GTFS upload without importing.
     */
    public function validate(GtfsImportRequest $request)
    {
        try {
            $file = $request->file('gtfs_zip');
            // Store temporarily
            $path = $file->store('gtfs/temp', 'local');

            // The service opens the zip directly, so it needs the absolute path
            // on the local disk, not the disk-relative path returned by store().
            $absolutePath = Storage::disk('local')->path($path);

            // Validate the GTFS feed
            $validationResult = $this->gtfsImportService->validateFeed($absolutePath);

            // Delete temporary file
            Storage::disk('local')->delete($path);

            return response()->json([
                'success' => true,
                'data' => $validationResult
            ]);
        } catch (Exception $e) {
            Log::error('GTFS validation failed: ' . $e->getMessage(), ['exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'GTFS validation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import GTFS feed.
     */
    public function import(GtfsImportRequest $request)
    {
        DB::beginTransaction();

        try {
            $file = $request->file('gtfs_zip');
            // Store temporarily
            $path = $file->store('gtfs/temp', 'local');

            // The service opens the zip directly, so it needs the absolute path
            // on the local disk, not the disk-relative path returned by store().
            $absolutePath = Storage::disk('local')->path($path);

            // Import the GTFS feed
            $importResult = $this->gtfsImportService->importFeed($absolutePath);

            // Delete temporary file
            Storage::disk('local')->delete($path);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GTFS import completed successfully',
                'data' => $importResult
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('GTFS import failed: ' . $e->getMessage(), ['exception' => $e]);

            // Try to delete temporary file if it exists
            if (isset($path)) {
                Storage::disk('local')->delete($path);
            }

            return response()->json([
                'success' => false,
                'message' => 'GTFS import failed: ' . $e->getMessage()
            ], 500);
        }
    }
}