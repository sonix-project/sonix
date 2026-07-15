<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\MediaSecurityService;

class MediaSecurity
{
    public function handle(Request $request, Closure $next)
    {
        $path = $request->route('path');

        if (!$path) {
            return $next($request);
        }

        $service = new MediaSecurityService();

        if (!$service->requiresSigning($path)) {
            return $this->serveFile($request, $path);
        }

        // Verify signed URL
        $signature = $request->query('sig');
        $expires = $request->query('exp');

        if (!$signature || !$expires) {
            return response()->json(['message' => 'Missing signature'], 403);
        }

        if (!$service->verifySignedUrl($path, $signature, $expires)) {
            return response()->json(['message' => 'Invalid or expired signature'], 403);
        }

        return $this->serveFile($request, $path);
    }

    protected function serveFile(Request $request, string $path)
    {
        $fullPath = public_path('uploads/' . $path);

        if (!file_exists($fullPath) || !is_file($fullPath)) {
            abort(404);
        }

        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
        $mimeMap = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'gif' => 'image/gif', 'webp' => 'image/webp',
            'mp4' => 'video/mp4', 'mov' => 'video/quicktime', 'avi' => 'video/x-msvideo',
            'webm' => 'video/webm',
        ];

        $mime = $mimeMap[$ext] ?? mime_content_type($fullPath) ?? 'application/octet-stream';

        $response = response()->file($fullPath, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
            'Accept-Ranges' => 'bytes',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
        ]);

        return $response;
    }
}
