#!/bin/sh

# Generate .env from Railway environment variables
cat > /app/laravel-backend/.env <<EOF
APP_NAME=${APP_NAME:-Sonix}
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY:-}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=${APP_URL:-https://sonix-production.up.railway.app}

APP_LOCALE=en
APP_FALLBACK_LOCALE=en

DB_CONNECTION=${DB_CONNECTION:-pgsql}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-5432}
DB_DATABASE=${DB_DATABASE:-sonix}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=reverb
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=redis

REDIS_CLIENT=phpredis
REDIS_HOST=${REDIS_HOST:-127.0.0.1}
REDIS_PASSWORD=${REDIS_PASSWORD:-null}
REDIS_PORT=${REDIS_PORT:-6379}

REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_HOST=${REVERB_HOST:-192.168.1.10}
REVERB_PORT=${REVERB_PORT:-443}
REVERB_SCHEME=${REVERB_SCHEME:-http}
REVERB_APP_KEY=${REVERB_APP_KEY:-sonix-reverb-key}
REVERB_APP_SECRET=${REVERB_APP_SECRET:-sonix-reverb-secret}
REVERB_APP_ID=${REVERB_APP_ID:-12345}
REVERB_APP_PING_INTERVAL=60

MAIL_MAILER=log

MEDIA_SIGNED_URL_TTL=3600
MEDIA_MAX_UPLOAD_SIZE=50
MEDIA_IMAGE_QUALITY=85
MEDIA_WATERMARK_ENABLED=false
MEDIA_WATERMARK_TEXT=Sonix
MEDIA_TRANSCODING_ENABLED=false
ANTI_SCRAPING_ENABLED=true
MEDIA_CDN_ENABLED=false
MEDIA_CDN_URL=

CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME:-}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY:-}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET:-}
EOF

# Generate app key if not set
if echo "$APP_KEY" | grep -q "base64:"; then
    echo "APP_KEY already set"
else
    php artisan key:generate --force
fi

# Run migrations
php artisan migrate --force

# Seed database (safe - checks if already seeded)
php artisan db:seed --force

# Start supervisor
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
