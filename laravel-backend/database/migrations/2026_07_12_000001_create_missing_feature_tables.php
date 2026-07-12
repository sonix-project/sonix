<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('profile_visitors')) {
            Schema::create('profile_visitors', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('visitor_id')->constrained('users')->onDelete('cascade');
                $table->timestamps();
                $table->index('user_id');
                $table->index('visitor_id');
            });
        }

        if (!Schema::hasTable('user_badges')) {
            Schema::create('user_badges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('badge_type');
                $table->string('badge_name');
                $table->text('description')->nullable();
                $table->string('icon_url')->nullable();
                $table->timestamps();
                $table->index('user_id');
            });
        }

        if (!Schema::hasTable('profile_templates')) {
            Schema::create('profile_templates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('template_name');
                $table->json('template_data')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->index('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_templates');
        Schema::dropIfExists('user_badges');
        Schema::dropIfExists('profile_visitors');
    }
};
