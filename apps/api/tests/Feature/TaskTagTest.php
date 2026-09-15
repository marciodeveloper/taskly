<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTagTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_can_be_created_with_multiple_owned_tags(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $backend = Tag::factory()->for($user)->create(['name' => 'Backend']);
        $urgent = Tag::factory()->for($user)->create(['name' => 'Urgent']);

        $response = $this->actingAs($user)->postJson("/api/projects/{$project->id}/tasks", [
            'title' => 'Tagged task',
            'status' => TaskStatus::NotStarted->value,
            'tag_ids' => [$urgent->id, $backend->id],
        ])->assertCreated()
            ->assertJsonCount(2, 'data.tags')
            ->assertJsonPath('data.tags.0.id', $backend->id)
            ->assertJsonPath('data.tags.1.id', $urgent->id)
            ->assertJsonMissingPath('data.tags.0.user_id');

        $taskId = $response->json('data.id');
        $this->assertDatabaseHas('task_tag', ['task_id' => $taskId, 'tag_id' => $backend->id]);
        $this->assertDatabaseHas('task_tag', ['task_id' => $taskId, 'tag_id' => $urgent->id]);
    }

    public function test_task_update_replaces_tags(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $first = Tag::factory()->for($user)->create(['name' => 'First']);
        $second = Tag::factory()->for($user)->create(['name' => 'Second']);
        $task->tags()->attach($first);

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'tag_ids' => [$second->id],
        ])->assertOk()
            ->assertJsonCount(1, 'data.tags')
            ->assertJsonPath('data.tags.0.id', $second->id);

        $this->assertDatabaseMissing('task_tag', ['task_id' => $task->id, 'tag_id' => $first->id]);
        $this->assertDatabaseHas('task_tag', ['task_id' => $task->id, 'tag_id' => $second->id]);
    }

    public function test_task_patch_without_tag_ids_preserves_tags(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $tag = Tag::factory()->for($user)->create();
        $task->tags()->attach($tag);

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'title' => 'Renamed',
        ])->assertOk()
            ->assertJsonPath('data.tags.0.id', $tag->id);

        $this->assertDatabaseHas('task_tag', ['task_id' => $task->id, 'tag_id' => $tag->id]);
    }

    public function test_explicit_empty_tag_ids_clears_tags(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $tags = Tag::factory()->count(2)->for($user)->create();
        $task->tags()->attach($tags);

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", ['tag_ids' => []])
            ->assertOk()
            ->assertJsonCount(0, 'data.tags');

        $this->assertDatabaseMissing('task_tag', ['task_id' => $task->id]);
    }

    public function test_duplicate_tag_ids_are_rejected_without_creating_duplicate_pivots(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $tag = Tag::factory()->for($user)->create();

        $this->actingAs($user)->postJson("/api/projects/{$project->id}/tasks", [
            'title' => 'Duplicate tags',
            'status' => TaskStatus::NotStarted->value,
            'tag_ids' => [$tag->id, $tag->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('tag_ids.1');

        $this->assertDatabaseCount('tasks', 0);
        $this->assertDatabaseCount('task_tag', 0);
    }

    public function test_foreign_and_nonexistent_tag_ids_are_rejected(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $foreignTag = Tag::factory()->create();

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'tag_ids' => [$foreignTag->id, 999999],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['tag_ids.0', 'tag_ids.1']);

        $this->assertDatabaseCount('task_tag', 0);
    }

    public function test_task_list_eagerly_returns_tags_and_attachment_metadata(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $task = Task::factory()->for($project)->create();
        $tag = Tag::factory()->for($user)->create(['name' => 'Backend']);
        $task->tags()->attach($tag);
        $task->attachments()->create([
            'original_name' => 'notes.txt',
            'storage_path' => 'users/1/tasks/1/generated.txt',
            'mime_type' => 'text/plain',
            'size' => 64,
        ]);

        $this->actingAs($user)->getJson("/api/projects/{$project->id}/tasks")
            ->assertOk()
            ->assertJsonPath('data.0.tags.0.name', 'Backend')
            ->assertJsonPath('data.0.attachments.0.original_name', 'notes.txt')
            ->assertJsonPath('data.0.attachments.0.is_image', false)
            ->assertJsonMissingPath('data.0.attachments.0.storage_path');
    }
}
