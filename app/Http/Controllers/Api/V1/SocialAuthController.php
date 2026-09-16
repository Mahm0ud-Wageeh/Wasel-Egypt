<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\UserPreference;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Supported OAuth providers.
     */
    protected array $supportedProviders = ['google', 'github'];

    /**
     * Return configured status of OAuth providers.
     */
    public function status()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'google' => !empty(config('services.google.client_id')),
                'github' => !empty(config('services.github.client_id')),
            ],
        ]);
    }

    /**
     * Redirect to the specified OAuth provider.
     */
    public function redirectToProvider(string $provider)
    {
        if (!in_array($provider, $this->supportedProviders)) {
            return response()->json([
                'success' => false,
                'message' => "Unsupported OAuth provider: {$provider}",
            ], 400);
        }

        $clientId = config("services.{$provider}.client_id");
        if (empty($clientId)) {
            $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:5173');
            return redirect("{$frontendUrl}/login?error=oauth_not_configured&provider={$provider}");
        }

        return Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * Handle the OAuth provider callback.
     */
    public function handleProviderCallback(string $provider, Request $request)
    {
        $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:5173');

        if (!in_array($provider, $this->supportedProviders)) {
            return redirect("{$frontendUrl}/login?error=unsupported_provider");
        }

        if ($request->has('error')) {
            $errorMsg = $request->get('error_description', $request->get('error', 'OAuth authorization failed'));
            return redirect("{$frontendUrl}/login?error=" . urlencode($errorMsg));
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            return redirect("{$frontendUrl}/login?error=" . urlencode("Failed to authenticate with {$provider}: " . $e->getMessage()));
        }

        $email = $socialUser->getEmail();
        $providerId = (string) $socialUser->getId();
        $name = $socialUser->getName() ?: $socialUser->getNickname() ?: ($email ? explode('@', $email)[0] : ucfirst($provider) . ' User');
        $avatar = $socialUser->getAvatar();

        $providerIdColumn = "{$provider}_id";

        // 1. Match by provider id
        $user = User::where($providerIdColumn, $providerId)->first();

        // 2. If not found, match by email
        if (!$user && $email) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([
                    $providerIdColumn => $providerId,
                    'avatar' => $avatar ?: $user->avatar,
                ]);
            }
        }

        // 3. If new user, create account
        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email ?: "{$provider}_{$providerId}@wasel.local",
                $providerIdColumn => $providerId,
                'avatar' => $avatar,
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            // Default 'user' role
            $userRole = Role::where('name', 'user')->first();
            if ($userRole) {
                $user->roles()->attach($userRole);
            }

            // Default preferences
            UserPreference::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'preferred_language' => 'ar',
                    'theme' => 'system',
                    'high_contrast_mode' => false,
                    'screen_reader_optimized' => false,
                    'offline_mode_preference' => 'automatic',
                    'data_saver_mode' => false,
                ]
            );
        }

        // Ensure user is active
        if ($user->status !== 'active') {
            return redirect("{$frontendUrl}/login?error=" . urlencode('Account is not active'));
        }

        // Issue Sanctum token
        $token = $user->createToken('Wasel Egypt')->plainTextToken;

        return redirect("{$frontendUrl}/auth/callback?token={$token}&provider={$provider}");
    }
}
