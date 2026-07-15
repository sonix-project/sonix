<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class AntiScraping
{
    /**
     * Known bot/scraping user agents
     */
    protected array $blockedPatterns = [
        '/bot/i', '/crawler/i', '/spider/i', '/scraper/i',
        '/curl/i', '/wget/i', '/python-requests/i', '/httpclient/i',
        '/headlesschrome/i', '/phantomjs/i', '/selenium/i',
    ];

    /**
     * Rate limiting thresholds (requests per minute)
     */
    protected array $rateLimits = [
        'stories' => 60,     // 60 requests/min for stories
        'posts' => 120,      // 120 requests/min for posts
        'media' => 30,       // 30 requests/min for media
        'auth' => 10,        // 10 requests/min for auth
        'default' => 200,    // 200 requests/min for everything else
    ];

    public function handle(Request $request, Closure $next)
    {
        $path = $request->path();
        $userAgent = $request->userAgent() ?? '';
        $ip = $request->ip();

        // 1. Block known bots/scrapers
        foreach ($this->blockedPatterns as $pattern) {
            if (preg_match($pattern, $userAgent)) {
                Log::warning('[AntiScraping] Blocked bot', [
                    'ua' => $userAgent,
                    'ip' => $ip,
                    'path' => $path,
                ]);
                return response()->json(['message' => 'Access denied'], 403);
            }
        }

        // 2. Rate limiting per IP + path category
        $category = $this->getRateLimitCategory($path);
        $limit = $this->rateLimits[$category] ?? $this->rateLimits['default'];
        $key = "ratelimit:{$category}:{$ip}";

        try {
            $current = Redis::incr($key);
            if ($current === 1) {
                Redis::expire($key, 60);
            }

            if ($current > $limit) {
                Log::warning('[AntiScraping] Rate limit exceeded', [
                    'ip' => $ip,
                    'category' => $category,
                    'count' => $current,
                    'limit' => $limit,
                ]);

                return response()->json([
                    'message' => 'Rate limit exceeded',
                    'retry_after' => 60,
                ], 429, [
                    'X-RateLimit-Limit' => $limit,
                    'X-RateLimit-Remaining' => 0,
                    'X-RateLimit-Reset' => time() + 60,
                ]);
            }
        } catch (\Throwable $e) {
        }

        // 3. Suspicious pattern detection
        if ($this->isSuspicious($request)) {
            Log::warning('[AntiScraping] Suspicious request', [
                'ip' => $ip,
                'path' => $path,
                'ua' => $userAgent,
                'method' => $request->method(),
            ]);

            usleep(500000);
        }

        $response = $next($request);

        // 4. Add security headers
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // 5. Add rate limit headers
        $response->headers->set('X-RateLimit-Limit', $limit);
        $response->headers->set('X-RateLimit-Remaining', max(0, $limit - ($current ?? 0)));

        return $response;
    }

    protected function getRateLimitCategory(string $path): string
    {
        if (str_contains($path, 'stories')) return 'stories';
        if (str_contains($path, 'posts')) return 'posts';
        if (str_contains($path, 'uploads') || str_contains($path, 'media')) return 'media';
        if (str_contains($path, 'auth')) return 'auth';
        return 'default';
    }

    protected function isSuspicious(Request $request): bool
    {
        // No user agent
        if (empty($request->userAgent())) return true;

        // Missing Referer on POST requests
        if ($request->isMethod('POST') && !$request->headers->has('Referer')) return true;

        // Unusually fast sequential requests from same IP
        $ip = $request->ip();
        $key = "suspicious:{$ip}";

        try {
            $count = Redis::incr($key);
            if ($count === 1) {
                Redis::expire($key, 10); // 10 second window
            }
            if ($count > 20) return true; // More than 20 requests in 10 seconds
        } catch (\Throwable $e) {
        }

        return false;
    }
}
