<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('posts')
            ->where('type', 'image')
            ->whereNull('image')
            ->whereNull('video')
            ->update(['type' => 'text']);
    }

    public function down(): void
    {
        DB::table('posts')
            ->where('type', 'text')
            ->whereNull('image')
            ->whereNull('video')
            ->update(['type' => 'image']);
    }
};
