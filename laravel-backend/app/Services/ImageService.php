<?php

namespace App\Services;

class ImageService
{
    public function compress($file, $maxWidth = 1200, $quality = 80)
    {
        $path = $file->getRealPath();
        $info = @getimagesize($path);
        if (!$info) return $path;

        $mime = $info[2];
        $tempPath = tempnam(sys_get_temp_dir(), 'compressed_') . '.jpg';

        switch ($mime) {
            case IMAGETYPE_JPEG:
                $image = imagecreatefromjpeg($path);
                break;
            case IMAGETYPE_PNG:
                $image = imagecreatefrompng($path);
                break;
            case IMAGETYPE_GIF:
                $image = imagecreatefromgif($path);
                break;
            case IMAGETYPE_WEBP:
                $image = imagecreatefromwebp($path);
                break;
            default:
                return $path;
        }

        $origW = imagesx($image);
        $origH = imagesy($image);

        if ($origW > $maxWidth) {
            $newH = (int)($origH * $maxWidth / $origW);
            $resized = imagecreatetruecolor($maxWidth, $newH);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $maxWidth, $newH, $origW, $origH);
            imagedestroy($image);
            $image = $resized;
        }

        imagejpeg($image, $tempPath, $quality);
        imagedestroy($image);

        return $tempPath;
    }

    public function generateThumbnail($file, $width = 400, $height = 400)
    {
        $path = $file->getRealPath();
        $info = @getimagesize($path);
        if (!$info) return $path;

        $mime = $info[2];
        $tempPath = tempnam(sys_get_temp_dir(), 'thumb_') . '.jpg';

        switch ($mime) {
            case IMAGETYPE_JPEG:
                $image = imagecreatefromjpeg($path);
                break;
            case IMAGETYPE_PNG:
                $image = imagecreatefrompng($path);
                break;
            case IMAGETYPE_GIF:
                $image = imagecreatefromgif($path);
                break;
            case IMAGETYPE_WEBP:
                $image = imagecreatefromwebp($path);
                break;
            default:
                return $path;
        }

        $origW = imagesx($image);
        $origH = imagesy($image);

        $ratio = max($width / $origW, $height / $origH);
        $newW = (int)($origW * $ratio);
        $newH = (int)($origH * $ratio);

        $resized = imagecreatetruecolor($newW, $newH);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
        imagedestroy($image);

        $cropX = (int)(($newW - $width) / 2);
        $cropY = (int)(($newH - $height) / 2);

        $thumb = imagecreatetruecolor($width, $height);
        imagecopyresampled($thumb, $resized, 0, 0, $cropX, $cropY, $width, $height, $width, $height);
        imagedestroy($resized);

        imagejpeg($thumb, $tempPath, 75);
        imagedestroy($thumb);

        return $tempPath;
    }
}
