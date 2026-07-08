<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudinaryService
{
    private string $cloudName;
    private string $apiKey;
    private string $apiSecret;
    private string $uploadUrl;

    public function __construct()
    {
        $this->cloudName = config('cloudinary.cloud_name', '');
        $this->apiKey = config('cloudinary.api_key', '');
        $this->apiSecret = config('cloudinary.api_secret', '');
        $this->uploadUrl = "https://api.cloudinary.com/v1_1/{$this->cloudName}/auto/upload";
    }

    public function isConfigured(): bool
    {
        return !empty($this->cloudName) && !empty($this->apiKey) && !empty($this->apiSecret);
    }

    public function upload(UploadedFile $file, array $options = []): ?string
    {
        if (!$this->isConfigured()) {
            return null;
        }

        try {
            $params = array_merge([
                'folder' => $options['folder'] ?? config('app.name', 'app'),
                'resource_type' => 'auto',
            ], $options);

            if (isset($options['public_id'])) {
                $params['public_id'] = $options['public_id'];
            }

            $params['timestamp'] = now()->timestamp;
            $params['api_key'] = $this->apiKey;

            ksort($params);
            $signStr = '';
            foreach ($params as $k => $v) {
                if ($k !== 'file' && $k !== 'api_key' && $v !== null && $v !== '') {
                    $signStr .= "{$k}={$v}&";
                }
            }
            $signStr = rtrim($signStr, '&');
            $params['signature'] = sha1($signStr . $this->apiSecret);

            $response = Http::attach(
                'file',
                file_get_contents($file->getRealPath()),
                $file->getClientOriginalName()
            )->attach('api_key', $this->apiKey)
             ->attach('timestamp', (string) $params['timestamp'])
             ->attach('folder', $params['folder'])
             ->attach('resource_type', $params['resource_type'])
             ->attach('signature', $params['signature']);

            if (isset($params['public_id'])) {
                $response = $response->attach('public_id', $params['public_id']);
            }

            $result = $response->post($this->uploadUrl);

            if ($result->successful()) {
                return $result->json('secure_url');
            }

            Log::error('Cloudinary upload failed', ['response' => $result->json()]);
            return null;
        } catch (\Exception $e) {
            Log::error('Cloudinary upload error', ['message' => $e->getMessage()]);
            return null;
        }
    }

    public function uploadPath(string $filePath, array $options = []): ?string
    {
        if (!$this->isConfigured()) {
            return null;
        }

        try {
            $tempFile = tempnam(sys_get_temp_dir(), 'cloudinary_');
            copy($filePath, $tempFile);

            $file = new UploadedFile($tempFile, basename($filePath), mime_content_type($filePath), null, true);
            $url = $this->upload($file, $options);

            @unlink($tempFile);
            return $url;
        } catch (\Exception $e) {
            Log::error('Cloudinary path upload error', ['message' => $e->getMessage()]);
            return null;
        }
    }
}
