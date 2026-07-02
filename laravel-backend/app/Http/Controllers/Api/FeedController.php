<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follow;
use App\Models\Post;
use App\Models\Bookmark;
use Illuminate\Http\Request;

class FeedController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $perPage = (int) ($request->input('per_page', 20));

        $followingIds = Follow::where('follower_id', $userId)
            ->where('status', 'accepted')
            ->pluck('following_id')
            ->toArray();

        $followingIds[] = $userId;

        $bookmarkedPostIds = Bookmark::where('user_id', $userId)->pluck('post_id');

        $posts = Post::with('user:id,username,avatar')
            ->with(['comments' => function ($q) {
                $q->with('user:id,username,avatar')->latest()->limit(2);
            }])
            ->withCount(['likes', 'likes as liked' => fn($q) => $q->where('user_id', $userId)])
            ->withCount('comments as comments_count')
            ->whereIn('user_id', $followingIds)
            ->latest()
            ->paginate($perPage);

        $posts->getCollection()->transform(function ($post) use ($bookmarkedPostIds) {
            $post->bookmarked = $bookmarkedPostIds->contains($post->id);
            return $post;
        });

        return response()->json($posts);
    }
}
