<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Post;
use App\Models\Follow;
use App\Models\BlockedUser;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $blockedIds = BlockedUser::where('user_id', $request->user()?->id)->pluck('blocked_id')->toArray();
        $users = User::select('id', 'username', 'avatar', 'is_private')
            ->whereNotIn('id', $blockedIds)
            ->get();
        return response()->json($users);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function show(Request $request, $id)
    {
        $user = User::select('id', 'username', 'bio', 'avatar', 'is_private', 'created_at')
            ->findOrFail($id);

        return response()->json($user);
    }

    public function stats($id)
    {
        $postsCount = Post::where('user_id', $id)->count();
        $followersCount = Follow::where('following_id', $id)->where('status', 'accepted')->count();
        $followingCount = Follow::where('follower_id', $id)->where('status', 'accepted')->count();

        return response()->json([
            'posts' => $postsCount,
            'followers' => $followersCount,
            'following' => $followingCount,
        ]);
    }

    public function togglePrivacy(Request $request)
    {
        $user = $request->user();
        $user->is_private = !$user->is_private;
        $user->save();

        return response()->json([
            'is_private' => $user->is_private,
            'message' => $user->is_private ? 'Account is now private' : 'Account is now public',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'username' => 'sometimes|string|max:30|unique:users,username,' . $user->id,
            'bio' => 'nullable|string|max:150',
            'avatar' => 'nullable|image|max:2048',
        ]);

        if ($request->has('username')) {
            $user->username = $request->input('username');
        }

        if ($request->has('bio')) {
            $user->bio = $request->input('bio');
        }

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('uploads', 'public');
            $user->avatar = "/storage/$path";
        }

        $user->save();

        return response()->json($user);
    }

    public function search(Request $request)
    {
        $query = $request->input('q', '');
        if (strlen($query) < 2) return response()->json([]);

        $blockedIds = BlockedUser::where('user_id', $request->user()?->id)->pluck('blocked_id')->toArray();

        $users = User::select('id', 'username', 'avatar', 'is_private')
            ->whereNotIn('id', $blockedIds)
            ->where('username', 'like', "%{$query}%")
            ->limit(20)
            ->get();

        return response()->json($users);
    }

    public function status($id)
    {
        $isOnline = Redis::get("user:online:{$id}");
        $lastSeen = Redis::get("user:last_seen:{$id}");

        return response()->json([
            'user_id' => $id,
            'is_online' => (bool) $isOnline,
            'last_seen' => $lastSeen,
        ]);
    }

    public function setOnline($id)
    {
        Redis::setex("user:online:{$id}", 120, true);
        Redis::setex("user:last_seen:{$id}", 86400, now()->toISOString());
        return response()->json(['message' => 'Online status updated']);
    }
}
