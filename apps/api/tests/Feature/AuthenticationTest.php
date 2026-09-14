<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Origin', 'http://127.0.0.1:3000');
    }

    public function test_a_guest_can_register_and_is_authenticated(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jose Silva',
            'email' => 'jose@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Jose Silva')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.password_hash');
        $this->assertAuthenticated();
    }

    public function test_duplicate_email_is_rejected(): void
    {
        User::factory()->create(['email' => 'jose@example.com']);

        $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'jose@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_invalid_registration_input_returns_validation_errors(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_a_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'jose@example.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jose@example.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.password_hash');
        $this->assertAuthenticatedAs($user);
    }

    public function test_invalid_credentials_are_rejected_without_revealing_account_details(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'missing@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable()
            ->assertJson(['message' => 'The provided credentials are incorrect.']);
        $this->assertGuest();
    }

    public function test_an_authenticated_user_can_access_the_current_user_endpoint(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.password_hash');
    }

    public function test_a_guest_cannot_access_the_current_user_endpoint(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_an_authenticated_user_can_logout(): void
    {
        User::factory()->create([
            'email' => 'jose@example.com',
            'password' => Hash::make('password'),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'jose@example.com',
            'password' => 'password',
        ])->assertOk();

        $logout = $this->postJson('/api/auth/logout')->assertNoContent();

        unset($logout);
        $this->app['auth']->forgetGuards();
        $this->assertGuest();
        $this->flushSession()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_a_user_is_no_longer_authenticated_after_logout(): void
    {
        User::factory()->create([
            'email' => 'jose@example.com',
            'password' => Hash::make('password'),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'jose@example.com',
            'password' => 'password',
        ])->assertOk();

        $logout = $this->postJson('/api/auth/logout')->assertNoContent();

        unset($logout);
        $this->app['auth']->forgetGuards();
        $this->flushSession()->getJson('/api/me')->assertUnauthorized();
    }
}
