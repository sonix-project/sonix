<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\Sanitize;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function store(Request $request, $postId)
    {
        $parentId = $request->input('parent_id') ?? $request->input('parentId');

        if (!Post::where('id', $postId)->exists()) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        if ($parentId && !Comment::where('id', $parentId)->where('post_id', $postId)->exists()) {
            return response()->json(['message' => 'Parent comment not found'], 404);
        }

        $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        $comment = Comment::create([
            'content' => Sanitize::text($request->input('content')),
            'user_id' => $request->user()->id,
            'post_id' => $postId,
            'parent_id' => $parentId ? (int) $parentId : null,
        ]);

        $comment->load('user:id,username');

        $postUserId = Post::where('id', $postId)->value('user_id');
        if ($postUserId && $postUserId !== $request->user()->id) {
            \App\Models\Notification::create([
                'user_id' => $postUserId,
                'sender_id' => $request->user()->id,
                'type' => 'comment',
                'message' => 'commented on your post',
            ]);
        }

        return response()->json($comment);
    }

    public function index($postId)
    {
        $comments = Comment::with(['user:id,username,avatar', 'replies.user:id,username,avatar'])
            ->where('post_id', $postId)
            ->whereNull('parent_id')
            ->latest()
            ->get();

        return response()->json($comments);
    }

    public function destroy($id, Request $request)
    {
        $comment = Comment::find($id);
        if (!$comment) return response()->json(['message' => 'Not found'], 404);
        if ($comment->user_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);
        $comment->delete();
        return response()->json(['message' => 'Comment deleted']);
    }
}
