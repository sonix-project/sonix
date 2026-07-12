<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\Sanitize;
use App\Helpers\StorageHelper;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\ConversationSetting;
use App\Models\Notification;
use App\Models\User;
use App\Events\MessageSent;
use App\Events\TypingIndicator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class MessageController extends Controller
{
    public function send(Request $request)
    {
        $receiverId = (int) ($request->input('receiver_id') ?? $request->input('receiverId') ?? $request->input('recipient_id') ?? $request->input('recipientId'));

        if (!$receiverId || !User::where('id', $receiverId)->exists()) {
            return response()->json(['message' => 'Receiver not found'], 404);
        }

        $rules = ['content' => 'nullable|string|max:5000'];
        if ($request->hasFile('image')) {
            $rules['image'] = 'image|max:10240';
        }
        if ($request->hasFile('voice')) {
            $rules['voice'] = 'mimes:mp3,wav,ogg,webm|max:10240';
        }
        $request->validate($rules);

        $data = [
            'sender_id' => $request->user()->id,
            'receiver_id' => $receiverId,
            'content' => $request->input('content', '') !== '' ? Sanitize::text($request->input('content', '')) : '',
            'type' => 'text',
            'is_read' => false,
            'reply_to' => $request->input('reply_to'),
        ];

        if ($request->hasFile('image')) {
            try {
                $path = StorageHelper::upload($request->file('image'), 'uploads');
                if ($path) {
                    $data['image'] = StorageHelper::getUrl($path);
                    $data['type'] = 'image';
                } else {
                    return response()->json(['message' => 'Failed to upload image'], 422);
                }
            } catch (\Exception $e) {
                \Log::error('Image upload failed', ['error' => $e->getMessage()]);
                return response()->json(['message' => 'Failed to upload image'], 422);
            }
        } elseif ($request->hasFile('voice')) {
            try {
                $path = StorageHelper::upload($request->file('voice'), 'uploads');
                if ($path) {
                    $data['voice'] = StorageHelper::getUrl($path);
                    $data['type'] = 'voice';
                } else {
                    return response()->json(['message' => 'Failed to upload voice'], 422);
                }
            } catch (\Exception $e) {
                \Log::error('Voice upload failed', ['error' => $e->getMessage()]);
                return response()->json(['message' => 'Failed to upload voice'], 422);
            }
        } elseif ($request->has('reaction')) {
            $data['type'] = 'reaction';
            $data['content'] = $request->input('reaction');
        }

        $message = Message::create($data);

        Notification::create([
            'user_id' => $receiverId,
            'sender_id' => $request->user()->id,
            'type' => 'message',
            'message' => 'sent you a message',
        ]);

        $notification = Notification::where('user_id', $receiverId)
            ->where('sender_id', $request->user()->id)
            ->where('type', 'message')
            ->latest()
            ->first();

        if ($notification) {
            try {
                broadcast(new \App\Events\NotificationCreated($notification));
            } catch (\Exception $e) {
                \Log::warning('Notification broadcast failed: ' . $e->getMessage());
            }
        }

        $message->load('sender:id,username,avatar', 'replyMessage.sender:id,username');

        try {
            broadcast(new MessageSent($message));
        } catch (\Exception $e) {
            \Log::warning('Message broadcast failed: ' . $e->getMessage());
        }

        return response()->json($message, 201);
    }

    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        $partnerIds = Message::where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->selectRaw('DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id', [$userId])
            ->pluck('partner_id')
            ->filter(fn($id) => $id !== $userId)
            ->values();

        if ($partnerIds->isEmpty()) {
            return response()->json([]);
        }

        $users = User::whereIn('id', $partnerIds)
            ->select('id', 'username', 'avatar', 'online_at')
            ->get()
            ->keyBy('id');

        $lastMessages = Message::where(function ($q) use ($userId) {
            $q->where('sender_id', $userId)->orWhere('receiver_id', $userId);
        })
        ->where('is_deleted', false)
        ->whereIn('id', function ($q) use ($userId) {
            $q->selectRaw('MAX(id)')
              ->from('messages')
              ->where(function ($sub) use ($userId) {
                  $sub->where('sender_id', $userId)
                      ->orWhere('receiver_id', $userId);
              })
              ->where('is_deleted', false)
              ->groupByRaw('CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END', [$userId]);
        })
        ->get()
        ->keyBy(fn($m) => $m->sender_id === $userId ? $m->receiver_id : $m->sender_id);

        $unreadCounts = Message::where('receiver_id', $userId)
            ->where('is_read', false)
            ->where('is_deleted', false)
            ->selectRaw('sender_id, COUNT(*) as count')
            ->groupBy('sender_id')
            ->pluck('count', 'sender_id');

        $settings = ConversationSetting::where('user_id', $userId)
            ->whereIn('partner_id', $partnerIds)
            ->pluck('is_pinned', 'partner_id');

        $conversations = [];
        foreach ($partnerIds as $otherId) {
            $otherUser = $users->get($otherId);
            if (!$otherUser) continue;

            $lastMessage = $lastMessages->get($otherId);

            $conversations[] = [
                'user' => [
                    'id' => $otherUser->id,
                    'username' => $otherUser->username,
                    'avatar' => $otherUser->avatar,
                    'is_online' => $otherUser->online_at && $otherUser->online_at->gt(now()->subMinutes(2)),
                ],
                'last_message' => $lastMessage ? [
                    'id' => $lastMessage->id,
                    'content' => $lastMessage->content,
                    'type' => $lastMessage->type,
                    'created_at' => $lastMessage->created_at,
                    'is_mine' => $lastMessage->sender_id === $userId,
                    'is_read' => $lastMessage->is_read,
                ] : null,
                'unread_count' => (int) ($unreadCounts[$otherId] ?? 0),
                'is_pinned' => (bool) ($settings[$otherId] ?? false),
            ];
        }

        usort($conversations, function ($a, $b) {
            if ($a['is_pinned'] !== $b['is_pinned']) return $b['is_pinned'] <=> $a['is_pinned'];
            return ($b['last_message']['created_at']?->timestamp ?? 0) - ($a['last_message']['created_at']?->timestamp ?? 0);
        });

        return response()->json($conversations);
    }

    public function conversation(Request $request, $userId)
    {
        $currentUserId = $request->user()->id;
        $limit = (int) $request->input('limit', 50);
        $cursor = $request->input('cursor');

        $query = Message::with('sender:id,username,avatar', 'replyMessage.sender:id,username', 'reactions.user:id,username')
            ->where(function ($q) use ($currentUserId, $userId) {
                $q->where(function ($sub) use ($currentUserId, $userId) {
                    $sub->where('sender_id', $currentUserId)->where('receiver_id', $userId);
                })->orWhere(function ($sub) use ($currentUserId, $userId) {
                    $sub->where('sender_id', $userId)->where('receiver_id', $currentUserId);
                });
            })            ->where('is_deleted', false)
            ->where(function ($q) {
                $q->whereNull('disappears_at')->orWhere('disappears_at', '>', now());
            });

        if ($cursor) {
            $query->where('id', '<', $cursor);
        }

        $messages = $query->orderBy('id', 'desc')
            ->limit($limit + 1)
            ->get();

        $hasMore = $messages->count() > $limit;
        $messages = $messages->take($limit)->reverse()->values();

        return response()->json([
            'data' => $messages,
            'next_cursor' => $hasMore ? $messages->first()?->id : null,
            'has_more' => $hasMore,
        ]);
    }

    public function markAsRead(Request $request, $userId)
    {
        Message::where('sender_id', $userId)
            ->where('receiver_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }

    public function updateOnline(Request $request)
    {
        $user = $request->user();
        try {
            if (config('database.redis.client')) {
                Redis::setex("user:online:{$user->id}", 120, true);
                Redis::setex("user:last_seen:{$user->id}", 86400, now()->toISOString());
            }
        } catch (\Throwable $e) {
            // Redis unavailable, skip silently
        }

        return response()->json(['message' => 'Online status updated']);
    }

    public function totalUnread(Request $request)
    {
        $count = Message::where('receiver_id', $request->user()->id)
            ->where('is_read', false)
            ->where('is_deleted', false)
            ->count();

        return response()->json(['unread' => $count]);
    }

    public function typing(Request $request)
    {
        $receiverId = (int) ($request->input('receiver_id') ?? $request->input('receiverId'));
        $isTyping = $request->boolean('typing');
        $user = $request->user();

        if ($isTyping) {
            $user->update([
                'typing_at' => now(),
                'typing_to_user_id' => $receiverId,
            ]);
        } else {
            $user->update([
                'typing_at' => null,
                'typing_to_user_id' => null,
            ]);
        }

        try {
            broadcast(new TypingIndicator($user->id, $receiverId, $isTyping));
        } catch (\Exception $e) {
            \Log::warning('Typing broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'sender_id' => $user->id,
            'receiver_id' => $receiverId,
            'typing' => $isTyping,
        ]);
    }

    public function checkTyping($userId, Request $request)
    {
        $currentUser = $request->user();
        $otherUser = \App\Models\User::find($userId);
        if (!$otherUser) return response()->json(['typing' => false]);

        $isTyping = $otherUser->typing_at &&
                     $otherUser->typing_to_user_id == $currentUser->id &&
                     now()->diffInSeconds($otherUser->typing_at) < 5;

        return response()->json(['typing' => $isTyping]);
    }

    public function addReaction(Request $request, $id)
    {
        $message = Message::find($id);
        if (!$message) return response()->json(['message' => 'Not found'], 404);

        $request->validate(['emoji' => 'required|string|max:10']);

        $reaction = MessageReaction::updateOrCreate(
            ['message_id' => $id, 'user_id' => $request->user()->id],
            ['emoji' => $request->input('emoji')]
        );

        return response()->json($reaction);
    }

    public function removeReaction(Request $request, $id)
    {
        MessageReaction::where('message_id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Reaction removed']);
    }

    public function update(Request $request, $id)
    {
        $message = Message::find($id);
        if (!$message) return response()->json(['message' => 'Not found'], 404);
        if ($message->sender_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);

        $request->validate(['content' => 'required|string|max:5000']);

        if (!$message->is_edited) {
            $message->original_content = $message->content;
        }
        $message->content = Sanitize::text($request->input('content'));
        $message->is_edited = true;
        $message->save();

        return response()->json($message);
    }

    public function setVanish(Request $request, $id)
    {
        $message = Message::find($id);
        if (!$message) return response()->json(['message' => 'Not found'], 404);
        if ($message->sender_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);

        $request->validate(['seconds' => 'required|integer|min:1|max:86400']);

        $message->is_disappearing = true;
        $message->disappears_at = now()->addSeconds((int) $request->input('seconds'));
        $message->save();

        return response()->json([
            'message' => 'Message will vanish',
            'disappears_at' => $message->disappears_at,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $message = Message::find($id);
        if (!$message) return response()->json(['message' => 'Not found'], 404);
        if ($message->sender_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);

        $message->update(['is_deleted' => true, 'content' => '']);
        return response()->json(['message' => 'Message deleted']);
    }

    public function toggleMute(Request $request, $userId)
    {
        $setting = ConversationSetting::firstOrCreate(
            ['user_id' => $request->user()->id, 'partner_id' => $userId],
            ['is_muted' => false]
        );
        $setting->update(['is_muted' => \Illuminate\Support\Facades\DB::raw('NOT is_muted')]);
        $setting->refresh();

        return response()->json(['is_muted' => $setting->is_muted]);
    }

    public function togglePin(Request $request, $userId)
    {
        $setting = ConversationSetting::firstOrCreate(
            ['user_id' => $request->user()->id, 'partner_id' => $userId],
            ['is_pinned' => false]
        );
        $setting->update(['is_pinned' => \Illuminate\Support\Facades\DB::raw('NOT is_pinned')]);
        $setting->refresh();

        return response()->json(['is_pinned' => $setting->is_pinned]);
    }

    public function deleteConversation(Request $request, $userId)
    {
        Message::where(function ($q) use ($request, $userId) {
            $q->where('sender_id', $request->user()->id)->where('receiver_id', $userId);
        })->orWhere(function ($q) use ($request, $userId) {
            $q->where('sender_id', $userId)->where('receiver_id', $request->user()->id);
        })->update(['is_deleted' => true, 'content' => '']);

        return response()->json(['message' => 'Conversation deleted']);
    }

    public function forward(Request $request, $id)
    {
        $message = Message::find($id);
        if (!$message) return response()->json(['message' => 'Not found'], 404);

        $request->validate(['receiver_id' => 'required|exists:users,id']);

        $receiverId = (int) $request->input('receiver_id');

        $data = [
            'sender_id' => $request->user()->id,
            'receiver_id' => $receiverId,
            'content' => $message->content,
            'type' => $message->type,
            'image' => $message->image,
            'voice' => $message->voice,
            'is_read' => false,
        ];

        $forwarded = Message::create($data);
        $forwarded->load('sender:id,username,avatar');

        try { broadcast(new MessageSent($forwarded)); } catch (\Exception $e) {}

        return response()->json($forwarded, 201);
    }
}
