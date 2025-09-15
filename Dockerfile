# Utilisation de l'image PHP officielle avec Apache
FROM php:8.2-apache

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libzip-dev \
    libssl-dev \
    pkg-config \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installation des extensions PHP nécessaires
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd \
    pdo \
    pdo_mysql \
    mysqli \
    zip \
    opcache

# Installation de l'extension MongoDB
RUN pecl install mongodb \
    && docker-php-ext-enable mongodb

# Installation de l'extension Redis
RUN pecl install redis \
    && docker-php-ext-enable redis

# Installation de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configuration d'Apache
RUN a2enmod rewrite headers
COPY ./docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf

# Configuration PHP
COPY ./docker/php/php.ini /usr/local/etc/php/conf.d/ecoride.ini

# Configuration des permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Copie des fichiers de l'application
WORKDIR /var/www/html

# Copie du composer.json en premier pour optimiser le cache Docker
COPY composer.json composer.lock ./

# Installation des dépendances PHP
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copie du reste de l'application
COPY . .

# Configuration finale des permissions
RUN chown -R www-data:www-data /var/www/html \
    && find /var/www/html -type f -exec chmod 644 {} \; \
    && find /var/www/html -type d -exec chmod 755 {} \;

# Exposition du port 80
EXPOSE 80

# Script de démarrage
COPY ./docker/scripts/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]