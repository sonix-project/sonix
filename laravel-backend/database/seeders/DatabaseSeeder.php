<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Post;
use App\Models\Story;
use App\Models\Comment;
use App\Models\Like;
use App\Models\Follow;
use App\Models\Bookmark;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (User::count() > 1) {
            echo "⏭️ Already seeded, skipping\n";
            return;
        }

        // ── Users ──
        $users = [
            ['username' => 'admin', 'email' => 'admin@yourapp.com', 'bio' => 'Welcome to the app! 🎵', 'password' => Hash::make('password123')],
            ['username' => 'sara', 'email' => 'sara@test.com', 'bio' => 'Photography lover 📸', 'password' => Hash::make('password123')],
            ['username' => 'omar', 'email' => 'omar@test.com', 'bio' => 'Developer 💻', 'password' => Hash::make('password123')],
            ['username' => 'nora', 'email' => 'nora@test.com', 'bio' => 'Travel ✈️ & Food 🍕', 'password' => Hash::make('password123')],
            ['username' => 'alex', 'email' => 'alex@test.com', 'bio' => 'Designer 🎨', 'password' => Hash::make('password123')],
            ['username' => 'lily', 'email' => 'lily@test.com', 'bio' => 'Music is life 🎶', 'password' => Hash::make('password123')],
        ];

        $createdUsers = [];
        foreach ($users as $u) {
            $createdUsers[] = User::create($u);
        }

        // ── Follows ──
        Follow::create(['follower_id' => $createdUsers[1]->id, 'following_id' => $createdUsers[0]->id, 'status' => 'accepted']);
        Follow::create(['follower_id' => $createdUsers[2]->id, 'following_id' => $createdUsers[0]->id, 'status' => 'accepted']);
        Follow::create(['follower_id' => $createdUsers[3]->id, 'following_id' => $createdUsers[0]->id, 'status' => 'accepted']);
        Follow::create(['follower_id' => $createdUsers[0]->id, 'following_id' => $createdUsers[1]->id, 'status' => 'accepted']);
        Follow::create(['follower_id' => $createdUsers[0]->id, 'following_id' => $createdUsers[2]->id, 'status' => 'accepted']);
        Follow::create(['follower_id' => $createdUsers[1]->id, 'following_id' => $createdUsers[2]->id, 'status' => 'accepted']);
        Follow::create(['follower_id' => $createdUsers[2]->id, 'following_id' => $createdUsers[3]->id, 'status' => 'pending']);

        // ── Posts ──
        $posts = [
            ['user_id' => $createdUsers[0]->id, 'type' => 'text', 'content' => 'Welcome to the app! 🎉 This is our first post. Excited to have you all here!'],
            ['user_id' => $createdUsers[1]->id, 'type' => 'text', 'content' => 'Beautiful sunset today 🌅 #nature #photography'],
            ['user_id' => $createdUsers[2]->id, 'type' => 'text', 'content' => 'Just shipped a new feature 💻 #coding #developer'],
            ['user_id' => $createdUsers[3]->id, 'type' => 'text', 'content' => 'Best pasta in town! 🍝 #foodie #italian'],
            ['user_id' => $createdUsers[4]->id, 'type' => 'text', 'content' => 'New design system is ready 🎨 #design #ui'],
            ['user_id' => $createdUsers[5]->id, 'type' => 'text', 'content' => 'New album out now! 🎶 #music #newrelease'],
            ['user_id' => $createdUsers[1]->id, 'type' => 'text', 'content' => 'Coffee and code ☕ #morning'],
            ['user_id' => $createdUsers[2]->id, 'type' => 'text', 'content' => 'Weekend vibes ✨ #weekend'],
            ['user_id' => $createdUsers[0]->id, 'type' => 'text', 'content' => 'Thanks for 1000 followers! 🙏 #milestone'],
            ['user_id' => $createdUsers[3]->id, 'type' => 'text', 'content' => 'Travel day! ✈️ #adventure'],
        ];

        $createdPosts = [];
        foreach ($posts as $p) {
            $createdPosts[] = Post::create($p);
        }

        // ── Likes ──
        Like::create(['user_id' => $createdUsers[1]->id, 'post_id' => $createdPosts[0]->id]);
        Like::create(['user_id' => $createdUsers[2]->id, 'post_id' => $createdPosts[0]->id]);
        Like::create(['user_id' => $createdUsers[3]->id, 'post_id' => $createdPosts[0]->id]);
        Like::create(['user_id' => $createdUsers[0]->id, 'post_id' => $createdPosts[1]->id]);
        Like::create(['user_id' => $createdUsers[2]->id, 'post_id' => $createdPosts[1]->id]);
        Like::create(['user_id' => $createdUsers[0]->id, 'post_id' => $createdPosts[2]->id]);
        Like::create(['user_id' => $createdUsers[4]->id, 'post_id' => $createdPosts[2]->id]);
        Like::create(['user_id' => $createdUsers[5]->id, 'post_id' => $createdPosts[3]->id]);
        Like::create(['user_id' => $createdUsers[0]->id, 'post_id' => $createdPosts[4]->id]);
        Like::create(['user_id' => $createdUsers[1]->id, 'post_id' => $createdPosts[5]->id]);

        // ── Comments ──
        Comment::create(['user_id' => $createdUsers[1]->id, 'post_id' => $createdPosts[0]->id, 'content' => 'Welcome! 🎉']);
        Comment::create(['user_id' => $createdUsers[2]->id, 'post_id' => $createdPosts[0]->id, 'content' => 'Great to be here!']);
        Comment::create(['user_id' => $createdUsers[0]->id, 'post_id' => $createdPosts[1]->id, 'content' => 'Stunning shot! 📸']);
        Comment::create(['user_id' => $createdUsers[3]->id, 'post_id' => $createdPosts[2]->id, 'content' => 'What stack are you using?']);
        Comment::create(['user_id' => $createdUsers[0]->id, 'post_id' => $createdPosts[3]->id, 'content' => 'Looks delicious! Where is this?']);

        // ── Stories (text only, for demo) ──
        Story::create(['user_id' => $createdUsers[1]->id, 'type' => 'text', 'text_overlay' => 'Good morning! ☀️', 'bg_color' => '#6C5CE7', 'duration' => 5]);
        Story::create(['user_id' => $createdUsers[2]->id, 'type' => 'text', 'text_overlay' => 'Coding session 💻', 'bg_color' => '#E17055', 'duration' => 5]);
        Story::create(['user_id' => $createdUsers[0]->id, 'type' => 'text', 'text_overlay' => 'The app is live! 🎉', 'bg_color' => '#00CEC9', 'duration' => 5]);

        // ── Bookmarks ──
        Bookmark::create(['user_id' => $createdUsers[0]->id, 'post_id' => $createdPosts[1]->id]);
        Bookmark::create(['user_id' => $createdUsers[0]->id, 'post_id' => $createdPosts[4]->id]);

        echo "✅ Seeded: 6 users, 10 posts, 10 likes, 5 comments, 3 stories, 2 bookmarks\n";
    }
}
