<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Add custom middleware aliases
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
        ]);

        // Append SecurityHeaders middleware globally
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        // This is an API-only backend: there is no named "login" route, so guests
        // must never be redirected to one. Unauthenticated requests are turned
        // into a 401 JSON response by the AuthenticationException renderer below.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Unified API-only error rendering with localized AR/EN support
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            $isAr = \App\Support\ApiError::detectLocale($request) === 'ar';
            return response()->json([
                'success' => false,
                'message' => $isAr ? 'غير مصرح بالدخول. يُرجى تسجيل الدخول أولاً.' : 'Unauthenticated.',
                'error_code' => 'unauthenticated',
            ], 401);
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e, Request $request) {
            $isAr = \App\Support\ApiError::detectLocale($request) === 'ar';
            return response()->json([
                'success' => false,
                'message' => $isAr ? 'ليس لديك الصلاحية لتنفيذ هذا الإجراء.' : ($e->getMessage() ?: 'Unauthorized.'),
                'error_code' => 'forbidden',
            ], 403);
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, Request $request) {
            $isAr = \App\Support\ApiError::detectLocale($request) === 'ar';
            return response()->json([
                'success' => false,
                'message' => $isAr ? 'المورد المطلوب غير موجود.' : ($e->getMessage() ?: 'Resource not found.'),
                'error_code' => 'not_found',
            ], 404);
        });

        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e, Request $request) {
            $isAr = \App\Support\ApiError::detectLocale($request) === 'ar';
            return response()->json([
                'success' => false,
                'message' => $isAr ? 'طلبات كثيرة جداً. يُرجى الانتظار قليلاً والمحاولة لاحقاً.' : 'Too Many Requests.',
                'error_code' => 'too_many_requests',
            ], 429);
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            $isAr = \App\Support\ApiError::detectLocale($request) === 'ar';
            return response()->json([
                'success' => false,
                'message' => $isAr ? 'فشل التحقق من صحة البيانات المدخلة.' : $e->getMessage(),
                'error_code' => 'validation_failed',
                'errors' => $e->errors(),
            ], 422);
        });
    })->create();
