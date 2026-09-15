<?php

namespace App\Http\Controllers;

use App\Actions\DeleteAttachmentFiles;
use App\Http\Requests\StoreAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class AttachmentController extends Controller
{
    public function store(StoreAttachmentRequest $request, int $task): AttachmentResource
    {
        $ownedTask = $this->ownedTask($request, $task);
        $file = $request->file('file');
        $directory = "users/{$request->user()->id}/tasks/{$ownedTask->id}";
        $path = $file->store($directory, Attachment::DISK);

        try {
            $attachment = $ownedTask->attachments()->create([
                'original_name' => $this->safeOriginalName($file->getClientOriginalName()),
                'storage_path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        } catch (Throwable $exception) {
            Storage::disk(Attachment::DISK)->delete($path);

            throw $exception;
        }

        return new AttachmentResource($attachment);
    }

    public function content(Request $request, int $attachment): StreamedResponse
    {
        $ownedAttachment = $this->ownedAttachment($request, $attachment, 'view');
        $disk = Storage::disk(Attachment::DISK);

        abort_unless($disk->exists($ownedAttachment->storage_path), 404);

        $headers = [
            'Content-Type' => $ownedAttachment->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ];

        if ($ownedAttachment->isImage()) {
            return $disk->response(
                $ownedAttachment->storage_path,
                $ownedAttachment->original_name,
                $headers,
            );
        }

        return $disk->download(
            $ownedAttachment->storage_path,
            $ownedAttachment->original_name,
            $headers,
        );
    }

    public function destroy(
        Request $request,
        int $attachment,
        DeleteAttachmentFiles $deleteAttachmentFiles,
    ): Response {
        $ownedAttachment = $this->ownedAttachment($request, $attachment, 'delete');
        $deleteAttachmentFiles->handle(collect([$ownedAttachment]));
        $ownedAttachment->delete();

        return response()->noContent();
    }

    private function ownedTask(Request $request, int $task): Task
    {
        $ownedTask = Task::query()
            ->whereKey($task)
            ->whereIn('project_id', $request->user()->projects()->select('projects.id'))
            ->firstOrFail();

        abort_unless($request->user()->can('update', $ownedTask), 403);

        return $ownedTask;
    }

    private function ownedAttachment(
        Request $request,
        int $attachment,
        string $ability,
    ): Attachment {
        $ownedAttachment = Attachment::query()
            ->whereKey($attachment)
            ->whereHas('task.project', fn ($query) => $query->where('user_id', $request->user()->id))
            ->firstOrFail();

        abort_unless($request->user()->can($ability, $ownedAttachment), 403);

        return $ownedAttachment;
    }

    private function safeOriginalName(string $name): string
    {
        $basename = Str::of($name)->replace('\\', '/')->afterLast('/')->toString();
        $sanitized = preg_replace('/[\x00-\x1F\x7F]/u', '', $basename);

        return $sanitized === null || $sanitized === '' ? 'attachment' : $sanitized;
    }
}
