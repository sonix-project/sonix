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
use App\Models\RecentSearch;
use Illuminate\Http\Request;
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
        $user = is_numeric($id)
            ? User::select('id', 'username', 'bio', 'avatar', 'is_private', 'created_at')->find($id)
            : User::select('id', 'username', 'bio', 'avatar', 'is_private', 'created_at')->where('username', $id)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($request->user()->id != $user->id) {
            try {
                ProfileVisitor::updateOrCreate(
                    ['user_id' => $user->id, 'visitor_id' => $request->user()->id],
                    ['updated_at' => now()]
                );
            } catch (\Throwable $e) {
                // Table may not exist yet
            }
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
        $userId = $request->user()->id;
        $blockedIds = BlockedUser::where('user_id', $userId)->pluck('blocked_id')->toArray();
        $blockedByMe = BlockedUser::where('blocked_id', $userId)->pluck('user_id')->toArray();
        $excludeIds = array_unique(array_merge($blockedIds, $blockedByMe));

        $perPage = min((int) $request->input('per_page', 20), 50);
        $type = $request->input('type', 'all');

        $exact = $query;
        $prefix = $query . '%';
        $contains = '%' . $query . '%';

        $users = User::select('id', 'username', 'bio', 'avatar', 'is_private', 'online_at')
            ->whereNotIn('id', $excludeIds)
            ->where(function ($q) use ($exact, $prefix, $contains) {
                $q->where('username', 'ilike', $prefix)
                  ->orWhere('username', 'ilike', $contains)
                  ->orWhere('bio', 'ilike', $contains);
            })
            ->orderByRaw("CASE WHEN username ILIKE ? THEN 0 WHEN username ILIKE ? THEN 1 WHEN username ILIKE ? THEN 2 ELSE 3 END", [$exact, $prefix, $contains])
            ->orderBy('username')
            ->paginate($perPage);

        $followedIds = Follow::where('follower_id', $userId)
            ->where('status', 'accepted')
            ->pluck('following_id')
            ->toArray();

        $users->getCollection()->transform(function ($user) use ($userId, $followedIds) {
            return [
                'id' => $user->id,
                'username' => $user->username,
                'bio' => $user->bio,
                'avatar' => $user->avatar,
                'is_private' => $user->is_private,
                'is_online' => $user->online_at && $user->online_at->gt(now()->subMinutes(2)),
                'followers_count' => $user->followers()->where('status', 'accepted')->count(),
                'following_count' => $user->following()->where('status', 'accepted')->count(),
                'is_following' => in_array($user->id, $followedIds),
                'is_me' => $user->id === $userId,
            ];
        });

        return response()->json($users);
    }

    public function searchSuggestions(Request $request)
    {
        $query = $request->input('q', '');
        if (strlen($query) < 1) return response()->json([]);

        $query = Sanitize::text($query);
        $userId = $request->user()->id;

        $blockedIds = BlockedUser::where('user_id', $userId)->pluck('blocked_id')->toArray();
        $blockedByMe = BlockedUser::where('blocked_id', $userId)->pluck('user_id')->toArray();
        $excludeIds = array_unique(array_merge($blockedIds, $blockedByMe));

        $users = User::whereNotIn('id', $excludeIds)
            ->where('username', 'ilike', $query . '%')
            ->select('id', 'username', 'avatar')
            ->limit(5)
            ->get();

        return response()->json($users);
    }

    public function recentSearches(Request $request)
    {
        $userId = $request->user()->id;
        $recent = RecentSearch::where('user_id', $userId)
            ->with('searchedUser:id,username,avatar')
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get()
            ->pluck('searchedUser')
            ->filter()
            ->values();

        return response()->json($recent);
    }

    public function saveRecentSearch(Request $request)
    {
        $request->validate(['user_id' => 'required|exists:users,id']);
        $userId = $request->user()->id;
        $targetId = (int) $request->input('user_id');

        RecentSearch::updateOrCreate(
            ['user_id' => $userId, 'searched_user_id' => $targetId],
            ['updated_at' => now()]
        );

        $total = RecentSearch::where('user_id', $userId)->count();
        if ($total > 10) {
            RecentSearch::where('user_id', $userId)
                ->orderByAsc('updated_at')
                ->limit($total - 10)
                ->delete();
        }

        return response()->json(['message' => 'Saved']);
    }

    public function clearRecentSearches(Request $request)
    {
        RecentSearch::where('user_id', $request->user()->id)->delete();
        return response()->json(['message' => 'Cleared']);
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
        try {
            $visitors = ProfileVisitor::with('visitor:id,username,avatar')
                ->where('user_id', $id)
                ->latest()
                ->paginate(50);
            return response()->json($visitors);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'message' => 'Table not available yet']);
        }
    }

    public function badges($id)
    {
        try {
            $badges = UserBadge::where('user_id', $id)->latest()->get();
            return response()->json($badges);
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function addBadge(Request $request)
    {
        try {
            $request->validate([
                'user_id' => 'required|exists:users,id',
                'badge_type' => 'required|string|max:50',
                'badge_name' => 'required|string|max:100',
                'description' => 'nullable|string|max:255',
                'icon_url' => 'nullable|string|max:255',
            ]);

            $badge = UserBadge::create($request->only(['user_id', 'badge_type', 'badge_name', 'description', 'icon_url']));
            return response()->json($badge, 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to add badge', 'error' => $e->getMessage()], 500);
        }
    }

    public function removeBadge($id)
    {
        try {
            $badge = UserBadge::findOrFail($id);
            $badge->delete();
            return response()->json(['message' => 'Badge removed']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to remove badge'], 500);
        }
    }

    public function getTemplate($id)
    {
        try {
            $template = ProfileTemplate::where('user_id', $id)->where('is_active', true)->first();
            return response()->json($template);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Template not available']);
        }
    }

    public function setTemplate(Request $request)
    {
        try {
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
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to set template', 'error' => $e->getMessage()], 500);
        }
    }
}
