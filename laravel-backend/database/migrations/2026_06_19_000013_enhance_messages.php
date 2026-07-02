<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('type', 10)->default('text')->after('content');
            $table->string('image')->nullable()->after('type');
            $table->string('voice')->nullable()->after('image');
            $table->foreignId('reply_to')->nullable()->after('voice')->constrained('messages')->nullOnDelete();
            $table->boolean('is_deleted')->default(false)->after('reply_to');
            $table->timestamp('read_at')->nullable()->after('is_read');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['type', 'image', 'voice', 'reply_to', 'is_deleted', 'read_at']);
        });
    }
};
