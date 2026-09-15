<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Project;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_guest_cannot_access_projects(): void
    {
        $this->getJson('/api/projects')->assertUnauthorized();
    }

    public function test_project_mutations_are_allowed_by_browser_preflight(): void
    {
        foreach (['PATCH', 'DELETE'] as $method) {
            $this->withHeaders([
                'Origin' => 'http://127.0.0.1:3000',
                'Access-Control-Request-Method' => $method,
                'Access-Control-Request-Headers' => 'content-type,x-xsrf-token',
            ])->options('/api/projects/1')
                ->assertNoContent()
                ->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000')
                ->assertHeader('Access-Control-Allow-Credentials', 'true')
                ->assertHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        }
    }

    public function test_a_user_sees_only_their_own_projects_in_position_order(): void
    {
        $user = User::factory()->create();
        Project::factory()->for($user)->create(['name' => 'Second', 'position' => 1]);
        Project::factory()->for($user)->create(['name' => 'First', 'position' => 0]);
        Project::factory()->create(['name' => 'Other user', 'position' => 0]);

        $this->actingAs($user)->getJson('/api/projects')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'First')
            ->assertJsonPath('data.1.name', 'Second')
            ->assertJsonCount(2, 'data');
    }

    public function test_a_user_can_create_a_project_without_overriding_ownership(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/projects', [
            'name' => 'Taskly',
            'description' => 'Technical challenge',
            'color' => '#6366F1',
            'user_id' => $otherUser->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Taskly')
            ->assertJsonPath('data.position', 0)
            ->assertJsonMissingPath('data.user_id');
        $this->assertDatabaseHas('projects', [
            'name' => 'Taskly',
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseMissing('projects', [
            'name' => 'Taskly',
            'user_id' => $otherUser->id,
        ]);
    }

    public function test_project_validation_rejects_missing_whitespace_name_and_invalid_color(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/projects', [
            'name' => '   ',
            'color' => 'red',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'color']);
    }

    public function test_a_user_can_view_their_own_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)->getJson("/api/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $project->id);
    }

    public function test_a_user_cannot_view_another_users_project(): void
    {
        $project = Project::factory()->create();

        $this->actingAs(User::factory()->create())
            ->getJson("/api/projects/{$project->id}")
            ->assertNotFound();
    }

    public function test_a_user_can_update_their_own_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)->patchJson("/api/projects/{$project->id}", [
            'name' => 'Renamed',
            'description' => 'Updated',
            'color' => '#FFFFFF',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Renamed')
            ->assertJsonPath('data.color', '#FFFFFF');
    }

    public function test_a_user_cannot_update_another_users_project(): void
    {
        $project = Project::factory()->create(['name' => 'Original']);

        $this->actingAs(User::factory()->create())
            ->patchJson("/api/projects/{$project->id}", ['name' => 'Changed'])
            ->assertNotFound();

        $this->assertDatabaseHas('projects', ['id' => $project->id, 'name' => 'Original']);
    }

    public function test_a_user_can_delete_their_own_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    public function test_deleting_an_empty_project_removes_only_that_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $other = Project::factory()->for($user)->create();

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseHas('projects', ['id' => $other->id]);
    }

    public function test_deleting_a_project_cascades_to_its_tasks(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $tasks = Task::factory()->count(3)->for($project)->create();
        $keptProject = Project::factory()->for($user)->create();
        $keptTask = Task::factory()->for($keptProject)->create();

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        foreach ($tasks as $task) {
            $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        }

        // Another project's tasks must survive.
        $this->assertDatabaseHas('tasks', ['id' => $keptTask->id]);
    }

    public function test_deleting_a_project_removes_task_tag_pivots_but_keeps_the_tags(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $task = Task::factory()->for($project)->create();
        $tag = Tag::factory()->for($user)->create();
        $task->tags()->attach($tag);

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('task_tag', ['task_id' => $task->id, 'tag_id' => $tag->id]);
        // The tag belongs to the user, not to the task, so it must remain usable.
        $this->assertDatabaseHas('tags', ['id' => $tag->id, 'user_id' => $user->id]);
    }

    public function test_deleting_a_project_removes_attachment_records_and_files(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $task = Task::factory()->for($project)->create();

        $path = "users/{$user->id}/tasks/{$task->id}/anexo.txt";
        Storage::disk(Attachment::DISK)->put($path, 'conteudo');
        $attachment = Attachment::factory()->for($task)->create(['storage_path' => $path]);
        Storage::disk(Attachment::DISK)->assertExists($path);

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('attachments', ['id' => $attachment->id]);
        Storage::disk(Attachment::DISK)->assertMissing($path);
    }

    public function test_deleting_a_project_does_not_touch_another_users_attachment_files(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        Task::factory()->for($project)->create();

        $stranger = User::factory()->create();
        $strangerTask = Task::factory()->for(Project::factory()->for($stranger))->create();
        $strangerPath = "users/{$stranger->id}/tasks/{$strangerTask->id}/anexo.txt";
        Storage::disk(Attachment::DISK)->put($strangerPath, 'conteudo');
        $strangerAttachment = Attachment::factory()->for($strangerTask)->create([
            'storage_path' => $strangerPath,
        ]);

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('attachments', ['id' => $strangerAttachment->id]);
        Storage::disk(Attachment::DISK)->assertExists($strangerPath);
    }

    public function test_project_payloads_expose_the_task_count(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        Task::factory()->count(2)->for($project)->create();
        $empty = Project::factory()->for($user)->create();

        $this->actingAs($user)->getJson('/api/projects')
            ->assertOk()
            ->assertJsonPath('data.0.tasks_count', 2)
            ->assertJsonPath('data.1.tasks_count', 0);

        $this->actingAs($user)->getJson("/api/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('data.tasks_count', 2);

        $this->actingAs($user)->getJson("/api/projects/{$empty->id}")
            ->assertOk()
            ->assertJsonPath('data.tasks_count', 0);
    }

    public function test_a_created_project_reports_a_task_count_of_zero(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/api/projects', ['name' => 'Novo projeto'])
            ->assertCreated()
            ->assertJsonPath('data.tasks_count', 0);
    }

    public function test_a_user_cannot_delete_another_users_project(): void
    {
        $project = Project::factory()->create();

        $this->actingAs(User::factory()->create())
            ->deleteJson("/api/projects/{$project->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_a_user_can_reorder_their_projects(): void
    {
        $user = User::factory()->create();
        $first = Project::factory()->for($user)->create(['position' => 0]);
        $second = Project::factory()->for($user)->create(['position' => 1]);

        $this->actingAs($user)->patchJson('/api/projects/reorder', [
            'project_ids' => [$second->id, $first->id],
        ])->assertNoContent();

        $this->assertDatabaseHas('projects', ['id' => $second->id, 'position' => 0]);
        $this->assertDatabaseHas('projects', ['id' => $first->id, 'position' => 1]);
    }

    public function test_reorder_rejects_foreign_and_duplicate_project_ids(): void
    {
        $user = User::factory()->create();
        $ownProject = Project::factory()->for($user)->create();
        $foreignProject = Project::factory()->create();

        $this->actingAs($user)->patchJson('/api/projects/reorder', [
            'project_ids' => [$ownProject->id, $foreignProject->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('project_ids.1');

        $this->actingAs($user)->patchJson('/api/projects/reorder', [
            'project_ids' => [$ownProject->id, $ownProject->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('project_ids.1');
    }
}
