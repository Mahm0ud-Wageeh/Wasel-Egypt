<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Minimal security headers & correlation ID middleware.
 * Enforces nosniff, frame denial, strict referrer policy, and scoped CSP
 * for self + vector tile services + Photon geocoder + web workers.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = $request->header('X-Correlation-ID') ?: (string) Str::uuid();
        $request->headers->set('X-Correlation-ID', $correlationId);

        // Add correlation ID to all log entries during this request lifecycle
        Log::withContext(['correlation_id' => $correlationId]);

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Correlation-ID', $correlationId);

        // Content Security Policy: tight scoped for self + Google fonts + trusted tile CDNs + web workers
        $csp = "default-src 'self'; " .
               "script-src 'self'; " .
               "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " .
               "font-src 'self' https://fonts.gstatic.com data:; " .
               "img-src 'self' data: blob: https://server.arcgisonline.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org; " .
               "connect-src 'self' blob: http://127.0.0.1:* http://localhost:* https://server.arcgisonline.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org; " .
               "worker-src 'self' blob:;";

        $response->headers->set('Content-Security-Policy', $csp);

        return $response;
    }
}
