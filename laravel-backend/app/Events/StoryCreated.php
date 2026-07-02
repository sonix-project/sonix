<?php

namespace App\Events;

use App\Models\Story;
use App\Models\Follow;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StoryCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Story $story;

    public function __construct(Story $story)
    {
        $this->story = $story->load('user:id,username,avatar');
    }

    public function broadcastOn(): array
    {
        $channels = [];
        $followerIds = Follow::where('following_id', $this->story->user_id)
            ->where('status', 'accepted')
            ->pluck('follower_id')
            ->toArray();

        foreach ($followerIds as $followerId) {
            $channels[] = new Channel('stories.' . $followerId);
        }

        $channels[] = new Channel('stories.' . $this->story->user_id);

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'story.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->story->id,
            'user_id' => $this->story->user_id,
            'type' => $this->story->type,
            'image' => $this->story->image,
            'video' => $this->story->video,
            'text_overlay' => $this->story->text_overlay,
            'text_color' => $this->story->text_color,
            'bg_color' => $this->story->bg_color,
            'created_at' => $this->story->created_at->toISOString(),
            'user' => [
                'id' => $this->story->user->id,
                'username' => $this->story->user->username,
                'avatar' => $this->story->user->avatar,
            ],
        ];
    }
}
