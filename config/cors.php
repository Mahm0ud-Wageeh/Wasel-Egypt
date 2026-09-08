<?php

return [
    /*
    |--------------------------------------------------------------------------
    | CORS — API-only, explicit origins
    |--------------------------------------------------------------------------
    | Audit B6 (2026-09-07): previously the framework default allowed all
    | origins. Sanctum bearer tokens are not CSRF-bearing, but production
    | posture is an explicit allow-list. Dev origins are the Vite hosts the
    | project actually uses; add production origins via CORS_EXTRA_ORIGINS.
    */

    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter([
        env('FRONTEND_URL', 'http://127.0.0.1:5173'),
        'http://127.0.0.1:5174',
        'http://localhost:5173',
        'http://localhost:5174',
        env('CORS_EXTRA_ORIGIN_1'),
        env('CORS_EXTRA_ORIGIN_2'),
    ])),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'Authorization', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 3600,
    'supports_credentials' => false,
];
