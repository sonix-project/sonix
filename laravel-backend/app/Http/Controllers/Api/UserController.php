<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\Sanitize;
use App\Helpers\StorageHelper;
use App\Models\User;
use App\Models\Post;
use App\Models\Follow;
use App\Models\BlockedUser;
use App\Models\ProfileVisitor;
use App\Models\UserBadge;
use App\Models\ProfileTemplate;
use Illuminate\Http\Request;
use App\Models\Message;
use Illuminate\Support\Facades\Redis;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $blockedIds = BlockedUser::where('user_id', $request->user()?->id)->pluck('blocked_id')->toArray();
        $users = User::select('id', 'username', 'avatar', 'is_private')
            ->whereNotIn('id', $blockedIds)
            ->paginate(50);
        return response()->json($users);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'bio' => $user->bio,
            'avatar' => $user->avatar,
            'is_private' => $user->is_private,
            'created_at' => $user->created_at,
        ]);
    }

    public function show(Request $request, $id)
    {
        $user = User::select('id', 'username', 'bio', 'avatar', 'is_private', 'created_at')
            ->findOrFail($id);

        if ($request->user()->id != $id) {
            ProfileVisitor::updateOrCreate(
                ['user_id' => $id, 'visitor_id' => $request->user()->id],
                ['updated_at' => now()]
            );
        }

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
            $user->username = Sanitize::text($request->input('username'));
        }

        if ($request->has('bio')) {
            $user->bio = Sanitize::text($request->input('bio'));
        }

        if ($request->hasFile('avatar')) {
            $path = StorageHelper::upload($request->file('avatar'), 'uploads');
            $user->avatar = StorageHelper::getUrl($path);
        }

        $user->save();

        return response()->json([
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'bio' => $user->bio,
            'avatar' => $user->avatar,
            'is_private' => $user->is_private,
        ]);
    }

    public function search(Request $request)
    {
        $query = $request->input('q', '');
        if (strlen($query) < 2) return response()->json([]);

        $query = Sanitize::text($query);
        $blockedIds = BlockedUser::where('user_id', $request->user()?->id)->pluck('blocked_id')->toArray();

        $users = User::select('id', 'username', 'avatar', 'is_private')
            ->whereNotIn('id', $blockedIds)
            ->where('username', 'like', '%' . $query . '%')
            ->limit(20)
            ->get();

        return response()->json($users);
    }

    public function status($id)
    {
        $isOnline = false;
        $lastSeen = null;

        try {
            if (config('database.redis.client')) {
                $isOnline = (bool) Redis::get("user:online:{$id}");
                $lastSeen = Redis::get("user:last_seen:{$id}");
            }
        } catch (\Throwable $e) {
            // Redis unavailable, return defaults
        }

        return response()->json([
            'user_id' => $id,
            'is_online' => $isOnline,
            'last_seen' => $lastSeen,
        ]);
    }

    public function setOnline($id, Request $request)
    {
        $userId = $request->user()->id;
        try {
            if (config('database.redis.client')) {
                Redis::setex("user:online:{$userId}", 120, true);
                Redis::setex("user:last_seen:{$userId}", 86400, now()->toISOString());
            }
        } catch (\Throwable $e) {
            // Redis unavailable, skip silently
        }
        return response()->json(['message' => 'Online status updated']);
    }

    public function visitors($id)
    {
        $visitors = ProfileVisitor::with('visitor:id,username,avatar')
            ->where('user_id', $id)
            ->latest()
            ->paginate(50);
        return response()->json($visitors);
    }

    public function badges($id)
    {
        $badges = UserBadge::where('user_id', $id)->latest()->get();
        return response()->json($badges);
    }

    public function addBadge(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'badge_type' => 'required|string|max:50',
            'badge_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'icon_url' => 'nullable|string|max:255',
        ]);

        $badge = UserBadge::create($request->only(['user_id', 'badge_type', 'badge_name', 'description', 'icon_url']));
        return response()->json($badge, 201);
    }

    public function removeBadge($id)
    {
        $badge = UserBadge::findOrFail($id);
        $badge->delete();
        return response()->json(['message' => 'Badge removed']);
    }

    public function getTemplate($id)
    {
        $template = ProfileTemplate::where('user_id', $id)->where('is_active', true)->first();
        return response()->json($template);
    }

    public function setTemplate(Request $request)
    {
        $request->validate([
            'template_name' => 'required|string|max:100',
            'template_data' => 'nullable|array',
        ]);

        ProfileTemplate::where('user_id', $request->user()->id)->update(['is_active' => false]);

        $template = ProfileTemplate::create([
            'user_id' => $request->user()->id,
            'template_name' => $request->input('template_name'),
            'template_data' => $request->input('template_data'),
            'is_active' => true,
        ]);

        return response()->json($template, 201);
    }
}
