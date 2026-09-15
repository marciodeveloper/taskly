<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_private_attachment_routes_return_401(): void
    {
        $task = Task::factory()->create();
        $attachment = Attachment::factory()->for($task)->create();

        $this->postJson("/api/tasks/{$task->id}/attachments")
            ->assertUnauthorized();
        $this->getJson("/api/attachments/{$attachment->id}/content")
            ->assertUnauthorized();
        $this->deleteJson("/api/attachments/{$attachment->id}")
            ->assertUnauthorized();
    }

    public function test_guest_browser_navigation_to_api_content_returns_json_401_without_redirect(): void
    {
        $attachment = Attachment::factory()->create();

        $this->get("/api/attachments/{$attachment->id}/content")
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.')
            ->assertHeader('Content-Type', 'application/json');

        $this->get('/api/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_owner_can_upload_allowed_image_to_generated_private_path(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $file = UploadedFile::fake()->createWithContent(
            '../../profile.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true),
        );

        $response = $this->actingAs($user)->post(
            "/api/tasks/{$task->id}/attachments",
            ['file' => $file],
            ['Accept' => 'application/json'],
        );

        $response->assertCreated()
            ->assertJsonPath('data.original_name', 'profile.png')
            ->assertJsonPath('data.mime_type', 'image/png')
            ->assertJsonPath('data.is_image', true)
            ->assertJsonMissingPath('data.storage_path');
        $attachment = Attachment::query()->sole();
        $this->assertStringStartsWith("users/{$user->id}/tasks/{$task->id}/", $attachment->storage_path);
        $this->assertStringNotContainsString('profile', $attachment->storage_path);
        Storage::disk(Attachment::DISK)->assertExists($attachment->storage_path);
    }

    public function test_owner_can_upload_allowed_pdf_document(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $file = UploadedFile::fake()->create('guide.pdf', 100)->mimeType('application/pdf');

        $this->actingAs($user)->post(
            "/api/tasks/{$task->id}/attachments",
            ['file' => $file],
            ['Accept' => 'application/json'],
        )->assertCreated()
            ->assertJsonPath('data.original_name', 'guide.pdf')
            ->assertJsonPath('data.mime_type', 'application/pdf')
            ->assertJsonPath('data.is_image', false);

        Storage::disk(Attachment::DISK)
            ->assertExists(Attachment::query()->sole()->storage_path);
    }

    public function test_upload_rejects_browser_active_mime_type(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $file = UploadedFile::fake()->create('diagram.svg', 1)->mimeType('image/svg+xml');

        $this->actingAs($user)->post(
            "/api/tasks/{$task->id}/attachments",
            ['file' => $file],
            ['Accept' => 'application/json'],
        )->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('attachments', 0);
    }

    public function test_upload_rejects_file_larger_than_ten_megabytes(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $file = UploadedFile::fake()->create('large.txt', 10 * 1024 + 1)->mimeType('text/plain');

        $this->actingAs($user)->post(
            "/api/tasks/{$task->id}/attachments",
            ['file' => $file],
            ['Accept' => 'application/json'],
        )->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('attachments', 0);
    }

    public function test_attachment_resource_exposes_metadata_without_internal_path(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $file = UploadedFile::fake()->create('notes.txt', 2)->mimeType('text/plain');

        $this->actingAs($user)->post(
            "/api/tasks/{$task->id}/attachments",
            ['file' => $file],
            ['Accept' => 'application/json'],
        )->assertCreated()
            ->assertJsonStructure(['data' => [
                'id',
                'original_name',
                'mime_type',
                'size',
                'is_image',
                'content_url',
                'created_at',
            ]])
            ->assertJsonPath('data.content_url', '/api/attachments/1/content')
            ->assertJsonMissingPath('data.storage_path')
            ->assertJsonMissingPath('data.user_id');
    }

    public function test_owner_can_stream_image_content_inline_with_security_headers(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $attachment = Attachment::factory()->for($task)->create([
            'original_name' => 'photo.png',
            'storage_path' => 'users/1/tasks/1/photo.png',
            'mime_type' => 'image/png',
        ]);
        Storage::disk(Attachment::DISK)->put($attachment->storage_path, 'image-bytes');

        $response = $this->actingAs($user)
            ->get("/api/attachments/{$attachment->id}/content");

        $response->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        $this->assertStringStartsWith(
            'inline;',
            (string) $response->headers->get('Content-Disposition'),
        );
    }

    public function test_owner_receives_non_image_content_as_download(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $attachment = Attachment::factory()->for($task)->create([
            'original_name' => 'notes.txt',
            'storage_path' => 'users/1/tasks/1/notes.txt',
            'mime_type' => 'text/plain',
        ]);
        Storage::disk(Attachment::DISK)->put($attachment->storage_path, 'private notes');

        $response = $this->actingAs($user)
            ->get("/api/attachments/{$attachment->id}/content");

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=utf-8')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringStartsWith(
            'attachment;',
            (string) $response->headers->get('Content-Disposition'),
        );
    }

    public function test_foreign_user_cannot_upload_read_or_delete_attachments_and_gets_404(): void
    {
        Storage::fake(Attachment::DISK);
        $task = Task::factory()->create();
        $attachment = Attachment::factory()->for($task)->create();
        Storage::disk(Attachment::DISK)->put($attachment->storage_path, 'private');
        $foreignUser = User::factory()->create();

        $this->actingAs($foreignUser)->post(
            "/api/tasks/{$task->id}/attachments",
            ['file' => UploadedFile::fake()->createWithContent(
                'photo.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true),
            )],
            ['Accept' => 'application/json'],
        )->assertNotFound();
        $this->actingAs($foreignUser)
            ->getJson("/api/attachments/{$attachment->id}/content")
            ->assertNotFound();
        $this->actingAs($foreignUser)
            ->deleteJson("/api/attachments/{$attachment->id}")
            ->assertNotFound();

        $this->assertModelExists($attachment);
        Storage::disk(Attachment::DISK)->assertExists($attachment->storage_path);
    }

    public function test_owner_deletes_attachment_record_and_physical_file(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $attachment = Attachment::factory()->for($task)->create();
        Storage::disk(Attachment::DISK)->put($attachment->storage_path, 'private');

        $this->actingAs($user)->deleteJson("/api/attachments/{$attachment->id}")
            ->assertNoContent();

        $this->assertModelMissing($attachment);
        Storage::disk(Attachment::DISK)->assertMissing($attachment->storage_path);
        $this->actingAs($user)->deleteJson("/api/attachments/{$attachment->id}")
            ->assertNotFound();
    }

    public function test_deleting_task_removes_all_physical_attachment_files(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $task = Task::factory()->for(Project::factory()->for($user))->create();
        $attachments = Attachment::factory()->count(2)->for($task)->sequence(
            ['storage_path' => 'users/1/tasks/1/first.txt'],
            ['storage_path' => 'users/1/tasks/1/second.txt'],
        )->create();
        $attachments->each(fn (Attachment $attachment) => Storage::disk(Attachment::DISK)
            ->put($attachment->storage_path, 'private'));

        $this->actingAs($user)->deleteJson("/api/tasks/{$task->id}")
            ->assertNoContent();

        $this->assertModelMissing($task);
        $attachments->each(fn (Attachment $attachment) => Storage::disk(Attachment::DISK)
            ->assertMissing($attachment->storage_path));
    }

    public function test_deleting_project_removes_files_for_all_nested_tasks(): void
    {
        Storage::fake(Attachment::DISK);
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $tasks = Task::factory()->count(2)->for($project)->sequence(
            ['position' => 0],
            ['position' => 1],
        )->create();
        $attachments = $tasks->map(fn (Task $task, int $index) => Attachment::factory()
            ->for($task)
            ->create(['storage_path' => "users/1/tasks/{$task->id}/file-{$index}.txt"]));
        $attachments->each(fn (Attachment $attachment) => Storage::disk(Attachment::DISK)
            ->put($attachment->storage_path, 'private'));

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertModelMissing($project);
        $attachments->each(fn (Attachment $attachment) => Storage::disk(Attachment::DISK)
            ->assertMissing($attachment->storage_path));
    }
}
