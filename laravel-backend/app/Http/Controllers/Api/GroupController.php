<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\GroupMessage;
use App\Models\User;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $groupIds = GroupMember::where('user_id', $userId)->pluck('group_id');

        $groups = Group::whereIn('id', $groupIds)
            ->with(['members.user:id,username,avatar', 'lastMessage.user:id,username'])
            ->withCount('members')
            ->get()
            ->map(function ($group) use ($userId) {
                $lastMsg = $group->lastMessage;
                return [
                    'id' => $group->id,
                    'name' => $group->name,
                    'avatar' => $group->avatar,
                    'members_count' => $group->members_count,
                    'members' => $group->members->map(fn($m) => [
                        'id' => $m->user->id,
                        'username' => $m->user->username,
                        'avatar' => $m->user->avatar,
                        'role' => $m->role,
                    ]),
                    'last_message' => $lastMsg ? [
                        'id' => $lastMsg->id,
                        'content' => $lastMsg->content,
                        'type' => $lastMsg->type,
                        'user_id' => $lastMsg->user_id,
                        'username' => $lastMsg->user->username,
                        'created_at' => $lastMsg->created_at,
                        'is_mine' => $lastMsg->user_id === $userId,
                    ] : null,
                    'created_by' => $group->created_by,
                    'created_at' => $group->created_at,
                ];
            })
            ->sortByDesc(fn($g) => $g['last_message'] ? $g['last_message']['created_at'] : $g['created_at'])
            ->values();

        return response()->json($groups);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'member_ids' => 'required|array|min:1',
            'member_ids.*' => 'exists:users,id',
        ]);

        $userIds = array_unique(array_merge([$request->user()->id], $request->input('member_ids')));

        $group = Group::create([
            'name' => $request->input('name'),
            'created_by' => $request->user()->id,
        ]);

        foreach ($userIds as $uid) {
            GroupMember::create([
                'group_id' => $group->id,
                'user_id' => $uid,
                'role' => $uid === $request->user()->id ? 'admin' : 'member',
            ]);
        }

        $group->load('members.user:id,username,avatar');

        return response()->json([
            'id' => $group->id,
            'name' => $group->name,
            'avatar' => $group->avatar,
            'members_count' => $group->members->count(),
            'members' => $group->members->map(fn($m) => [
                'id' => $m->user->id,
                'username' => $m->user->username,
                'avatar' => $m->user->avatar,
                'role' => $m->role,
            ]),
            'created_by' => $group->created_by,
            'created_at' => $group->created_at,
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $group = Group::with('members.user:id,username,avatar')->withCount('members')->find($id);
        if (!$group) return response()->json(['message' => 'Not found'], 404);

        $isMember = $group->members->contains('user_id', $request->user()->id);
        if (!$isMember) return response()->json(['message' => 'Forbidden'], 403);

        return response()->json([
            'id' => $group->id,
            'name' => $group->name,
            'avatar' => $group->avatar,
            'members_count' => $group->members_count,
            'members' => $group->members->map(fn($m) => [
                'id' => $m->user->id,
                'username' => $m->user->username,
                'avatar' => $m->user->avatar,
                'role' => $m->role,
            ]),
            'created_by' => $group->created_by,
            'created_at' => $group->created_at,
        ]);
    }

    public function addMembers(Request $request, $id)
    {
        $group = Group::find($id);
        if (!$group) return response()->json(['message' => 'Not found'], 404);

        $member = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->first();
        if (!$member || $member->role !== 'admin') return response()->json(['message' => 'Forbidden'], 403);

        $request->validate(['user_ids' => 'required|array|min:1', 'user_ids.*' => 'exists:users,id']);

        foreach ($request->input('user_ids') as $uid) {
            GroupMember::firstOrCreate(
                ['group_id' => $id, 'user_id' => $uid],
                ['role' => 'member']
            );
        }

        $group->load('members.user:id,username,avatar');
        return response()->json(['message' => 'Members added', 'members' => $group->members->map(fn($m) => [
            'id' => $m->user->id, 'username' => $m->user->username, 'avatar' => $m->user->avatar, 'role' => $m->role,
        ])]);
    }

    public function removeMember(Request $request, $id, $userId)
    {
        $group = Group::find($id);
        if (!$group) return response()->json(['message' => 'Not found'], 404);

        $currentMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->first();
        if (!$currentMember || $currentMember->role !== 'admin') return response()->json(['message' => 'Forbidden'], 403);

        GroupMember::where('group_id', $id)->where('user_id', $userId)->delete();
        return response()->json(['message' => 'Member removed']);
    }

    public function sendMessage(Request $request, $id)
    {
        $group = Group::find($id);
        if (!$group) return response()->json(['message' => 'Not found'], 404);

        $isMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->exists();
        if (!$isMember) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate(['content' => 'required|string|max:5000']);

        $message = GroupMessage::create([
            'group_id' => $id,
            'user_id' => $request->user()->id,
            'content' => $request->input('content'),
            'type' => 'text',
        ]);

        $message->load('user:id,username,avatar');

        return response()->json($message, 201);
    }

    public function messages(Request $request, $id)
    {
        $group = Group::find($id);
        if (!$group) return response()->json(['message' => 'Not found'], 404);

        $isMember = GroupMember::where('group_id', $id)->where('user_id', $request->user()->id)->exists();
        if (!$isMember) return response()->json(['message' => 'Forbidden'], 403);

        $limit = (int) $request->input('limit', 50);
        $cursor = $request->input('cursor');

        $query = GroupMessage::with('user:id,username,avatar')
            ->where('group_id', $id);

        if ($cursor) $query->where('id', '<', $cursor);

        $messages = $query->orderBy('id', 'desc')->limit($limit + 1)->get();

        $hasMore = $messages->count() > $limit;
        $messages = $messages->take($limit)->reverse()->values();

        return response()->json([
            'data' => $messages,
            'next_cursor' => $hasMore ? $messages->first()?->id : null,
            'has_more' => $hasMore,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $group = Group::find($id);
        if (!$group) return response()->json(['message' => 'Not found'], 404);
        if ($group->created_by !== $request->user()->id) return response()->json(['message' => 'Forbidden'], 403);

        $group->delete();
        return response()->json(['message' => 'Group deleted']);
    }
}
