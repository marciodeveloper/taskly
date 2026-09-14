<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReorderProjectsRequest;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        return ProjectResource::collection(
            $request->user()->projects()->orderBy('position')->orderBy('id')->get(),
        );
    }

    public function store(StoreProjectRequest $request): ProjectResource
    {
        $maxPosition = $request->user()->projects()->max('position');
        $position = $maxPosition === null ? 0 : $maxPosition + 1;
        $project = $request->user()->projects()->create([
            ...$request->validated(),
            'position' => $position,
        ]);

        return new ProjectResource($project);
    }

    public function show(Request $request, int $project): ProjectResource
    {
        return new ProjectResource($this->ownedProject($request, $project, 'view'));
    }

    public function update(UpdateProjectRequest $request, int $project): ProjectResource
    {
        $ownedProject = $this->ownedProject($request, $project, 'update');
        $ownedProject->update($request->validated());

        return new ProjectResource($ownedProject->refresh());
    }

    public function destroy(Request $request, int $project): Response
    {
        $ownedProject = $this->ownedProject($request, $project, 'delete');
        $ownedProject->delete();

        return response()->noContent();
    }

    public function reorder(ReorderProjectsRequest $request): Response
    {
        $projectIds = $request->validated('project_ids');

        DB::transaction(function () use ($request, $projectIds): void {
            foreach ($projectIds as $position => $projectId) {
                $request->user()->projects()->whereKey($projectId)->update([
                    'position' => $position,
                ]);
            }
        });

        return response()->noContent();
    }

    private function ownedProject(Request $request, int $project, string $ability): Project
    {
        $ownedProject = $request->user()->projects()->findOrFail($project);
        abort_unless($request->user()->can($ability, $ownedProject), 403);

        return $ownedProject;
    }
}
