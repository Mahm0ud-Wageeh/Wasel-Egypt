<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(\App\Repositories\Contracts\JourneyRepositoryInterface::class, \App\Repositories\Eloquent\JourneyRepository::class);
        $this->app->bind(\App\Repositories\Contracts\CommunityReportRepositoryInterface::class, \App\Repositories\Eloquent\CommunityReportRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(function ($notifiable, $token) {
            return url('/api/v1/auth/reset-password?token=' . $token . '&email=' . $notifiable->getEmailForPasswordReset());
        });
    }
}
