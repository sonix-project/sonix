<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function preferences(Request $request)
    {
        $prefs = $request->user()->notification_prefs;

        if (!$prefs) {
            $prefs = (object) [
                'push_enabled' => true,
                'email_enabled' => false,
                'like_notifications' => true,
                'comment_notifications' => true,
                'follow_notifications' => true,
                'message_notifications' => true,
            ];
        }

        return response()->json($prefs);
    }

    public function updatePreferences(Request $request)
    {
        $valid = $request->validate([
            'push_enabled' => 'boolean',
            'email_enabled' => 'boolean',
            'like_notifications' => 'boolean',
            'comment_notifications' => 'boolean',
            'follow_notifications' => 'boolean',
            'message_notifications' => 'boolean',
        ]);

        $request->user()->update(['notification_prefs' => $valid]);

        return response()->json(['message' => 'Preferences updated']);
    }

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
