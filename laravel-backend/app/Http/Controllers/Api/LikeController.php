<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Like;
use App\Models\Post;
use App\Models\BlockedUser;
use Illuminate\Http\Request;

class LikeController extends Controller
{
    public function toggle(Request $request)
    {
        $postId = (int) ($request->input('post_id') ?? $request->input('postId'));

        if (!$postId || !Post::where('id', $postId)->exists()) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $userId = $request->user()->id;

        $existing = Like::where('user_id', $userId)
            ->where('post_id', $postId)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['liked' => false]);
        }

        Like::create([
            'user_id' => $userId,
            'post_id' => $postId,
        ]);

        $postUserId = Post::where('id', $postId)->value('user_id');
        if ($postUserId && $postUserId !== $userId) {
            \App\Models\Notification::create([
                'user_id' => $postUserId,
                'sender_id' => $userId,
                'type' => 'like',
                'message' => 'liked your post',
            ]);
        }

        return response()->json(['liked' => true]);
    }

    public function count($postId)
    {
        $count = Like::where('post_id', $postId)->count();

        return response()->json([
            'postId' => (int) $postId,
            'likes' => $count,
        ]);
    }

    public function users($postId, Request $request)
    {
        if (!Post::where('id', $postId)->exists()) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $blockedIds = BlockedUser::where('user_id', $request->user()?->id)->pluck('blocked_id')->toArray();

        $users = Like::with('user:id,username,avatar')
            ->where('post_id', $postId)
            ->whereHas('user', function ($q) use ($blockedIds) {
                $q->whereNotIn('id', $blockedIds);
            })
            ->latest()
            ->get()
            ->pluck('user');

        return response()->json($users);
    }
}
