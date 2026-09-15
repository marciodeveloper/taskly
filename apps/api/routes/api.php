<?php

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Guest endpoints. Throttled because they accept an arbitrary e-mail address.
Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendResetLink'])
    ->middleware('throttle:6,1');
Route::post('/auth/reset-password', [PasswordResetController::class, 'reset'])
    ->middleware('throttle:6,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/projects/{project}/tasks', [TaskController::class, 'index']);
    Route::post('/projects/{project}/tasks', [TaskController::class, 'store']);
    Route::post('/tasks/{task}/attachments', [AttachmentController::class, 'store']);
    Route::get('/attachments/{attachment}/content', [AttachmentController::class, 'content'])
        ->name('attachments.content');
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);
    Route::patch('/projects/reorder', [ProjectController::class, 'reorder']);
    Route::apiResource('projects', ProjectController::class)->except(['create', 'edit']);
    Route::apiResource('tasks', TaskController::class)->only(['show', 'update', 'destroy']);
    Route::apiResource('tags', TagController::class)->only(['index', 'store', 'update', 'destroy']);
});
