#!/bin/sh

PORT=${PORT:-80}

cat > /etc/nginx/sites-available/default <<NGINX
server {
    listen ${PORT};
    server_name _;
    root /app/laravel-backend/public;
    index index.php index.html;
    client_max_body_size 50M;
    client_body_temp_path /tmp/nginx-upload;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_connect_timeout 300;
        fastcgi_buffering off;
    }

    location ~ /\.ht { deny all; }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

cat > /app/laravel-backend/.env <<EOF
APP_NAME=Sonix
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY:-}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=https://sonix-api.runsite.app

APP_LOCALE=en
APP_FALLBACK_LOCALE=en

DB_CONNECTION=pgsql
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-5432}
DB_DATABASE=${DB_DATABASE:-sonix_api}
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

CACHE_STORE=file

REDIS_CLIENT=phpredis
REDIS_HOST=${REDIS_HOST:-127.0.0.1}
REDIS_PASSWORD=${REDIS_PASSWORD:-null}
REDIS_PORT=${REDIS_PORT:-6379}

REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_HOST=${REVERB_HOST:-sonix-api.runsite.app}
REVERB_PORT=${REVERB_PORT:-443}
REVERB_SCHEME=${REVERB_SCHEME:-https}
REVERB_APP_KEY=${REVERB_APP_KEY:-}
REVERB_APP_SECRET=${REVERB_APP_SECRET:-}
REVERB_APP_ID=${REVERB_APP_ID:-}
REVERB_APP_PING_INTERVAL=60

MAIL_MAILER=${MAIL_MAILER:-log}
MAIL_HOST=${MAIL_HOST:-}
MAIL_PORT=${MAIL_PORT:-587}
MAIL_USERNAME=${MAIL_USERNAME:-}
MAIL_PASSWORD=${MAIL_PASSWORD:-}
MAIL_ENCRYPTION=${MAIL_ENCRYPTION:-tls}
MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS:-noreply@sonix.app}

MEDIA_SIGNED_URL_TTL=3600
MEDIA_MAX_UPLOAD_SIZE=50
MEDIA_IMAGE_QUALITY=85
MEDIA_WATERMARK_ENABLED=false
MEDIA_WATERMARK_TEXT=Sonix
MEDIA_TRANSCODING_ENABLED=false
ANTI_SCRAPING_ENABLED=true
MEDIA_CDN_ENABLED=false
MEDIA_CDN_URL=

CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME:-y6v50hse}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY:-283561754558195}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET:-xMNAWWx7L1G68BjnErkCJwFCUM4}
LOG_CHANNEL=stderr
LOG_LEVEL=error
EOF

echo "Nginx listening on port ${PORT}"
echo "Generated .env file"

chmod -R 777 /app/laravel-backend/storage 2>/dev/null
chmod -R 777 /app/laravel-backend/bootstrap/cache 2>/dev/null
mkdir -p /app/laravel-backend/public/uploads
chmod -R 777 /app/laravel-backend/public/uploads 2>/dev/null

if echo "$APP_KEY" | grep -q "base64:"; then
    echo "APP_KEY already set"
else
    php artisan key:generate --force
fi

php artisan app:ensure-feature-tables 2>&1 | head -20 || echo "WARNING: Feature table check failed, continuing..."
php artisan migrate --force || echo "WARNING: Migrations failed, continuing..."

php artisan db:seed --force || echo "WARNING: Seeding failed, continuing..."

php artisan config:clear 2>/dev/null
php artisan route:clear 2>/dev/null
php artisan view:clear 2>/dev/null
php artisan cache:clear 2>/dev/null

echo "Starting services..."

exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
