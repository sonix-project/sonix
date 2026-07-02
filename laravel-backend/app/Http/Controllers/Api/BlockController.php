<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlockedUser;
use Illuminate\Http\Request;

class BlockController extends Controller
{
    public function toggle(Request $request)
    {
        $blockedId = (int) ($request->input('blocked_id') ?? $request->input('blockedId'));
        $userId = $request->user()->id;

        if ($blockedId === $userId) {
            return response()->json(['message' => 'Cannot block yourself'], 400);
        }

        $existing = BlockedUser::where('user_id', $userId)
            ->where('blocked_id', $blockedId)->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['blocked' => false]);
        }

        BlockedUser::create([
            'user_id' => $userId,
            'blocked_id' => $blockedId,
        ]);

        return response()->json(['blocked' => true]);
    }

    public function status(Request $request, $userId)
    {
        $blocked = BlockedUser::where('user_id', $request->user()->id)
            ->where('blocked_id', $userId)->exists();

        return response()->json(['blocked' => $blocked]);
    }

    public function blockedList(Request $request)
    {
        $blocked = BlockedUser::with('blocked:id,username')
            ->where('user_id', $request->user()->id)
            ->get()
            ->pluck('blocked');

        return response()->json($blocked);
    }
}
