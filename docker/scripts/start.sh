#!/bin/bash

# Wait for database to be ready
echo "Waiting for MySQL to be ready..."
until mysqladmin ping -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" --silent; do
    echo "MySQL is unavailable - sleeping"
    sleep 2
done
echo "MySQL is ready!"

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
until mongo --host "$MONGO_HOST:$MONGO_PORT" --username "$MONGO_USER" --password "$MONGO_PASSWORD" --authenticationDatabase admin --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; do
    echo "MongoDB is unavailable - sleeping"
    sleep 2
done
echo "MongoDB is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
until redis-cli -h redis -p 6379 -a redis_password_secure ping > /dev/null 2>&1; do
    echo "Redis is unavailable - sleeping"
    sleep 2
done
echo "Redis is ready!"

# Install/update Composer dependencies if needed
if [ -f /var/www/html/composer.json ]; then
    echo "Installing/updating Composer dependencies..."
    cd /var/www/html
    composer install --no-dev --optimize-autoloader --no-interaction
fi

# Set proper permissions
echo "Setting file permissions..."
chown -R www-data:www-data /var/www/html
find /var/www/html -type f -exec chmod 644 {} \;
find /var/www/html -type d -exec chmod 755 {} \;

# Create necessary directories
mkdir -p /var/www/html/logs
mkdir -p /var/www/html/cache
mkdir -p /var/www/html/uploads
chown -R www-data:www-data /var/www/html/logs /var/www/html/cache /var/www/html/uploads

echo "Starting Apache..."
# Start Apache in foreground
exec apache2-foreground