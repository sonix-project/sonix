<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Notification $notification;

    public function __construct(Notification $notification)
    {
        $this->notification = $notification->load('sender:id,username');
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('notifications.' . $this->notification->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'type' => $this->notification->type,
            'message' => $this->notification->message,
            'sender_id' => $this->notification->sender_id,
            'seen' => $this->notification->seen,
            'created_at' => $this->notification->created_at->toISOString(),
            'sender' => [
                'id' => $this->notification->sender->id,
                'username' => $this->notification->sender->username,
            ],
        ];
    }
}
