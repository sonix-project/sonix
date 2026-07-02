<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index('is_private');
        });

        Schema::table('follows', function (Blueprint $table) {
            $table->index(['follower_id', 'status']);
            $table->index(['following_id', 'status']);
        });

        Schema::table('likes', function (Blueprint $table) {
            $table->index('post_id');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->index(['sender_id', 'receiver_id']);
            $table->index(['receiver_id', 'sender_id']);
            $table->index(['receiver_id', 'is_read']);
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->index(['post_id', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_private']);
        });

        Schema::table('follows', function (Blueprint $table) {
            $table->dropIndex(['follower_id', 'status']);
            $table->dropIndex(['following_id', 'status']);
        });

        Schema::table('likes', function (Blueprint $table) {
            $table->dropIndex(['post_id']);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['sender_id', 'receiver_id']);
            $table->dropIndex(['receiver_id', 'sender_id']);
            $table->dropIndex(['receiver_id', 'is_read']);
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->dropIndex(['post_id', 'parent_id']);
        });
    }
};
