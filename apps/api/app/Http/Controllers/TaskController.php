<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TaskController extends Controller
{
    public function index(Request $request, int $project): AnonymousResourceCollection
    {
        $ownedProject = $this->ownedProject($request, $project);

        return TaskResource::collection(
            $ownedProject->tasks()->orderBy('position')->orderBy('id')->get(),
        );
    }

    public function store(StoreTaskRequest $request, int $project): TaskResource
    {
        $ownedProject = $this->ownedProject($request, $project);
        $maxPosition = $ownedProject->tasks()->max('position');
        $attributes = $this->withCompletedAt($request->validated());
        $task = $ownedProject->tasks()->create([
            ...$attributes,
            'position' => $maxPosition === null ? 0 : $maxPosition + 1,
        ]);

        return new TaskResource($task);
    }

    public function show(Request $request, int $task): TaskResource
    {
        return new TaskResource($this->ownedTask($request, $task, 'view'));
    }

    public function update(UpdateTaskRequest $request, int $task): TaskResource
    {
        $ownedTask = $this->ownedTask($request, $task, 'update');
        $ownedTask->update($this->withCompletedAt($request->validated(), $ownedTask));

        return new TaskResource($ownedTask->refresh());
    }

    public function destroy(Request $request, int $task): Response
    {
        $ownedTask = $this->ownedTask($request, $task, 'delete');
        $ownedTask->delete();

        return response()->noContent();
    }

    private function ownedProject(Request $request, int $project): Project
    {
        return $request->user()->projects()->findOrFail($project);
    }

    private function ownedTask(Request $request, int $task, string $ability): Task
    {
        $ownedTask = Task::query()
            ->whereKey($task)
            ->whereIn('project_id', $request->user()->projects()->select('projects.id'))
            ->firstOrFail();

        abort_unless($request->user()->can($ability, $ownedTask), 403);

        return $ownedTask;
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withCompletedAt(array $attributes, ?Task $task = null): array
    {
        if (! array_key_exists('status', $attributes)) {
            return $attributes;
        }

        $status = TaskStatus::from($attributes['status']);
        $attributes['status'] = $status;

        if ($status !== TaskStatus::Completed) {
            $attributes['completed_at'] = null;
        } elseif ($task?->status !== TaskStatus::Completed) {
            $attributes['completed_at'] = now();
        }

        return $attributes;
    }
}
