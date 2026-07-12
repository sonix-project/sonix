<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class EnsureFeatureTables extends Command
{
    protected $signature = 'app:ensure-feature-tables';
    protected $description = 'Create missing feature tables (profile_visitors, user_badges, profile_templates) and clean stale migration records';

    public function handle()
    {
        $created = 0;

        // Remove stale migration records for tables that don't actually exist
        $staleMigrations = [
            '2026_07_11_000006_create_profile_visitors_table',
            '2026_07_11_000008_create_user_badges_table',
            '2026_07_11_000011_create_profile_templates_table',
            '2026_07_12_000001_create_missing_feature_tables',
        ];

        foreach ($staleMigrations as $migration) {
            $exists = DB::table('migrations')->where('migration', $migration)->exists();
            if ($exists) {
                DB::table('migrations')->where('migration', $migration)->delete();
                $this->info("Removed stale migration record: {$migration}");
            }
        }

        // Create profile_visitors table
        if (!Schema::hasTable('profile_visitors')) {
            Schema::create('profile_visitors', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('visitor_id')->constrained('users')->onDelete('cascade');
                $table->timestamps();
                $table->index('user_id');
                $table->index('visitor_id');
            });
            $this->info('Created profile_visitors table');
            $created++;
        } else {
            $this->info('profile_visitors table already exists');
        }

        // Create user_badges table
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
            $this->info('Created user_badges table');
            $created++;
        } else {
            $this->info('user_badges table already exists');
        }

        // Create profile_templates table
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
            $this->info('Created profile_templates table');
            $created++;
        } else {
            $this->info('profile_templates table already exists');
        }

        if ($created > 0) {
            $this->info("Successfully created {$created} missing table(s)");
        } else {
            $this->info('All feature tables already exist');
        }

        return 0;
    }
}
