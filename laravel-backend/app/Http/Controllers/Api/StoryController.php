<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\StoryReaction;
use App\Models\StoryHighlight;
use App\Models\StoryHighlightItem;
use App\Models\Follow;
use App\Models\Notification;
use App\Events\StoryCreated;
use App\Services\ImageService;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $followingIds = Follow::where('follower_id', $userId)
            ->where('status', 'accepted')
            ->pluck('following_id')
            ->toArray();

        $followingIds[] = $userId;

        $stories = Story::with(['user:id,username,avatar', 'reactions' => function ($q) {
            $q->selectRaw('story_id, emoji, COUNT(*) as count')->groupBy('story_id', 'emoji');
        }])
            ->whereIn('user_id', $followingIds)
            ->where('created_at', '>=', now()->subHours(12))
            ->latest()
            ->get()
            ->groupBy('user_id');

        $result = [];
        foreach ($stories as $uid => $userStories) {
            $first = $userStories->first();
            $hasUnseen = $userStories->contains(function ($story) use ($userId) {
                return !StoryView::where('story_id', $story->id)
                    ->where('user_id', $userId)->exists();
            });

            $storiesData = $userStories->map(function ($story) use ($userId) {
                $story->view_count = $story->views()->count();
                $story->reaction_count = $story->reactions()->count();
                $story->my_reaction = $story->reactions()->where('user_id', $userId)->value('emoji');
                return $story;
            });

            $result[] = [
                'user' => $first->user,
                'stories' => $storiesData->values()->toArray(),
                'has_unseen' => $hasUnseen,
            ];
        }

        usort($result, fn($a, $b) => $b['stories'][0]['created_at'] <=> $a['stories'][0]['created_at']);

        return response()->json($result);
    }

    public function store(Request $request)
    {
        $rules = [];
        if ($request->hasFile('video')) {
            $rules['video'] = 'required|mimes:mp4,mov,avi,webm|max:51200';
        } else {
            $rules['image'] = 'nullable|image|max:5120';
        }
        $rules['text_overlay'] = 'nullable|string|max:200';
        $rules['text_color'] = 'nullable|string|max:20';
        $rules['bg_color'] = 'nullable|string|max:20';
        $rules['duration'] = 'nullable|integer|min:3|max:60';
        $rules['stickers'] = 'nullable|json';
        $rules['drawing_data'] = 'nullable|json';

        $request->validate($rules);

        $data = [
            'user_id' => $request->user()->id,
            'type' => $request->hasFile('video') ? 'video' : ($request->hasFile('image') ? 'image' : 'text'),
            'text_overlay' => $request->input('text_overlay'),
            'text_color' => $request->input('text_color', '#ffffff'),
            'bg_color' => $request->input('bg_color'),
            'duration' => $request->input('duration', 5),
            'stickers' => $request->input('stickers') ? json_decode($request->input('stickers'), true) : null,
            'drawing_data' => $request->input('drawing_data') ? json_decode($request->input('drawing_data'), true) : null,
        ];

        if ($request->hasFile('video')) {
            $filename = uniqid('vid_') . '.mp4';
            $request->file('video')->move(public_path('uploads'), $filename);
            $data['video'] = "/uploads/$filename";
        } elseif ($request->hasFile('image')) {
            $filename = uniqid('img_') . '.jpg';
            $request->file('image')->move(public_path('uploads'), $filename);
            $data['image'] = "/uploads/$filename";
        }

        $story = Story::create($data);
        $story->load('user:id,username,avatar');

        try {
            broadcast(new StoryCreated($story));
        } catch (\Exception $e) {
            \Log::warning('Story broadcast failed: ' . $e->getMessage());
        }

        return response()->json($story, 201);
    }

    public function view($id, Request $request)
    {
        $story = Story::find($id);
        if (!$story) return response()->json(['message' => 'Not found'], 404);
        if ($story->created_at->lt(now()->subHours(12))) {
            return response()->json(['message' => 'Story expired'], 410);
        }

        $view = StoryView::firstOrCreate([
            'story_id' => $id,
            'user_id' => $request->user()->id,
        ]);

        if ($view->wasRecentlyCreated && $story->user_id !== $request->user()->id) {
            Notification::create([
                'type' => 'story_view',
                'message' => $request->user()->username . ' viewed your story',
                'user_id' => $story->user_id,
                'sender_id' => $request->user()->id,
            ]);
        }

        return response()->json(['message' => 'Viewed']);
    }

    public function viewers($id, Request $request)
    {
        $story = Story::find($id);
        if (!$story) return response()->json(['message' => 'Not found'], 404);
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $viewers = StoryView::with('user:id,username,avatar')
            ->where('story_id', $id)
            ->latest()
            ->get()
            ->pluck('user');

        return response()->json($viewers);
    }

    public function react($id, Request $request)
    {
        $request->validate(['emoji' => 'required|string|max:10']);

        $story = Story::find($id);
        if (!$story) return response()->json(['message' => 'Not found'], 404);
        if ($story->created_at->lt(now()->subHours(12))) {
            return response()->json(['message' => 'Story expired'], 410);
        }

        $reaction = StoryReaction::updateOrCreate(
            ['story_id' => $id, 'user_id' => $request->user()->id],
            ['emoji' => $request->input('emoji')]
        );

        if ($story->user_id !== $request->user()->id) {
            Notification::create([
                'type' => 'story_reaction',
                'message' => $request->user()->username . ' reacted ' . $request->input('emoji') . ' to your story',
                'user_id' => $story->user_id,
                'sender_id' => $request->user()->id,
            ]);
        }

        return response()->json(['message' => 'Reaction saved', 'emoji' => $reaction->emoji]);
    }

    public function removeReaction($id, Request $request)
    {
        StoryReaction::where('story_id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Reaction removed']);
    }

    public function reactions($id)
    {
        $story = Story::find($id);
        if (!$story) return response()->json(['message' => 'Not found'], 404);

        $reactions = StoryReaction::with('user:id,username,avatar')
            ->where('story_id', $id)
            ->latest()
            ->get();

        $grouped = $reactions->groupBy('emoji')->map(function ($group) {
            return [
                'emoji' => $group->first()->emoji,
                'count' => $group->count(),
                'users' => $group->pluck('user'),
            ];
        })->values();

        return response()->json($grouped);
    }

    public function analytics($id, Request $request)
    {
        $story = Story::find($id);
        if (!$story) return response()->json(['message' => 'Not found'], 404);
        if ($story->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $viewCount = $story->views()->count();
        $reactionCount = $story->reactions()->count();
        $reactionsByEmoji = $story->reactions()
            ->selectRaw('emoji, COUNT(*) as count')
            ->groupBy('emoji')
            ->get();

        $recentViewers = StoryView::with('user:id,username,avatar')
            ->where('story_id', $id)
            ->latest()
            ->take(10)
            ->get()
            ->pluck('user');

        return response()->json([
            'view_count' => $viewCount,
            'reaction_count' => $reactionCount,
            'reactions' => $reactionsByEmoji,
            'recent_viewers' => $recentViewers,
        ]);
    }

    public function forward($id, Request $request)
    {
        $request->validate(['user_ids' => 'required|array', 'user_ids.*' => 'integer']);

        $story = Story::find($id);
        if (!$story) return response()->json(['message' => 'Not found'], 404);

        $senderId = $request->user()->id;
        $forwarded = 0;

        foreach ($request->input('user_ids') as $userId) {
            if ($userId == $senderId) continue;

            Notification::create([
                'type' => 'story_forward',
                'message' => $request->user()->username . ' shared a story with you',
                'user_id' => $userId,
                'sender_id' => $senderId,
            ]);
            $forwarded++;
        }

        return response()->json(['message' => "Story shared with $forwarded people", 'count' => $forwarded]);
    }

    public function highlights(Request $request)
    {
        $userId = $request->user()->id;

        $highlights = StoryHighlight::with(['stories' => function ($q) {
            $q->select('stories.*')->limit(1);
        }])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($highlights);
    }

    public function userHighlights($userId)
    {
        $highlights = StoryHighlight::with(['stories' => function ($q) {
            $q->select('stories.*')->limit(1);
        }])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($highlights);
    }

    public function storeHighlight(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:50',
            'story_ids' => 'nullable|array',
            'story_ids.*' => 'integer',
            'cover_image' => 'nullable|image|max:2048',
        ]);

        $data = [
            'user_id' => $request->user()->id,
            'title' => $request->input('title'),
        ];

        if ($request->hasFile('cover_image')) {
            $filename = uniqid('cover_') . '.jpg';
            $request->file('cover_image')->move(public_path('uploads'), $filename);
            $data['cover_image'] = "/uploads/$filename";
        }

        $highlight = StoryHighlight::create($data);

        foreach ($request->input('story_ids', []) as $index => $storyId) {
            StoryHighlightItem::create([
                'highlight_id' => $highlight->id,
                'story_id' => $storyId,
                'position' => $index,
            ]);
        }

        $highlight->load('stories');
        return response()->json($highlight, 201);
    }

    public function addToHighlight($highlightId, Request $request)
    {
        $request->validate(['story_id' => 'required|integer']);

        $highlight = StoryHighlight::find($highlightId);
        if (!$highlight) return response()->json(['message' => 'Not found'], 404);
        if ($highlight->user_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);

        $maxPos = StoryHighlightItem::where('highlight_id', $highlightId)->max('position') ?? -1;

        StoryHighlightItem::firstOrCreate(
            ['highlight_id' => $highlightId, 'story_id' => $request->input('story_id')],
            ['position' => $maxPos + 1]
        );

        $highlight->load('stories');
        return response()->json($highlight);
    }

    public function deleteHighlight($id, Request $request)
    {
        $highlight = StoryHighlight::find($id);
        if (!$highlight) return response()->json(['message' => 'Not found'], 404);
        if ($highlight->user_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);

        $highlight->delete();
        return response()->json(['message' => 'Highlight deleted']);
    }

    public function destroy($id, Request $request)
    {
        $story = Story::find($id);
        if (!$story) return response()->json(['message' => 'Not found'], 404);
        if ($story->user_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);
        $story->delete();
        return response()->json(['message' => 'Story deleted']);
    }

    public function updateHighlight($id, Request $request)
    {
        $highlight = StoryHighlight::find($id);
        if (!$highlight) return response()->json(['message' => 'Not found'], 404);
        if ($highlight->user_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);

        $request->validate([
            'title' => 'sometimes|string|max:50',
        ]);

        if ($request->has('title')) {
            $highlight->update(['title' => $request->input('title')]);
        }

        $highlight->load('stories');
        return response()->json($highlight);
    }

    public function removeFromHighlight($highlightId, $storyId, Request $request)
    {
        $highlight = StoryHighlight::find($highlightId);
        if (!$highlight) return response()->json(['message' => 'Not found'], 404);
        if ($highlight->user_id !== $request->user()->id) return response()->json(['message' => 'Unauthorized'], 403);

        StoryHighlightItem::where('highlight_id', $highlightId)
            ->where('story_id', $storyId)
            ->delete();

        $highlight->load('stories');
        return response()->json($highlight);
    }

    public function myStories(Request $request)
    {
        $stories = Story::where('user_id', $request->user()->id)
            ->where('created_at', '>=', now()->subHours(12))
            ->latest()
            ->get();

        return response()->json($stories);
    }
}
