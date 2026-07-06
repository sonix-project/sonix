FROM php:8.4-fpm

RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev \
    libpq-dev libzip-dev nginx supervisor \
    && docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app/laravel-backend

COPY laravel-backend/composer.json laravel-backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

COPY laravel-backend/ .

RUN composer dump-autoload --optimize

RUN mkdir -p public/uploads storage/framework/{cache,sessions,views} storage/logs bootstrap/cache /tmp/nginx-upload \
    && chmod -R 777 /tmp/nginx-upload \
    && chmod -R 775 public/uploads storage bootstrap/cache

RUN echo "upload_max_filesize = 50M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 55M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_input_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "file_uploads = On" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "upload_tmp_dir = /tmp/nginx-upload" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "session.auto_start = Off" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "cgi.fix_pathinfo = 0" >> /usr/local/etc/php/conf.d/uploads.ini

RUN echo 'server { \
    listen 8000; \
    server_name _; \
    root /app/laravel-backend/public; \
    index index.php index.html; \
    client_max_body_size 50M; \
    client_body_temp_path /tmp/nginx-upload; \
    \
    location / { \
        try_files $uri $uri/ /index.php?$query_string; \
    } \
    \
    location ~ \.php$ { \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_index index.php; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        include fastcgi_params; \
        fastcgi_read_timeout 300; \
        fastcgi_send_timeout 300; \
        fastcgi_connect_timeout 300; \
        fastcgi_buffering off; \
    } \
    \
    location ~ /\.ht { deny all; } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|mp4|webm)$ { \
        expires 30d; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/sites-available/default

RUN echo '[supervisord] \
nodaemon=true \
logfile=/var/log/supervisord.log \
\
[program:php-fpm] \
command=php-fpm -F \
autostart=true \
autorestart=true \
\
[program:nginx] \
command=nginx -g "daemon off;" \
autostart=true \
autorestart=true \
\
[program:queue] \
command=php /app/laravel-backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600 \
autostart=true \
autorestart=true \
redirect_stderr=true \
\
[program:scheduler] \
command=/bin/sh -c "while true; do php /app/laravel-backend/artisan schedule:run --verbose --no-interaction & sleep 60; done" \
autostart=true \
autorestart=true \
redirect_stderr=true \
' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["/usr/local/bin/docker-entrypoint.sh"]
