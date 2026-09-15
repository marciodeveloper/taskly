<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Send a reset link, if the address belongs to an account.
     *
     * The response is deliberately identical for every outcome — unknown address,
     * throttled broker or a link actually sent — so this endpoint cannot be used
     * to discover which e-mail addresses are registered.
     */
    public function sendResetLink(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->validated());

        return response()->json([
            'message' => __('passwords.sent_generic'),
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->validated(),
            function (User $user, string $password): void {
                $user->forceFill([
                    // The `hashed` cast on User hashes this on save.
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PasswordReset) {
            throw ValidationException::withMessages([
                // INVALID_USER and INVALID_TOKEN are reported identically. Telling
                // them apart would turn this endpoint into an account oracle.
                'email' => [__('passwords.token')],
            ]);
        }

        return response()->json([
            'message' => __($status),
        ]);
    }
}
