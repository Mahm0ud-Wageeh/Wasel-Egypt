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
        $distPath = base_path('frontend/dist/index.html');
        if (file_exists($distPath)) {
            return response()->file($distPath, [
                'Content-Type' => 'text/html; charset=UTF-8',
            ]);
        }
        return response('Wasel Egypt frontend not built yet. Run `npm run build` in the frontend directory.', 404);
    }
    return response()->file($indexPath, [
        'Content-Type' => 'text/html; charset=UTF-8',
    ]);
})->where('any', '^(?!api/).*$');
