<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follow;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    public function toggle(Request $request)
    {
        $followingId = (int) ($request->input('following_id') ?? $request->input('followingId'));

        if (!$followingId) {
            return response()->json(['message' => 'following_id or followingId required'], 400);
        }

        $followerId = $request->user()->id;

        if ($followerId === $followingId) {
            return response()->json(['message' => 'You cannot follow yourself'], 400);
        }

        $existing = Follow::where('follower_id', $followerId)
            ->where('following_id', $followingId)
            ->first();

        if ($existing) {
            $existing->delete();
            if ($existing->status === 'pending') {
                return response()->json(['following' => false, 'requested' => false, 'message' => 'Request cancelled']);
            }
            return response()->json(['following' => false, 'message' => 'Unfollowed successfully']);
        }

        $targetUser = User::find($followingId);
        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($targetUser->is_private) {
            Follow::create([
                'follower_id' => $followerId,
                'following_id' => $followingId,
                'status' => 'pending',
            ]);

            Notification::create([
                'user_id' => $followingId,
                'sender_id' => $followerId,
                'type' => 'follow_request',
                'message' => 'wants to follow you',
            ]);

            return response()->json(['following' => false, 'requested' => true, 'message' => 'Follow request sent']);
        }

        Follow::create([
            'follower_id' => $followerId,
            'following_id' => $followingId,
            'status' => 'accepted',
        ]);

        Notification::create([
            'user_id' => $followingId,
            'sender_id' => $followerId,
            'type' => 'follow',
            'message' => 'started following you',
        ]);

        return response()->json(['following' => true, 'message' => 'Followed successfully']);
    }

    public function followers($userId)
    {
        $followers = Follow::with('follower:id,username')
            ->where('following_id', $userId)
            ->where('status', 'accepted')
            ->get();

        return response()->json($followers);
    }

    public function following($userId)
    {
        $following = Follow::with('following:id,username')
            ->where('follower_id', $userId)
            ->where('status', 'accepted')
            ->get();

        return response()->json($following);
    }

    public function requests(Request $request)
    {
        $requests = Follow::with('follower:id,username')
            ->where('following_id', $request->user()->id)
            ->where('status', 'pending')
            ->get();

        return response()->json($requests);
    }

    public function approve($id)
    {
        $follow = Follow::findOrFail($id);
        if ($follow->following_id !== request()->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $follow->update(['status' => 'accepted']);

        Notification::create([
            'user_id' => $follow->follower_id,
            'sender_id' => $follow->following_id,
            'type' => 'follow_request_accepted',
            'message' => 'accepted your follow request',
        ]);

        return response()->json(['message' => 'Follow request approved']);
    }

    public function reject($id)
    {
        $follow = Follow::findOrFail($id);
        if ($follow->following_id !== request()->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $follow->delete();
        return response()->json(['message' => 'Follow request rejected']);
    }

    public function status(Request $request, $userId)
    {
        $currentUserId = $request->user()->id;

        $follow = Follow::where('follower_id', $currentUserId)
            ->where('following_id', $userId)
            ->first();

        if (!$follow) {
            return response()->json(['following' => false, 'requested' => false]);
        }

        if ($follow->status === 'pending') {
            return response()->json(['following' => false, 'requested' => true, 'follow_id' => $follow->id]);
        }

        return response()->json(['following' => true, 'requested' => false, 'follow_id' => $follow->id]);
    }
}
