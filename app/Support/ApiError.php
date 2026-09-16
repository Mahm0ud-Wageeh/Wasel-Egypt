<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Unified API error envelope and localized messages for Wasel Egypt.
 */
class ApiError
{
    public const MESSAGES = [
        'unauthenticated' => [
            'en' => 'Unauthenticated.',
            'ar' => 'غير مصرح بالدخول. يُرجى تسجيل الدخول أولاً.',
        ],
        'unauthorized' => [
            'en' => 'Unauthorized.',
            'ar' => 'ليس لديك الصلاحية لتنفيذ هذا الإجراء.',
        ],
        'forbidden' => [
            'en' => 'Forbidden.',
            'ar' => 'الوصول محظور.',
        ],
        'not_found' => [
            'en' => 'Resource not found.',
            'ar' => 'المورد المطلوب غير موجود.',
        ],
        'conflict' => [
            'en' => 'Conflict with current resource state.',
            'ar' => 'تعارض مع الحالة الحالية للمورد.',
        ],
        'validation_failed' => [
            'en' => 'Validation failed.',
            'ar' => 'فشل التحقق من صحة البيانات المدخلة.',
        ],
        'too_many_requests' => [
            'en' => 'Too Many Requests.',
            'ar' => 'طلبات كثيرة جداً. يُرجى الانتظار قليلاً والمحاولة لاحقاً.',
        ],
        'server_error' => [
            'en' => 'Internal server error.',
            'ar' => 'حدث خطأ غير متوقع في الخادم.',
        ],
    ];

    /**
     * Detect request locale (Arabic first if header/query starts with 'ar', else English).
     */
    public static function detectLocale(?Request $request = null): string
    {
        $req = $request ?? request();
        if (!$req) {
            return 'en';
        }

        $lang = $req->query('lang') ?? $req->header('Accept-Language', '');
        if (is_string($lang) && str_starts_with(strtolower(trim($lang)), 'ar')) {
            return 'ar';
        }

        return 'en';
    }

    /**
     * Retrieve localized error message for a given key.
     */
    public static function message(string $key, ?string $fallback = null, ?Request $request = null): string
    {
        $locale = self::detectLocale($request);

        if (isset(self::MESSAGES[$key][$locale])) {
            return self::MESSAGES[$key][$locale];
        }

        return $fallback ?? self::MESSAGES[$key]['en'] ?? 'An error occurred.';
    }

    /**
     * Build unified JSON error response.
     */
    public static function response(
        string $key,
        int $status = 400,
        ?string $customMessage = null,
        ?array $errors = null,
        ?Request $request = null
    ): JsonResponse {
        $locale = self::detectLocale($request);
        $message = $customMessage;

        // If custom message not provided or default English, localize if requested
        if ($message === null) {
            $message = self::message($key, null, $request);
        } elseif ($locale === 'ar' && isset(self::MESSAGES[$key]['ar'])) {
            $message = self::MESSAGES[$key]['ar'];
        }

        $payload = [
            'success' => false,
            'message' => $message,
            'error_code' => $key,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
