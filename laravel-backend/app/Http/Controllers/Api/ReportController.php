<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\Sanitize;
use App\Models\Report;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:post,user',
            'id' => 'required|integer',
            'reason' => 'required|string|max:255',
        ]);

        $type = $request->input('type');
        $targetId = (int) $request->input('id');
        $reason = Sanitize::text($request->input('reason'));

        if ($type === 'post') {
            $target = Post::find($targetId);
            if (!$target) return response()->json(['message' => 'Post not found'], 404);
        } else {
            $target = User::find($targetId);
            if (!$target) return response()->json(['message' => 'User not found'], 404);
            if ($target->id === $request->user()->id) {
                return response()->json(['message' => 'Cannot report yourself'], 400);
            }
        }

        $existing = Report::where('reporter_id', $request->user()->id)
            ->where('reportable_type', $type === 'post' ? Post::class : User::class)
            ->where('reportable_id', $targetId)
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'Already reported'], 409);
        }

        Report::create([
            'reporter_id' => $request->user()->id,
            'reportable_type' => $type === 'post' ? Post::class : User::class,
            'reportable_id' => $targetId,
            'reason' => $reason,
        ]);

        return response()->json(['message' => 'Report submitted']);
    }
}
