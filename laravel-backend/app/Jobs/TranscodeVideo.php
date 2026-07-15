<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use App\Models\Story;
use App\Models\Post;

class TranscodeVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300;
    public int $backoff = 30;

    protected string $inputPath;
    protected string $outputDir;
    protected int $modelId;
    protected string $modelType; // 'story' or 'post'

    public function __construct(string $inputPath, int $modelId, string $modelType = 'story')
    {
        $this->inputPath = $inputPath;
        $this->modelId = $modelId;
        $this->modelType = $modelType;
        $this->outputDir = public_path('uploads/transcoded');
    }

    public function handle(): void
    {
        if (!file_exists($this->inputPath)) {
            Log::warning('[Transcode] Input file not found', ['path' => $this->inputPath]);
            return;
        }

        if (!is_dir($this->outputDir)) {
            mkdir($this->outputDir, 0755, true);
        }

        $basename = pathinfo($this->inputPath, PATHINFO_FILENAME);
        $outputPath = $this->outputDir . '/' . $basename . '_transcoded.mp4';

        try {
            // Transcode to H.264 with adaptive bitrate
            $result = Process::run([
                'ffmpeg',
                '-i', $this->inputPath,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                '-y',
                $outputPath,
            ]);

            if ($result->failed()) {
                Log::error('[Transcode] FFmpeg failed', [
                    'error' => $result->errorOutput(),
                    'input' => $this->inputPath,
                ]);
                $this->release(60); // Retry after 60 seconds
                return;
            }

            $thumbPath = $this->outputDir . '/' . $basename . '_thumb.jpg';
            Process::run([
                'ffmpeg',
                '-i', $this->inputPath,
                '-ss', '00:00:01',
                '-vframes', '1',
                '-q:v', '2',
                '-y',
                $thumbPath,
            ]);

            $qualities = [
                '480p' => ['640', '-2'],
                '720p' => ['1280', '-2'],
            ];

            foreach ($qualities as $label => $dimensions) {
                $variantPath = $this->outputDir . '/' . $basename . '_' . $label . '.mp4';
                Process::run([
                    'ffmpeg',
                    '-i', $this->inputPath,
                    '-vf', "scale={$dimensions[0]}:{$dimensions[1]}",
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '28',
                    '-c:a', 'aac',
                    '-b:a', '96k',
                    '-movflags', '+faststart',
                    '-y',
                    $variantPath,
                ]);
            }

            $relativePath = '/uploads/transcoded/' . $basename . '_transcoded.mp4';
            $thumbRelative = '/uploads/transcoded/' . $basename . '_thumb.jpg';

            $this->updateModel($relativePath, $thumbRelative);

            Log::info('[Transcode] Success', [
                'input' => $this->inputPath,
                'output' => $outputPath,
                'model' => $this->modelType . ':' . $this->modelId,
            ]);

        } catch (\Exception $e) {
            Log::error('[Transcode] Exception', ['error' => $e->getMessage()]);
            $this->release(120);
        }
    }

    protected function updateModel(string $videoPath, string $thumbPath): void
    {
        if ($this->modelType === 'story') {
            $story = Story::find($this->modelId);
            if ($story) {
                $story->update([
                    'video' => $videoPath,
                    'thumbnail' => $thumbPath,
                ]);
            }
        } elseif ($this->modelType === 'post') {
            $post = Post::find($this->modelId);
            if ($post) {
                $post->update([
                    'video' => $videoPath,
                    'thumbnail' => $thumbPath,
                ]);
            }
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[Transcode] Permanently failed', [
            'model' => $this->modelType . ':' . $this->modelId,
            'error' => $exception->getMessage(),
        ]);
    }
}
