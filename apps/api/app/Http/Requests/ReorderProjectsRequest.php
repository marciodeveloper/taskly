<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderProjectsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('projects', 'id')->where(
                    fn ($query) => $query->where('user_id', $this->user()->id),
                ),
            ],
        ];
    }
}
