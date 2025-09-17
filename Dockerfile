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
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Installation des extensions PHP nécessaires
# Utiliser une approche plus robuste pour éviter les doublons
RUN set -ex; \
    # Configuration de GD
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    \
    # Installer seulement les extensions non présentes
    EXTENSIONS=""; \
    for ext in gd pdo pdo_mysql mysqli zip opcache; do \
        if ! php -m 2>/dev/null | grep -q "^$ext$"; then \
            EXTENSIONS="$EXTENSIONS $ext"; \
            echo "Will install: $ext"; \
        else \
            echo "Already installed: $ext"; \
        fi; \
    done; \
    \
    # Installer les extensions en une fois si nécessaire
    if [ -n "$EXTENSIONS" ]; then \
        docker-php-ext-install $EXTENSIONS; \
    else \
        echo "All core extensions already available"; \
    fi

# Extensions optionnelles pour le développement local
# MongoDB et Redis sont optionnels en local
RUN echo "Skipping MongoDB and Redis for local development"

# Installation de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configuration d'Apache
RUN a2enmod rewrite headers
COPY ./docker/apache/000-default.conf.template /etc/apache2/sites-available/000-default.conf.template
COPY ./docker/apache/ports.conf.template /etc/apache2/ports.conf.template
# Copier aussi la config de base pour le développement local
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

# Exposition du port (80 par défaut, mais peut être modifié par Railway)
EXPOSE 80
# Railway utilisera la variable PORT pour le binding

# Script de démarrage unifié
COPY ./docker/scripts/start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]