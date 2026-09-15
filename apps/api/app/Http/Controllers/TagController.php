<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTagRequest;
use App\Http\Requests\UpdateTagRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TagController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return TagResource::collection(
            $request->user()->tags()->orderBy('name')->orderBy('id')->get(),
        );
    }

    public function store(StoreTagRequest $request): TagResource
    {
        return new TagResource($request->user()->tags()->create($request->validated()));
    }

    public function update(UpdateTagRequest $request, int $tag): TagResource
    {
        $ownedTag = $this->ownedTag($request, $tag, 'update');
        $ownedTag->update($request->validated());

        return new TagResource($ownedTag->refresh());
    }

    public function destroy(Request $request, int $tag): Response
    {
        $ownedTag = $this->ownedTag($request, $tag, 'delete');
        $ownedTag->delete();

        return response()->noContent();
    }

    private function ownedTag(Request $request, int $tag, string $ability): Tag
    {
        $ownedTag = $request->user()->tags()->findOrFail($tag);
        abort_unless($request->user()->can($ability, $ownedTag), 403);

        return $ownedTag;
    }
}
