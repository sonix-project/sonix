<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
use App\Services\CloudinaryService;

class StorageHelper
{
    public static function upload(UploadedFile $file, string $subfolder = 'uploads'): string
    {
        $cloudinary = app(CloudinaryService::class);

        if ($cloudinary->isConfigured()) {
            $url = $cloudinary->upload($file, ['folder' => $subfolder]);
            if ($url) {
                return $url;
            }
        }

        return self::uploadLocal($file, $subfolder);
    }

    public static function uploadLocal(UploadedFile $file, string $subfolder = 'uploads'): string
    {
        $ext = strtolower(pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION)) ?: 'jpg';
        $filename = 'file_' . time() . '_' . mt_rand(1000, 9999) . '.' . $ext;
        $file->move(public_path($subfolder), $filename);
        return $subfolder . '/' . $filename;
    }

    public static function getUrl(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $cleanPath = ltrim($path, '/');

        if (str_starts_with($cleanPath, 'storage/uploads/')) {
            $cleanPath = substr($cleanPath, strlen('storage/'));
        }

        if (str_starts_with($cleanPath, 'uploads/')) {
            return url('api/media/' . $cleanPath);
        }

        return url('api/media/uploads/' . $cleanPath);
    }
}
