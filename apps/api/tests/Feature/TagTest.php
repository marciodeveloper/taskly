<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_tags(): void
    {
        $this->getJson('/api/tags')->assertUnauthorized();
    }

    public function test_user_lists_only_their_tags_in_name_order(): void
    {
        $user = User::factory()->create();
        Tag::factory()->for($user)->create(['name' => 'Frontend']);
        Tag::factory()->for($user)->create(['name' => 'Backend']);
        Tag::factory()->create(['name' => 'Foreign']);

        $this->actingAs($user)->getJson('/api/tags')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Backend')
            ->assertJsonPath('data.1.name', 'Frontend')
            ->assertJsonMissingPath('data.0.user_id');
    }

    public function test_user_can_create_trimmed_tag_without_overriding_owner(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $this->actingAs($user)->postJson('/api/tags', [
            'name' => '  Backend  ',
            'color' => '#2563EB',
            'user_id' => $otherUser->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('user_id');

        $response = $this->actingAs($user)->postJson('/api/tags', [
            'name' => '  Backend  ',
            'color' => '#2563EB',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Backend')
            ->assertJsonPath('data.color', '#2563EB')
            ->assertJsonMissingPath('data.user_id');
        $this->assertDatabaseHas('tags', [
            'user_id' => $user->id,
            'name' => 'Backend',
        ]);
    }

    public function test_tag_name_validation_rejects_blank_and_long_values(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/tags', ['name' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->actingAs($user)->postJson('/api/tags', ['name' => str_repeat('a', 51)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_tag_color_must_be_a_six_digit_hex_value(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/tags', [
            'name' => 'Backend',
            'color' => 'blue',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('color');
    }

    public function test_duplicate_name_is_rejected_per_user_but_allowed_for_another_user(): void
    {
        $user = User::factory()->create();
        Tag::factory()->for($user)->create(['name' => 'Backend']);

        $this->actingAs($user)->postJson('/api/tags', ['name' => 'Backend'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->actingAs(User::factory()->create())
            ->postJson('/api/tags', ['name' => 'Backend'])
            ->assertCreated();
    }

    public function test_user_can_update_their_tag(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create(['name' => 'Old']);

        $this->actingAs($user)->patchJson("/api/tags/{$tag->id}", [
            'name' => 'New',
            'color' => '#FFFFFF',
        ])->assertOk()
            ->assertJsonPath('data.name', 'New')
            ->assertJsonPath('data.color', '#FFFFFF');

        $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'New']);
    }

    public function test_user_cannot_update_or_delete_another_users_tag_and_gets_404(): void
    {
        $tag = Tag::factory()->create(['name' => 'Private']);
        $user = User::factory()->create();

        $this->actingAs($user)->patchJson("/api/tags/{$tag->id}", ['name' => 'Changed'])
            ->assertNotFound();
        $this->actingAs($user)->deleteJson("/api/tags/{$tag->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'Private']);
    }

    public function test_deleting_tag_detaches_it_without_deleting_task(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $tag = Tag::factory()->for($user)->create();
        $task->tags()->attach($tag);

        $this->actingAs($user)->deleteJson("/api/tags/{$tag->id}")
            ->assertNoContent();

        $this->assertModelMissing($tag);
        $this->assertModelExists($task);
        $this->assertDatabaseMissing('task_tag', ['tag_id' => $tag->id]);
    }
}
