<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_MESSAGE = 'Se o e-mail informado estiver cadastrado, enviaremos as instruções para redefinir sua senha.';

    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum only applies session middleware to stateful origins.
        $this->withHeader('Origin', 'http://127.0.0.1:3000');
    }

    public function test_a_registered_address_receives_a_reset_notification(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'pessoa@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'pessoa@example.com'])
            ->assertOk()
            ->assertJson(['message' => self::GENERIC_MESSAGE]);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_an_unknown_address_returns_the_same_public_response(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'pessoa@example.com']);

        $known = $this->postJson('/api/auth/forgot-password', ['email' => 'pessoa@example.com']);
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'ninguem@example.com']);

        // Same status and same body: the endpoint must not leak account existence.
        $this->assertSame($known->getStatusCode(), $unknown->getStatusCode());
        $this->assertSame($known->json(), $unknown->json());
        $unknown->assertOk()->assertJson(['message' => self::GENERIC_MESSAGE]);

        Notification::assertCount(1);
    }

    public function test_the_reset_link_points_at_the_frontend(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'http://127.0.0.1:3000']);
        $user = User::factory()->create(['email' => 'pessoa@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'pessoa@example.com'])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $url = $notification->toMail($user)->actionUrl;

            return str_starts_with($url, 'http://127.0.0.1:3000/reset-password?')
                && str_contains($url, 'token=')
                && str_contains($url, 'email=pessoa%40example.com');
        });
    }

    public function test_a_valid_token_changes_the_password(): void
    {
        $user = User::factory()->create([
            'email' => 'pessoa@example.com',
            'password' => 'senha-antiga-123',
        ]);
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-nova-456',
        ])->assertOk()->assertJson(['message' => 'Sua senha foi redefinida.']);

        $this->assertTrue(Hash::check('senha-nova-456', $user->refresh()->password));
    }

    public function test_the_user_can_log_in_with_the_new_password_and_not_the_old_one(): void
    {
        $user = User::factory()->create([
            'email' => 'pessoa@example.com',
            'password' => 'senha-antiga-123',
        ]);

        $this->postJson('/api/auth/reset-password', [
            'token' => Password::createToken($user),
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-nova-456',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'pessoa@example.com',
            'password' => 'senha-antiga-123',
        ])->assertUnprocessable();
        $this->assertGuest();

        $this->postJson('/api/auth/login', [
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
        ])->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_an_invalid_token_does_not_change_the_password(): void
    {
        $user = User::factory()->create([
            'email' => 'pessoa@example.com',
            'password' => 'senha-antiga-123',
        ]);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'token-que-nunca-existiu',
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-nova-456',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertTrue(Hash::check('senha-antiga-123', $user->refresh()->password));
    }

    public function test_an_expired_token_is_rejected(): void
    {
        $user = User::factory()->create([
            'email' => 'pessoa@example.com',
            'password' => 'senha-antiga-123',
        ]);
        $token = Password::createToken($user);

        // config('auth.passwords.users.expire') is in minutes.
        $this->travel(config('auth.passwords.users.expire') + 1)->minutes();

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-nova-456',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertTrue(Hash::check('senha-antiga-123', $user->refresh()->password));
    }

    public function test_a_token_cannot_be_reused(): void
    {
        $user = User::factory()->create(['email' => 'pessoa@example.com']);
        $token = Password::createToken($user);
        $payload = [
            'token' => $token,
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-nova-456',
        ];

        $this->postJson('/api/auth/reset-password', $payload)->assertOk();

        $this->postJson('/api/auth/reset-password', [
            ...$payload,
            'password' => 'terceira-senha-789',
            'password_confirmation' => 'terceira-senha-789',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertTrue(Hash::check('senha-nova-456', $user->refresh()->password));
    }

    public function test_reset_does_not_reveal_whether_the_account_exists(): void
    {
        $user = User::factory()->create(['email' => 'pessoa@example.com']);

        $wrongToken = $this->postJson('/api/auth/reset-password', [
            'token' => 'token-invalido',
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-nova-456',
        ]);

        $unknownUser = $this->postJson('/api/auth/reset-password', [
            'token' => 'token-invalido',
            'email' => 'ninguem@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-nova-456',
        ]);

        // An attacker must not be able to tell the two apart.
        $this->assertSame($wrongToken->getStatusCode(), $unknownUser->getStatusCode());
        $this->assertSame($wrongToken->json(), $unknownUser->json());
        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_the_password_confirmation_must_match(): void
    {
        $user = User::factory()->create([
            'email' => 'pessoa@example.com',
            'password' => 'senha-antiga-123',
        ]);

        $this->postJson('/api/auth/reset-password', [
            'token' => Password::createToken($user),
            'email' => 'pessoa@example.com',
            'password' => 'senha-nova-456',
            'password_confirmation' => 'senha-diferente-789',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertTrue(Hash::check('senha-antiga-123', $user->refresh()->password));
    }

    public function test_the_minimum_password_policy_is_enforced(): void
    {
        $user = User::factory()->create([
            'email' => 'pessoa@example.com',
            'password' => 'senha-antiga-123',
        ]);

        $this->postJson('/api/auth/reset-password', [
            'token' => Password::createToken($user),
            'email' => 'pessoa@example.com',
            'password' => 'curta',
            'password_confirmation' => 'curta',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertTrue(Hash::check('senha-antiga-123', $user->refresh()->password));
    }

    public function test_forgot_password_validates_the_email_field(): void
    {
        $this->postJson('/api/auth/forgot-password', ['email' => 'nao-e-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_repeated_requests_are_throttled(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'pessoa@example.com']);

        // The route allows 6 requests per minute from the same client.
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->postJson('/api/auth/forgot-password', ['email' => 'pessoa@example.com'])
                ->assertOk();
        }

        $this->postJson('/api/auth/forgot-password', ['email' => 'pessoa@example.com'])
            ->assertStatus(429);
    }
}
