<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->with('sender:id,username')
            ->latest()
            ->take(50)
            ->get();

        return response()->json($notifications);
    }

    public function markAsSeen(Request $request)
    {
        $request->user()
            ->notifications()
            ->update(['seen' => true]);

        return response()->json(['message' => 'Marked as seen']);
    }

    public function registerToken(Request $request)
    {
        $request->validate(['token' => 'required|string']);

        $request->user()->update([
            'push_token' => $request->input('token'),
        ]);

        return response()->json(['message' => 'Push token registered']);
    }
}
