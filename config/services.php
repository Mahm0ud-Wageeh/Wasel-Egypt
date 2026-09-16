<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL', 'http://127.0.0.1:8000') . '/api/v1/auth/google/callback'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI', env('APP_URL', 'http://127.0.0.1:8000') . '/api/v1/auth/github/callback'),
    ],


    /*
    |--------------------------------------------------------------------------
    | OSRM (self-hosted road routing)
    |--------------------------------------------------------------------------
    | Self-hosted OSRM server with the OSM foot profile. Used for road-aware
    | walking legs (distance, duration, geometry). When unreachable, the
    | planner silently falls back to straight-line estimates — search never
    | depends on this service being up.
    |
    | Local setup: see docs/architecture/OSRM_SETUP.md
    */

    'osrm' => [
        'url' => env('OSRM_URL', 'http://127.0.0.1:5001'),
        'enabled' => env('OSRM_ENABLED', true),
    ],

    'geocoding' => [
        'url' => env('GEOCODING_URL', 'https://photon.komoot.io/api/'),
        'enabled' => env('GEOCODING_ENABLED', true),
    ],

    'gtfs_rt' => [
        'url' => env('GTFS_RT_URL'),
        'enabled' => env('GTFS_RT_ENABLED', false),
    ],
];
