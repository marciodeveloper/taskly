<?php

namespace App\Http\Requests;

use App\Models\Attachment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreAttachmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string|File>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                File::types(Attachment::ALLOWED_MIME_TYPES)
                    ->max(Attachment::MAX_UPLOAD_KILOBYTES),
            ],
            'task_id' => ['prohibited'],
            'storage_path' => ['prohibited'],
            'mime_type' => ['prohibited'],
            'size' => ['prohibited'],
        ];
    }
}
