<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->json('stickers')->nullable()->after('duration');
            $table->json('drawing_data')->nullable()->after('stickers');
            $table->boolean('is_highlight')->default(false)->after('drawing_data');
        });
    }

    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropColumn(['stickers', 'drawing_data', 'is_highlight']);
        });
    }
};
