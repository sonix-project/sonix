<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Models\Post;
use Illuminate\Http\Request;

class BookmarkController extends Controller
{
    public function index(Request $request)
    {
        $posts = Post::with('user:id,username')
            ->withCount(['likes', 'likes as liked' => fn($q) => $q->where('user_id', $request->user()->id)])
            ->whereIn('id', Bookmark::where('user_id', $request->user()->id)->pluck('post_id'))
            ->latest()
            ->paginate(20);

        return response()->json($posts);
    }

    public function toggle(Request $request)
    {
        $postId = (int) ($request->input('post_id') ?? $request->input('postId'));

        if (!Post::where('id', $postId)->exists()) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $existing = Bookmark::where('user_id', $request->user()->id)
            ->where('post_id', $postId)->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['bookmarked' => false]);
        }

        Bookmark::create([
            'user_id' => $request->user()->id,
            'post_id' => $postId,
        ]);

        return response()->json(['bookmarked' => true]);
    }
}
