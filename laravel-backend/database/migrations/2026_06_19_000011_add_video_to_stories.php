<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->string('type', 10)->default('image')->after('user_id');
            $table->string('video')->nullable()->after('image');
            $table->text('text_overlay')->nullable()->after('video');
            $table->string('text_color', 20)->default('#ffffff')->after('text_overlay');
            $table->string('bg_color', 20)->nullable()->after('text_color');
            $table->integer('duration')->default(5)->after('bg_color');
        });
    }

    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn(['type', 'video', 'text_overlay', 'text_color', 'bg_color', 'duration']);
        });
    }
};
