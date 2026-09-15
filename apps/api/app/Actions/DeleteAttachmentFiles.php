<?php

namespace App\Actions;

use App\Models\Attachment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DeleteAttachmentFiles
{
    /** @param Collection<int, Attachment> $attachments */
    public function handle(Collection $attachments): void
    {
        $paths = $attachments
            ->pluck('storage_path')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($paths !== [] && ! Storage::disk(Attachment::DISK)->delete($paths)) {
            throw new RuntimeException('Unable to remove one or more attachment files.');
        }
    }
}
