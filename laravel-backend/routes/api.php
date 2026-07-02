<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\LikeController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\BookmarkController;
use App\Http\Controllers\Api\BlockController;
use App\Http\Controllers\Api\ReportController;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::get('/users', [UserController::class, 'index']);
Route::get('/users/search', [UserController::class, 'search'])->middleware('auth:sanctum');
Route::get('/users/me', [UserController::class, 'me'])->middleware('auth:sanctum');
Route::post('/users/profile', [UserController::class, 'updateProfile'])->middleware('auth:sanctum');
Route::get('/users/{id}', [UserController::class, 'show']);
Route::get('/users/{id}/stats', [UserController::class, 'stats']);
Route::get('/users/{id}/status', [UserController::class, 'status']);
Route::post('/users/{id}/online', [UserController::class, 'setOnline'])->middleware('auth:sanctum');
Route::post('/notifications/register', [NotificationController::class, 'registerToken'])->middleware('auth:sanctum');
Route::post('/users/toggle-privacy', [UserController::class, 'togglePrivacy'])->middleware('auth:sanctum');

Route::post('/auth/change-password', [AuthController::class, 'changePassword'])->middleware(['auth:sanctum', 'throttle:5,1']);
Route::delete('/auth/account', [AuthController::class, 'deleteAccount'])->middleware('auth:sanctum');

Route::get('/posts', [PostController::class, 'index']);
Route::post('/posts', [PostController::class, 'store'])->middleware(['auth:sanctum', 'throttle:10,1']);
Route::get('/posts/{id}', [PostController::class, 'show']);
Route::put('/posts/{id}', [PostController::class, 'update'])->middleware('auth:sanctum');
Route::get('/posts/user/{userId}', [PostController::class, 'userPosts'])->middleware('auth:sanctum');
Route::delete('/posts/{id}', [PostController::class, 'destroy'])->middleware('auth:sanctum');

Route::post('/likes', [LikeController::class, 'toggle'])->middleware(['auth:sanctum', 'throttle:30,1']);
Route::get('/likes/{postId}', [LikeController::class, 'count']);
Route::get('/likes/{postId}/users', [LikeController::class, 'users']);

Route::get('/posts/{postId}/comments', [CommentController::class, 'index']);
Route::post('/posts/{postId}/comments', [CommentController::class, 'store'])->middleware(['auth:sanctum', 'throttle:20,1']);
Route::delete('/comments/{id}', [CommentController::class, 'destroy'])->middleware('auth:sanctum');

Route::post('/follow', [FollowController::class, 'toggle'])->middleware(['auth:sanctum', 'throttle:15,1']);
Route::get('/follow/{userId}/followers', [FollowController::class, 'followers']);
Route::get('/follow/{userId}/following', [FollowController::class, 'following']);
Route::get('/follow/requests', [FollowController::class, 'requests'])->middleware('auth:sanctum');
Route::post('/follow/approve/{id}', [FollowController::class, 'approve'])->middleware('auth:sanctum');
Route::post('/follow/reject/{id}', [FollowController::class, 'reject'])->middleware('auth:sanctum');
Route::get('/follow/{userId}/status', [FollowController::class, 'status'])->middleware('auth:sanctum');

Route::get('/feed', [FeedController::class, 'index'])->middleware('auth:sanctum');

Route::get('/notifications', [NotificationController::class, 'index'])->middleware('auth:sanctum');
Route::patch('/notifications/seen', [NotificationController::class, 'markAsSeen'])->middleware('auth:sanctum');

Route::post('/messages', [MessageController::class, 'send'])->middleware(['auth:sanctum', 'throttle:20,1']);
Route::get('/messages/unread', [MessageController::class, 'totalUnread'])->middleware('auth:sanctum');
Route::get('/messages/conversations', [MessageController::class, 'conversations'])->middleware('auth:sanctum');
Route::post('/messages/read/{userId}', [MessageController::class, 'markAsRead'])->middleware('auth:sanctum');
Route::post('/messages/online', [MessageController::class, 'updateOnline'])->middleware('auth:sanctum');
Route::post('/messages/typing', [MessageController::class, 'typing'])->middleware(['auth:sanctum', 'throttle:60,1']);
Route::get('/messages/typing/{userId}', [MessageController::class, 'checkTyping'])->middleware('auth:sanctum');
Route::get('/messages/{userId}', [MessageController::class, 'conversation'])->middleware('auth:sanctum');
Route::post('/messages/{id}/react', [MessageController::class, 'addReaction'])->middleware(['auth:sanctum', 'throttle:30,1']);
Route::delete('/messages/{id}/react', [MessageController::class, 'removeReaction'])->middleware('auth:sanctum');
Route::delete('/messages/{id}', [MessageController::class, 'destroy'])->middleware('auth:sanctum');
Route::post('/messages/mute/{userId}', [MessageController::class, 'toggleMute'])->middleware('auth:sanctum');
Route::post('/messages/pin/{userId}', [MessageController::class, 'togglePin'])->middleware('auth:sanctum');
Route::delete('/messages/conversation/{userId}', [MessageController::class, 'deleteConversation'])->middleware('auth:sanctum');

Route::get('/stories', [StoryController::class, 'index'])->middleware('auth:sanctum');
Route::post('/stories', [StoryController::class, 'store'])->middleware(['auth:sanctum', 'throttle:10,1']);
Route::get('/stories/{id}/viewers', [StoryController::class, 'viewers'])->middleware('auth:sanctum');
Route::post('/stories/{id}/view', [StoryController::class, 'view'])->middleware('auth:sanctum');
Route::post('/stories/{id}/react', [StoryController::class, 'react'])->middleware(['auth:sanctum', 'throttle:30,1']);
Route::delete('/stories/{id}/react', [StoryController::class, 'removeReaction'])->middleware('auth:sanctum');
Route::get('/stories/{id}/reactions', [StoryController::class, 'reactions'])->middleware('auth:sanctum');
Route::get('/stories/{id}/analytics', [StoryController::class, 'analytics'])->middleware('auth:sanctum');
Route::post('/stories/{id}/forward', [StoryController::class, 'forward'])->middleware(['auth:sanctum', 'throttle:10,1']);
Route::delete('/stories/{id}', [StoryController::class, 'destroy'])->middleware('auth:sanctum');

Route::get('/stories/highlights/all', [StoryController::class, 'highlights'])->middleware('auth:sanctum');
Route::post('/stories/highlights', [StoryController::class, 'storeHighlight'])->middleware(['auth:sanctum', 'throttle:10,1']);
Route::post('/stories/highlights/{highlightId}/add', [StoryController::class, 'addToHighlight'])->middleware(['auth:sanctum', 'throttle:20,1']);
Route::delete('/stories/highlights/{id}', [StoryController::class, 'deleteHighlight'])->middleware('auth:sanctum');
Route::put('/stories/highlights/{id}', [StoryController::class, 'updateHighlight'])->middleware('auth:sanctum');
Route::delete('/stories/highlights/{highlightId}/stories/{storyId}', [StoryController::class, 'removeFromHighlight'])->middleware('auth:sanctum');
Route::get('/stories/mine', [StoryController::class, 'myStories'])->middleware('auth:sanctum');
Route::get('/users/{userId}/highlights', [StoryController::class, 'userHighlights'])->middleware('auth:sanctum');

Route::get('/bookmarks', [BookmarkController::class, 'index'])->middleware('auth:sanctum');
Route::post('/bookmarks', [BookmarkController::class, 'toggle'])->middleware(['auth:sanctum', 'throttle:30,1']);

Route::post('/block', [BlockController::class, 'toggle'])->middleware(['auth:sanctum', 'throttle:15,1']);
Route::get('/block/{userId}/status', [BlockController::class, 'status'])->middleware('auth:sanctum');
Route::get('/block/list', [BlockController::class, 'blockedList'])->middleware('auth:sanctum');

Route::post('/reports', [ReportController::class, 'store'])->middleware(['auth:sanctum', 'throttle:10,1']);
