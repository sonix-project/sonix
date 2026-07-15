<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class WatermarkService
{
    protected string $watermarkText;
    protected int $fontSize;
    protected string $fontColor;
    protected int $opacity;

    public function __construct()
    {
        $this->watermarkText = config('media.watermark_text', 'YourApp');
        $this->fontSize = config('media.watermark_font_size', 24);
        $this->fontColor = config('media.watermark_color', '#ffffff');
        $this->opacity = config('media.watermark_opacity', 30); // 0-100
    }

    /**
     * Add watermark to an image.
     */
    public function addWatermark(string $imagePath): ?string
    {
        if (!function_exists('imagecreatefromjpeg') && !function_exists('imagecreatefrompng')) {
            Log::warning('[Watermark] GD library not available');
            return null;
        }

        $info = pathinfo($imagePath);
        $ext = strtolower($info['extension'] ?? '');

        try {
            $image = match($ext) {
                'jpg', 'jpeg' => imagecreatefromjpeg($imagePath),
                'png' => imagecreatefrompng($imagePath),
                default => null,
            };

            if (!$image) return null;

            $width = imagesx($image);
            $height = imagesy($image);

            $fontPath = public_path('fonts/arial.ttf');
            if (!file_exists($fontPath)) {
                $fontPath = null;
            }

            if ($fontPath && function_exists('imagettftext')) {
                $bbox = imagettfbbox($this->fontSize, 0, $fontPath, $this->watermarkText);
                $textWidth = abs($bbox[2] - $bbox[0]);
                $textHeight = abs($bbox[1] - $bbox[5]);

                $x = $width - $textWidth - 20;
                $y = $height - $textHeight - 10;

                $color = $this->hexToRgb($this->fontColor);
                $alpha = (int) round((100 - $this->opacity) / 100 * 127);
                $textColor = imagecolorallocatealpha($image, $color['r'], $color['g'], $color['b'], $alpha);

                imagettftext($image, $this->fontSize, 0, $x, $y, $textColor, $fontPath, $this->watermarkText);
            } else {
                // Fallback: simple rectangle watermark
                $boxWidth = strlen($this->watermarkText) * 12;
                $boxHeight = 30;
                $x = $width - $boxWidth - 10;
                $y = $height - $boxHeight - 10;

                $alpha = (int) round((100 - $this->opacity) / 100 * 127);
                $color = imagecolorallocatealpha($image, 255, 255, 255, $alpha);

                imagefilledrectangle($image, $x, $y, $x + $boxWidth, $y + $boxHeight, $color);
            }

            $outputPath = $info['dirname'] . '/' . $info['filename'] . '_wm.' . $ext;

            $result = match($ext) {
                'jpg', 'jpeg' => imagejpeg($image, $outputPath, 90),
                'png' => imagepng($image, $outputPath, 9),
                default => false,
            };

            imagedestroy($image);

            if ($result) {
                return '/' . ltrim(str_replace(public_path(), '', $outputPath), '/');
            }

            return null;
        } catch (\Exception $e) {
            Log::error('[Watermark] Failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Add watermark to video (requires FFmpeg).
     */
    public function addVideoWatermark(string $videoPath): ?string
    {
        $info = pathinfo($videoPath);
        $outputPath = $info['dirname'] . '/' . $info['filename'] . '_wm.' . ($info['extension'] ?? 'mp4');

        try {
            $text = $this->watermarkText;
            $result = \Illuminate\Support\Facades\Process::run([
                'ffmpeg',
                '-i', $videoPath,
                '-vf', "drawtext=text='{$text}':fontsize={$this->fontSize}:fontcolor=white@0.3:x=w-tw-20:y=h-th-10",
                '-codec:a', 'copy',
                '-y',
                $outputPath,
            ]);

            if ($result->successful()) {
                return '/' . ltrim(str_replace(public_path(), '', $outputPath), '/');
            }

            return null;
        } catch (\Exception $e) {
            Log::error('[Watermark] Video watermark failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    protected function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        return [
            'r' => (int) hexdec(substr($hex, 0, 2)),
            'g' => (int) hexdec(substr($hex, 2, 2)),
            'b' => (int) hexdec(substr($hex, 4, 2)),
        ];
    }
}
