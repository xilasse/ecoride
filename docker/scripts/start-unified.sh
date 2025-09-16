#!/bin/bash

# Script de démarrage unifié pour EcoRide (Local Docker + Railway)
echo "🚀 Démarrage d'EcoRide..."

# Fonction pour détecter l'environnement
detect_environment() {
    if [ -n "$RAILWAY_ENVIRONMENT" ] || [ -n "$RAILWAY_PROJECT_ID" ]; then
        echo "railway"
    elif [ -n "$DB_HOST" ] && [ "$DB_HOST" != "mysql" ]; then
        echo "external"
    else
        echo "local"
    fi
}

# Fonction pour attendre qu'un service soit prêt (méthode netcat)
wait_for_service_nc() {
    local host=$1
    local port=$2
    local service_name=$3

    echo "⏳ Attente de $service_name ($host:$port)..."
    while ! nc -z "$host" "$port"; do
        echo "$service_name n'est pas encore prêt, attente..."
        sleep 2
    done
    echo "✅ $service_name est prêt"
}

# Fonction pour attendre MySQL (méthode mysqladmin)
wait_for_mysql_admin() {
    local host=${DB_HOST:-localhost}
    local port=${DB_PORT:-3306}
    local user=${DB_USER:-root}
    local password=${DB_PASSWORD}

    echo "⏳ Attente de MySQL ($host:$port)..."
    until mysqladmin ping -h"$host" -P"$port" -u"$user" -p"$password" --silent 2>/dev/null; do
        echo "MySQL n'est pas encore prêt, attente..."
        sleep 2
    done
    echo "✅ MySQL est prêt"
}

# Fonction pour attendre MongoDB (méthode mongo)
wait_for_mongodb() {
    local host=${MONGO_HOST:-mongodb}
    local port=${MONGO_PORT:-27017}
    local user=${MONGO_USER}
    local password=${MONGO_PASSWORD}

    echo "⏳ Attente de MongoDB ($host:$port)..."
    if [ -n "$user" ] && [ -n "$password" ]; then
        until mongo --host "$host:$port" --username "$user" --password "$password" --authenticationDatabase admin --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; do
            echo "MongoDB n'est pas encore prêt, attente..."
            sleep 2
        done
    else
        until mongo --host "$host:$port" --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; do
            echo "MongoDB n'est pas encore prêt, attente..."
            sleep 2
        done
    fi
    echo "✅ MongoDB est prêt"
}

# Fonction pour attendre Redis
wait_for_redis() {
    local host=${REDIS_HOST:-redis}
    local port=${REDIS_PORT:-6379}
    local password=${REDIS_PASSWORD}

    echo "⏳ Attente de Redis ($host:$port)..."
    if [ -n "$password" ]; then
        until redis-cli -h "$host" -p "$port" -a "$password" ping > /dev/null 2>&1; do
            echo "Redis n'est pas encore prêt, attente..."
            sleep 2
        done
    else
        until redis-cli -h "$host" -p "$port" ping > /dev/null 2>&1; do
            echo "Redis n'est pas encore prêt, attente..."
            sleep 2
        done
    fi
    echo "✅ Redis est prêt"
}

# Installer netcat si nécessaire (pour l'environnement local)
install_netcat() {
    if ! command -v nc >/dev/null 2>&1; then
        echo "📦 Installation de netcat..."
        apt-get update && apt-get install -y netcat-openbsd
    fi
}

# Détecter l'environnement
ENVIRONMENT=$(detect_environment)
echo "🔍 Environnement détecté: $ENVIRONMENT"

# Configuration du port Apache
configure_apache_port() {
    # Déterminer le port selon l'environnement
    if [ -n "$PORT" ]; then
        # Railway ou autre service avec PORT défini
        APACHE_PORT=$PORT
        echo "🌐 Utilisation du port Railway: $APACHE_PORT"
    else
        # Docker local ou environnement standard
        APACHE_PORT=80
        echo "🐳 Utilisation du port standard: $APACHE_PORT"
    fi

    # Exporter la variable pour les templates
    export APACHE_PORT

    # Configurer Apache avec le bon port
    echo "⚙️  Configuration d'Apache pour le port $APACHE_PORT..."

    # Remplacer les templates par les vrais fichiers de config
    if [ -f "/etc/apache2/sites-available/000-default.conf.template" ]; then
        envsubst < /etc/apache2/sites-available/000-default.conf.template > /etc/apache2/sites-available/000-default.conf
    fi

    if [ -f "/etc/apache2/ports.conf.template" ]; then
        envsubst < /etc/apache2/ports.conf.template > /etc/apache2/ports.conf
    fi

    echo "✅ Apache configuré pour le port $APACHE_PORT"
}

# Configurer Apache avant de continuer
configure_apache_port

# Logique basée sur l'environnement
case $ENVIRONMENT in
    "railway")
        echo "🚂 Configuration Railway détectée"
        # Sur Railway, on a des bases de données externes
        # Installer les outils nécessaires si pas déjà présents
        if ! command -v mysqladmin >/dev/null 2>&1; then
            echo "📦 Installation des outils MySQL..."
            apt-get update && apt-get install -y default-mysql-client
        fi

        # Attendre les services externes
        wait_for_mysql_admin

        # MongoDB n'est pas toujours utilisé sur Railway, vérifier d'abord
        if [ -n "$MONGO_HOST" ] && [ "$MONGO_HOST" != "mongodb" ]; then
            if command -v mongo >/dev/null 2>&1; then
                wait_for_mongodb
            else
                echo "⚠️  MongoDB client non disponible, on continue sans vérification"
            fi
        fi

        # Redis optionnel
        if [ -n "$REDIS_HOST" ] && [ "$REDIS_HOST" != "redis" ]; then
            if command -v redis-cli >/dev/null 2>&1; then
                wait_for_redis
            else
                echo "⚠️  Redis client non disponible, on continue sans vérification"
            fi
        fi
        ;;

    "external")
        echo "🌐 Configuration avec bases de données externes détectée"
        # Bases de données externes mais pas Railway
        wait_for_mysql_admin

        if [ -n "$MONGO_HOST" ]; then
            wait_for_mongodb
        fi

        if [ -n "$REDIS_HOST" ]; then
            wait_for_redis
        fi
        ;;

    "local")
        echo "🐳 Configuration Docker locale détectée"
        # Installation de netcat pour les tests de connexion
        install_netcat

        # Attendre les services Docker avec netcat
        wait_for_service_nc "mysql" "3306" "MySQL"
        wait_for_service_nc "mongodb" "27017" "MongoDB"

        # Redis optionnel
        if nc -z redis 6379 2>/dev/null; then
            wait_for_service_nc "redis" "6379" "Redis"
        else
            echo "ℹ️  Redis non disponible, on continue sans"
        fi
        ;;
esac

# Créer les dossiers de logs si nécessaires
echo "📁 Création des dossiers nécessaires..."
mkdir -p /var/log/php
mkdir -p /var/www/html/logs
mkdir -p /var/www/html/cache
mkdir -p /var/www/html/uploads

# Configurer les permissions
echo "🔐 Configuration des permissions..."
touch /var/log/php/error.log
chown -R www-data:www-data /var/log/php
chown -R www-data:www-data /var/www/html/logs /var/www/html/cache /var/www/html/uploads

# Installation/mise à jour des dépendances Composer si nécessaire
if [ -f "/var/www/html/composer.json" ]; then
    echo "📦 Installation des dépendances PHP..."
    cd /var/www/html
    composer install --no-dev --optimize-autoloader --no-interaction
elif [ -f "composer.json" ]; then
    echo "📦 Installation des dépendances PHP..."
    composer install --no-dev --optimize-autoloader --no-interaction
fi

# Configuration finale des permissions
echo "🔐 Configuration finale des permissions..."
chown -R www-data:www-data /var/www/html
find /var/www/html -type f -exec chmod 644 {} \; 2>/dev/null || true
find /var/www/html -type d -exec chmod 755 {} \; 2>/dev/null || true

# Démarrage d'Apache
echo "🌐 Démarrage d'Apache..."
exec apache2-foreground