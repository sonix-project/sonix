<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        try {
            Broadcast::routes(['middleware' => ['auth:sanctum']]);
            require base_path('routes/channels.php');
        } catch (\Throwable $e) {
            \Log::warning('BroadcastServiceProvider boot skipped: ' . $e->getMessage());
        }
    }
}
