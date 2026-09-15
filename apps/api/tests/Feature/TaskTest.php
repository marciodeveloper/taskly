<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_tasks(): void
    {
        $project = Project::factory()->create();

        $this->getJson("/api/projects/{$project->id}/tasks")->assertUnauthorized();
    }

    public function test_user_can_list_their_project_tasks_in_position_order(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        Task::factory()->for($project)->create(['title' => 'Second', 'position' => 1]);
        Task::factory()->for($project)->create(['title' => 'First', 'position' => 0]);
        Task::factory()->create(['title' => 'Other user']);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/tasks")
            ->assertOk()
            ->assertJsonPath('data.0.title', 'First')
            ->assertJsonPath('data.1.title', 'Second')
            ->assertJsonCount(2, 'data');
    }

    public function test_valid_payload_creates_task_and_returns_201(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        Task::factory()->for($project)->create(['position' => 3]);

        $response = $this->actingAs($user)->postJson("/api/projects/{$project->id}/tasks", [
            'title' => '  Prepare presentation  ',
            'short_description' => 'Final review',
            'description' => 'Review the complete customer presentation.',
            'status' => TaskStatus::InProgress->value,
            'due_at' => '2025-09-15T18:00:00Z',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.project_id', $project->id)
            ->assertJsonPath('data.title', 'Prepare presentation')
            ->assertJsonPath('data.status', TaskStatus::InProgress->value)
            ->assertJsonPath('data.position', 4)
            ->assertJsonPath('data.completed_at', null)
            ->assertJsonMissingPath('data.user_id');
        $this->assertDatabaseHas('tasks', [
            'project_id' => $project->id,
            'title' => 'Prepare presentation',
            'status' => TaskStatus::InProgress->value,
            'position' => 4,
        ]);
    }

    public function test_invalid_task_payload_returns_422(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)->postJson("/api/projects/{$project->id}/tasks", [
            'title' => '   ',
            'short_description' => str_repeat('a', 501),
            'due_at' => 'not-a-date',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'short_description', 'status', 'due_at']);

        $this->assertDatabaseCount('tasks', 0);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function taskStatuses(): array
    {
        return [
            'not started' => [TaskStatus::NotStarted->value],
            'in progress' => [TaskStatus::InProgress->value],
            'completed' => [TaskStatus::Completed->value],
            'cancelled' => [TaskStatus::Cancelled->value],
        ];
    }

    #[DataProvider('taskStatuses')]
    public function test_supported_status_is_accepted(string $status): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)->postJson("/api/projects/{$project->id}/tasks", [
            'title' => 'Status task',
            'status' => $status,
        ])->assertCreated()
            ->assertJsonPath('data.status', $status);

        $this->assertDatabaseHas('tasks', ['project_id' => $project->id, 'status' => $status]);
    }

    public function test_invalid_status_returns_422(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        $this->actingAs($user)->postJson("/api/projects/{$project->id}/tasks", [
            'title' => 'Invalid status',
            'status' => 'blocked',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_valid_payload_updates_all_editable_fields(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();

        $response = $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'title' => '  Updated task  ',
            'short_description' => 'Updated summary',
            'description' => 'Updated description',
            'status' => TaskStatus::InProgress->value,
            'due_at' => '2026-10-01T14:30:00Z',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.title', 'Updated task')
            ->assertJsonPath('data.short_description', 'Updated summary')
            ->assertJsonPath('data.description', 'Updated description')
            ->assertJsonPath('data.status', TaskStatus::InProgress->value)
            ->assertJsonPath('data.due_at', '2026-10-01T14:30:00.000000Z');
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated task',
            'short_description' => 'Updated summary',
            'status' => TaskStatus::InProgress->value,
        ]);
    }

    public function test_user_can_delete_their_task(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();

        $this->actingAs($user)
            ->deleteJson("/api/tasks/{$task->id}")
            ->assertNoContent();

        $this->assertModelMissing($task);
    }

    public function test_completed_status_sets_completed_at(): void
    {
        $this->travelTo('2026-09-15 18:00:00');
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'status' => TaskStatus::Completed->value,
        ])->assertOk()
            ->assertJsonPath('data.completed_at', '2026-09-15T18:00:00.000000Z');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => TaskStatus::Completed->value,
            'completed_at' => '2026-09-15 18:00:00',
        ]);
    }

    public function test_leaving_completed_status_clears_completed_at(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->completed()->create();

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'status' => TaskStatus::InProgress->value,
        ])->assertOk()
            ->assertJsonPath('data.completed_at', null);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => TaskStatus::InProgress->value,
            'completed_at' => null,
        ]);
    }

    public function test_updating_completed_task_preserves_original_completed_at(): void
    {
        $this->travelTo('2026-09-14 10:00:00');
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->completed()->create();
        $originalCompletedAt = $task->completed_at?->toISOString();
        $this->travelTo('2026-09-15 18:00:00');

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'title' => 'Still complete',
            'status' => TaskStatus::Completed->value,
        ])->assertOk()
            ->assertJsonPath('data.completed_at', $originalCompletedAt);

        $this->assertSame($originalCompletedAt, $task->refresh()->completed_at?->toISOString());
    }

    public function test_user_cannot_list_another_users_project_tasks_and_gets_404(): void
    {
        $project = Project::factory()->create();
        Task::factory()->for($project)->create();

        $this->actingAs(User::factory()->create())
            ->getJson("/api/projects/{$project->id}/tasks")
            ->assertNotFound();
    }

    public function test_user_cannot_create_task_in_another_users_project_and_gets_404(): void
    {
        $project = Project::factory()->create();

        $this->actingAs(User::factory()->create())->postJson("/api/projects/{$project->id}/tasks", [
            'title' => 'Foreign task',
            'status' => TaskStatus::NotStarted->value,
        ])->assertNotFound();

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_user_cannot_view_another_users_task_and_gets_404(): void
    {
        $task = Task::factory()->create();

        $this->actingAs(User::factory()->create())
            ->getJson("/api/tasks/{$task->id}")
            ->assertNotFound();
    }

    public function test_user_cannot_update_another_users_task_and_gets_404(): void
    {
        $task = Task::factory()->create(['title' => 'Original']);

        $this->actingAs(User::factory()->create())
            ->patchJson("/api/tasks/{$task->id}", ['title' => 'Changed'])
            ->assertNotFound();

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Original']);
    }

    public function test_user_cannot_delete_another_users_task_and_gets_404(): void
    {
        $task = Task::factory()->create();

        $this->actingAs(User::factory()->create())
            ->deleteJson("/api/tasks/{$task->id}")
            ->assertNotFound();

        $this->assertModelExists($task);
    }

    public function test_project_id_payload_cannot_move_task_and_returns_422(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $otherProject = Project::factory()->for($user)->create();

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'project_id' => $otherProject->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('project_id');

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'project_id' => $task->project_id]);
    }

    public function test_completed_at_payload_cannot_override_server_rule_and_returns_422(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();

        $this->actingAs($user)->patchJson("/api/tasks/{$task->id}", [
            'status' => TaskStatus::Completed->value,
            'completed_at' => '2020-01-01T00:00:00Z',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('completed_at');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => TaskStatus::NotStarted->value,
            'completed_at' => null,
        ]);
    }
}
