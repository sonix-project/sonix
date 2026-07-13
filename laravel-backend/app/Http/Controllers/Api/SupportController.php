<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    public function feedback(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        SupportMessage::create([
            'user_id' => $request->user()->id,
            'subject' => $request->subject,
            'message' => $request->message,
        ]);

        return response()->json(['message' => 'Feedback submitted']);
    }
}
