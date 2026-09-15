<?php

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'original_name' => 'document.txt',
            'storage_path' => 'users/1/tasks/1/generated.txt',
            'mime_type' => 'text/plain',
            'size' => 128,
        ];
    }
}
