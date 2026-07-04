<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\StoryReaction;
use App\Models\StoryHighlightItem;
use Carbon\Carbon;

class DeleteExpiredStories extends Command
{
    protected $signature = 'app:delete-expired-stories';
    protected $description = 'Delete stories older than 12 hours';

    public function handle()
    {
        $cutoff = Carbon::now()->subHours(12);
        $expired = Story::where('created_at', '<', $cutoff)->where('is_highlight', false)->get();

        foreach ($expired as $story) {
            if ($story->image) {
                $file = public_path(ltrim($story->image, '/'));
                if (file_exists($file)) @unlink($file);
            }
            if ($story->video) {
                $file = public_path(ltrim($story->video, '/'));
                if (file_exists($file)) @unlink($file);
            }
            StoryView::where('story_id', $story->id)->delete();
            StoryReaction::where('story_id', $story->id)->delete();
            StoryHighlightItem::where('story_id', $story->id)->delete();
            $story->delete();
        }

        $this->info("Deleted " . $expired->count() . " expired stories");
    }
}
