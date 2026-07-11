<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PostStatsController extends Controller
{
    public function show($postId)
    {
        $post = \App\Models\Post::findOrFail($postId);

        $stats = [
            'views' => $post->views_count ?? 0,
            'likes' => $post->likes()->count(),
            'comments' => $post->comments()->count(),
            'bookmarks' => $post->bookmarks()->count(),
        ];

        return response()->json($stats);
    }

    public function recordView($postId)
    {
        $post = \App\Models\Post::findOrFail($postId);

        $post->increment('views_count');

        try {
            \App\Models\PostView::create([
                'post_id' => $postId,
                'user_id' => Auth::id(),
                'ip_address' => request()->ip(),
            ]);
        } catch (\Exception $e) {
            // Table might not exist yet
        }

        return response()->json(['views' => $post->views_count]);
    }

    public function pin($postId)
    {
        $post = \App\Models\Post::where('user_id', Auth::id())->findOrFail($postId);

        $pinned = \App\Models\PinnedPost::where('user_id', Auth::id())->first();
        if ($pinned) {
            $pinned->delete();
        }

        \App\Models\PinnedPost::create([
            'user_id' => Auth::id(),
            'post_id' => $postId,
        ]);

        $post->update(['is_pinned' => true]);

        return response()->json(['message' => 'Post pinned']);
    }

    public function unpin($postId)
    {
        \App\Models\PinnedPost::where('user_id', Auth::id())->where('post_id', $postId)->delete();
        \App\Models\Post::where('id', $postId)->update(['is_pinned' => false]);

        return response()->json(['message' => 'Post unpinned']);
    }
}
