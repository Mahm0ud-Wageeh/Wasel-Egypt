<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes (Single Origin SPA Fallback)
|--------------------------------------------------------------------------
|
| Serves the Wasel Egypt React Single Page Application for all web routes,
| allowing direct browser refreshes on routes like /search, /routes/{id},
| /active-journeys/{id}, etc. API routes remain handled under /api/*.
|
*/

Route::get('/{any?}', function () {
    $indexPath = public_path('index.html');
    if (!file_exists($indexPath)) {
        $outPath = base_path('frontend/out/index.html');
        if (file_exists($outPath)) {
            return response()->file($outPath, [
                'Content-Type' => 'text/html; charset=UTF-8',
            ]);
        }
        return response('Wasel Egypt frontend not built yet. Run `npm run build && npm run publish:laravel` in the frontend directory.', 404);
    }
    return response()->file($indexPath, [
        'Content-Type' => 'text/html; charset=UTF-8',
    ]);
})->where('any', '^(?!api/).*$');

