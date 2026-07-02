<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;
    public int $senderId;
    public int $receiverId;

    public function __construct(Message $message)
    {
        $this->message = $message->load('sender:id,username,avatar', 'replyMessage.sender:id,username');
        $this->senderId = $message->sender_id;
        $this->receiverId = $message->receiver_id;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('messages.' . $this->receiverId),
            new Channel('messages.' . $this->senderId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'content' => $this->message->content,
            'type' => $this->message->type,
            'image' => $this->message->image,
            'voice' => $this->message->voice,
            'sender_id' => $this->message->sender_id,
            'receiver_id' => $this->message->receiver_id,
            'created_at' => $this->message->created_at->toISOString(),
            'is_read' => $this->message->is_read,
            'reply_to' => $this->message->reply_to,
            'sender' => [
                'id' => $this->message->sender->id,
                'username' => $this->message->sender->username,
                'avatar' => $this->message->sender->avatar,
            ],
        ];
    }
}
