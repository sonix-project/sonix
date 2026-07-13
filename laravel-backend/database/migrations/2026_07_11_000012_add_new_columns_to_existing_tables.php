<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('two_factor_enabled')->default(false);
            $table->string('two_factor_secret')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->string('website')->nullable();
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->text('location')->nullable();
            $table->json('mentions')->nullable();
            $table->integer('views_count')->default(0);
            $table->boolean('is_pinned')->default(false);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->boolean('is_disappearing')->default(false);
            $table->timestamp('disappears_at')->nullable();
            $table->boolean('is_edited')->default(false);
            $table->text('original_content')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_enabled', 'two_factor_secret', 'is_verified', 'website']);
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['location', 'mentions', 'views_count', 'is_pinned']);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['is_disappearing', 'disappears_at', 'is_edited', 'original_content']);
        });
    }
};
