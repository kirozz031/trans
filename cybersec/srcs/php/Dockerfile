FROM php:8.2-fpm

# Installe PDO SQLite
RUN apt-get update && apt-get install -y \
    libsqlite3-dev libpng-dev libjpeg-dev libmagickwand-dev \
    zip unzip git \
    && pecl install imagick \
    && docker-php-ext-enable imagick \
    && docker-php-ext-install pdo pdo_sqlite \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

    # Installer Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Crée le dossier de travail
WORKDIR /var/www/html
COPY composer.json composer.lock* ./
RUN composer install

# Copie les fichiers PHP (on en ajoutera après)
COPY . /var/www/html/
