<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Environment variables the `artisan serve` dev server must receive.
     *
     * Docker Compose supplies the topology (database host, mail host, frontend
     * URL) through the container environment.
     */
    private const SERVE_PASSTHROUGH = [
        'APP_NAME',
        'APP_URL',
        'APP_LOCALE',
        'APP_FALLBACK_LOCALE',
        'FRONTEND_URL',
        'DB_CONNECTION',
        'DB_HOST',
        'DB_PORT',
        'DB_DATABASE',
        'DB_USERNAME',
        'DB_PASSWORD',
        'SANCTUM_STATEFUL_DOMAINS',
        'MAIL_MAILER',
        'MAIL_HOST',
        'MAIL_PORT',
        'MAIL_USERNAME',
        'MAIL_PASSWORD',
        'MAIL_FROM_ADDRESS',
        'MAIL_FROM_NAME',
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->forwardEnvironmentToServeCommand();

        // Laravel sends the reset e-mail, but the form lives in the Next.js app,
        // so the link has to point at the frontend rather than at an API route.
        ResetPassword::createUrlUsing(function (CanResetPassword $notifiable, string $token): string {
            $query = http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

            return rtrim((string) config('app.frontend_url'), '/')."/reset-password?{$query}";
        });
    }

    /**
     * `artisan serve` only forwards a small allow-list of variables to the PHP
     * dev server. Without this, values set by Docker Compose are invisible to
     * served requests, which silently fall back to whatever `.env` contains.
     *
     * Only affects the local dev server; production serves through PHP-FPM.
     */
    private function forwardEnvironmentToServeCommand(): void
    {
        if ($this->app->environment('production')) {
            return;
        }

        ServeCommand::$passthroughVariables = array_values(array_unique([
            ...ServeCommand::$passthroughVariables,
            ...self::SERVE_PASSTHROUGH,
        ]));
    }
}
