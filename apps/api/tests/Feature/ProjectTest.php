<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_guest_cannot_access_projects(): void
    {
        $this->getJson('/api/projects')->assertUnauthorized();
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
