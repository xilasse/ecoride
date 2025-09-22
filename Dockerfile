# Dockerfile sans dépendances Composer pour Railway
FROM php:8.2-apache

WORKDIR /var/www/html

# Installation des extensions PHP essentielles seulement
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Configuration Apache pour Railway
RUN a2enmod rewrite headers
RUN echo 'ServerName ecoride.railway.app' >> /etc/apache2/apache2.conf

# VirtualHost qui répond sur tous les ports et tous les domaines
RUN echo '<VirtualHost *:*>\n\
    DocumentRoot /var/www/html/public\n\
    <Directory /var/www/html/public>\n\
        AllowOverride All\n\
        Require all granted\n\
        DirectoryIndex index.php index.html\n\
    </Directory>\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ErrorLog /var/log/apache2/error.log\n\
    CustomLog /var/log/apache2/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Configuration ports pour Railway (peut utiliser n'importe quel port)
RUN echo 'Listen 80\nListen 8080\nListen 3000' > /etc/apache2/ports.conf

# Copie du code source
COPY . .

# Permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Health check simple - à la racine ET dans public
RUN echo '<?php http_response_code(200); echo json_encode(["status" => "ok", "time" => date("c")]); ?>' > /var/www/html/health.php && \
    echo '<?php http_response_code(200); echo json_encode(["status" => "ok", "time" => date("c")]); ?>' > /var/www/html/public/health.php

EXPOSE 80
CMD ["apache2-foreground"]