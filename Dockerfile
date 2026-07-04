FROM php:8.4-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev \
    libpq-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app/laravel-backend

# Copy composer files first (for caching)
COPY laravel-backend/composer.json laravel-backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy the rest of laravel-backend
COPY laravel-backend/ .

# Generate autoloader and optimize
RUN composer dump-autoload --optimize

# Create necessary directories
RUN mkdir -p public/uploads storage/framework/{cache,sessions,views} storage/logs bootstrap/cache && chmod -R 775 public/uploads

EXPOSE 8000

CMD ["sh", "-c", "mkdir -p public/uploads && php artisan key:generate --force && php artisan migrate --force && php -d upload_max_filesize=50M -d post_max_size=55M -d max_execution_time=120 -d memory_limit=256M artisan serve --host=0.0.0.0 --port=8000"]
