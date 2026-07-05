<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\Sanitize;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\StoryReaction;
use App\Models\StoryHighlight;
use App\Models\StoryHighlightItem;
use App\Models\Follow;
use App\Models\User;
use App\Models\Notification;
use App\Events\StoryCreated;
use App\Services\ImageService;
use App\Services\StoryCacheService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StoryController extends Controller
{
    protected StoryCacheService $cache;

    public function __construct(StoryCacheService $cache)
    {
        $this->cache = $cache;
    }

    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $followingIds = Follow::where('follower_id', $userId)
            ->where('status', 'accepted')
            ->pluck('following_id')
            ->toArray();

        $followingIds[] = $userId;

        $storyIds = Story::whereIn('user_id', $followingIds)
            ->where('created_at', '>=', now()->subHours(12))
            ->pluck('id');

        if ($storyIds->isEmpty()) {
            $this->cache->setFeed($userId, []);
            return response()->json([]);
        }

        $viewCounts = StoryView::whereIn('story_id', $storyIds)
            ->selectRaw('story_id, COUNT(*) as cnt')
            ->groupBy('story_id')
            ->pluck('cnt', 'story_id');

        $reactionCounts = StoryReaction::whereIn('story_id', $storyIds)
            ->selectRaw('story_id, COUNT(*) as cnt')
            ->groupBy('story_id')
            ->pluck('cnt', 'story_id');

        $myReactions = StoryReaction::whereIn('story_id', $storyIds)
            ->where('user_id', $userId)
            ->pluck('emoji', 'story_id');

        $seenStoryIds = StoryView::whereIn('story_id', $storyIds)
            ->where('user_id', $userId)
            ->pluck('story_id')
            ->toArray();

        $stories = Story::with(['user:id,username,avatar'])
            ->whereIn('id', $storyIds)
            ->latest()
            ->get()
            ->groupBy('user_id');

        $result = [];
        foreach ($stories as $uid => $userStories) {
            $first = $userStories->first();
            $hasUnseen = $userStories->contains(fn($s) => !in_array($s->id, $seenStoryIds));

            $storiesData = $userStories->map(function ($story) use ($viewCounts, $reactionCounts, $myReactions) {
                $story->view_count = $viewCounts->get($story->id, 0);
                $story->reaction_count = $reactionCounts->get($story->id, 0);
                $story->my_reaction = $myReactions->get($story->id);
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

    public function debug(Request $request)
    {
        $userId = $request->user()->id;

        // Raw count - bypasses model
        $rawCount = DB::select("SELECT COUNT(*) as cnt FROM stories WHERE user_id = ?", [$userId]);
        
        // Table structure
        $hasTable = Schema::hasTable('stories');
        $columns = $hasTable ? Schema::getColumns('stories') : [];
        $columnNames = array_column($columns, 'name');

        // Try raw insert test
        $testInsert = null;
        try {
            DB::table('stories')->insert([
                'user_id' => $userId,
                'type' => 'text',
                'text_overlay' => 'debug_test_' . time(),
                'text_color' => '#ffffff',
                'duration' => 5,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $testInsert = 'success';
            // Clean up test row
            DB::table('stories')->where('text_overlay', 'LIKE', 'debug_test_%')->where('user_id', $userId)->delete();
        } catch (\Throwable $e) {
            $testInsert = $e->getMessage();
        }

        $followingIds = Follow::where('follower_id', $userId)
            ->where('status', 'accepted')
            ->pluck('following_id')
            ->toArray();
        $followingIds[] = $userId;

        $myStories = Story::where('user_id', $userId)->latest()->limit(5)->get();

        return response()->json([
            'user_id' => $userId,
            'raw_count' => $rawCount[0]->cnt ?? 'error',
            'table_exists' => $hasTable,
            'columns' => $columnNames,
            'test_insert' => $testInsert,
            'my_stories' => $myStories,
            'now' => now()->toIso8601String(),
        ]);
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
        $rules['text_color'] = 'nullable|string|max:20|regex:/^#[0-9A-Fa-f]{6,8}$/';
        $rules['bg_color'] = 'nullable|string|max:20|regex:/^#[0-9A-Fa-f]{6,8}$/';
        $rules['duration'] = 'nullable|integer|min:3|max:60';
        $rules['stickers'] = 'nullable|json';
        $rules['drawing_data'] = 'nullable|json';

        $request->validate($rules);

        $data = [
            'user_id' => $request->user()->id,
            'type' => $request->hasFile('video') ? 'video' : ($request->hasFile('image') ? 'image' : 'text'),
            'text_overlay' => Sanitize::text($request->input('text_overlay')),
            'text_color' => $request->input('text_color', '#ffffff'),
            'bg_color' => $request->input('bg_color'),
            'duration' => $request->input('duration', 5),
            'stickers' => $request->input('stickers') ? json_decode($request->input('stickers'), true) : null,
            'drawing_data' => $request->input('drawing_data') ? json_decode($request->input('drawing_data'), true) : null,
        ];

        if ($request->hasFile('video')) {
            $ext = $request->file('video')->getClientOriginalExtension() ?: 'mp4';
            $filename = uniqid('vid_') . '.' . $ext;
            $request->file('video')->move(public_path('uploads'), $filename);
            $data['video'] = "/uploads/$filename";
        } elseif ($request->hasFile('image')) {
            $filename = uniqid('img_') . '.jpg';
            $request->file('image')->move(public_path('uploads'), $filename);
            $data['image'] = "/uploads/$filename";
        }

        $insertData = [
            'user_id' => $data['user_id'],
            'type' => $data['type'],
            'image' => $data['image'] ?? null,
            'video' => $data['video'] ?? null,
            'text_overlay' => $data['text_overlay'] ?? null,
            'text_color' => $data['text_color'] ?? '#ffffff',
            'bg_color' => $data['bg_color'] ?? null,
            'duration' => $data['duration'] ?? 5,
            'stickers' => isset($data['stickers']) ? json_encode($data['stickers']) : null,
            'drawing_data' => isset($data['drawing_data']) ? json_encode($data['drawing_data']) : null,
            'is_highlight' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('stories')->insert($insertData);
        $storyId = DB::getPdo()->lastInsertId();
        $story = Story::with('user:id,username,avatar')->findOrFail($storyId);

        // Queue fan-out instead of blocking the request
        $this->cache->queueFanOut($story->id, $request->user()->id);

        // Also invalidate immediately for the creator
        $this->cache->invalidateUser($request->user()->id);

        // Dispatch video transcoding if needed
        if ($story->type === 'video' && $story->video && config('media.transcoding_enabled')) {
            $inputPath = public_path(ltrim($story->video, '/'));
            \App\Jobs\TranscodeVideo::dispatch($inputPath, $story->id, 'story');
        }

        // Apply watermark if enabled
        if (config('media.watermark_enabled') && $story->image) {
            $watermarkService = new \App\Services\WatermarkService();
            $watermarkedPath = $watermarkService->addWatermark(public_path(ltrim($story->image, '/')));
            if ($watermarkedPath) {
                $story->update(['image' => $watermarkedPath]);
            }
        }

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

        try {
            $view = StoryView::firstOrCreate([
                'story_id' => $id,
                'user_id' => $request->user()->id,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->errorInfo[1] == 23505) {
                return response()->json(['message' => 'Already viewed']);
            }
            throw $e;
        }

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

        try {
            $reaction = StoryReaction::updateOrCreate(
                ['story_id' => $id, 'user_id' => $request->user()->id],
                ['emoji' => $request->input('emoji')]
            );
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->errorInfo[1] == 23505) {
                return response()->json(['message' => 'Reaction already exists', 'emoji' => $request->input('emoji')]);
            }
            throw $e;
        }

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
        if ($story->created_at->lt(now()->subHours(12))) {
            return response()->json(['message' => 'Story expired'], 410);
        }

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
        $validUserIds = User::whereIn('id', $request->input('user_ids'))
            ->where('id', '!=', $senderId)
            ->pluck('id')
            ->toArray();

        $forwarded = 0;
        foreach ($validUserIds as $userId) {
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
            'title' => Sanitize::text($request->input('title')),
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

        $storyOwnerId = $story->user_id;
        $cdnUrls = [];
        if ($story->image) $cdnUrls[] = config('app.url') . $story->image;
        if ($story->video) $cdnUrls[] = config('app.url') . $story->video;

        $story->delete();

        $this->cache->onStoryDeleted($storyOwnerId);

        if (!empty($cdnUrls)) {
            $cdn = new \App\Services\CdnService();
            $cdn->purgeFiles($cdnUrls);
        }

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
            $highlight->update(['title' => Sanitize::text($request->input('title'))]);
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
