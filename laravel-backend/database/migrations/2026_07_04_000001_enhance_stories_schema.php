<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            if (!Schema::hasColumn('stories', 'is_highlight')) {
                $table->boolean('is_highlight')->default(false)->after('drawing_data');
            }
        });

        $this->safeIndex('stories', 'idx_stories_user_created', ['user_id', 'created_at']);
        $this->safeIndex('stories', 'idx_stories_created_user', ['created_at', 'user_id']);
        $this->safeIndex('stories', 'idx_stories_highlight', ['is_highlight']);
        $this->safeIndex('story_views', 'idx_story_views_created', ['created_at']);
        $this->safeIndex('story_reactions', 'idx_story_reactions_created', ['created_at']);
        $this->safeIndex('follows', 'idx_follows_fanout', ['following_id', 'status', 'follower_id']);
        $this->safeIndex('posts', 'idx_posts_feed', ['created_at', 'user_id']);
        $this->safeIndex('messages', 'idx_messages_created', ['created_at']);
        $this->safeIndex('notifications', 'idx_notifications_user_created', ['user_id', 'created_at']);
    }

    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_stories_user_created');
            $table->dropIndexIfExists('idx_stories_created_user');
            $table->dropIndexIfExists('idx_stories_highlight');
            $table->dropColumnIfExists('is_highlight');
        });

        Schema::table('story_views', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_story_views_created');
        });

        Schema::table('story_reactions', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_story_reactions_created');
        });

        Schema::table('follows', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_follows_fanout');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_posts_feed');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_messages_created');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_notifications_user_created');
        });
    }

    protected function safeIndex(string $table, string $index, array $columns): void
    {
        try {
            Schema::table($table, function (Blueprint $table) use ($index, $columns) {
                $table->index($columns, $index);
            });
        } catch (\Throwable $e) {
            // Index already exists or table missing, skip
        }
    }
};
