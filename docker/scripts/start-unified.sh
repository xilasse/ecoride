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
  echo "Parsing DATABASE_URL..."
  DB_HOST=$(echo $DATABASE_URL | sed -E 's/.*:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/([^?]+).*/\3/')
  DB_USER=$(echo $DATABASE_URL | sed -E 's/.*:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/([^?]+).*/\1/')
  DB_PASS=$(echo $DATABASE_URL | sed -E 's/.*:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/([^?]+).*/\2/')
  DB_NAME=$(echo $DATABASE_URL | sed -E 's/.*:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/([^?]+).*/\5/')
  DB_PORT=$(echo $DATABASE_URL | sed -E 's/.*:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/([^?]+).*/\4/')
    echo "⏳ Attente de MySQL ($host:$port)..."

    # Vérifier d'abord si les variables sont définies
    if [ -z "$DB_HOST" ] || [ -z "$DB_PASS" ]; then
        echo "❌ Variables DB_HOST ou DB_PASSWORD non définies"
        echo "DB_HOST: ${DB_HOST:-'NON DÉFINI'}"
        echo "DB_USER: ${DB_USER:-'NON DÉFINI'}"
        echo "DB_PASSWORD: ${DB_PASS:+DÉFINI}"
        return 1
    fi

    # Tentative de connexion avec timeout
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if mysqladmin ping -h"$host" -P"$port" -u"$user" -p"$password" --silent 2>/dev/null; then
            echo "✅ MySQL est prêt après $attempt tentative(s)"
            return 0
        fi

        echo "MySQL n'est pas encore prêt (tentative $attempt/$max_attempts)..."
        sleep 3
        attempt=$((attempt + 1))
    done

    echo "❌ MySQL non accessible après $max_attempts tentatives"
    echo "Vérifiez vos variables d'environnement DB_*"
    return 1
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
        echo "🔧 Génération de 000-default.conf avec PORT=$APACHE_PORT"
        envsubst '${APACHE_PORT}' < /etc/apache2/sites-available/000-default.conf.template > /etc/apache2/sites-available/000-default.conf
        echo "📄 Contenu généré :"
        cat /etc/apache2/sites-available/000-default.conf | head -3
    fi

    if [ -f "/etc/apache2/ports.conf.template" ]; then
        echo "🔧 Génération de ports.conf avec PORT=$APACHE_PORT"
        envsubst '${APACHE_PORT}' < /etc/apache2/ports.conf.template > /etc/apache2/ports.conf
        echo "📄 Contenu généré :"
        cat /etc/apache2/ports.conf | head -3
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

# Configuration Apache pour supprimer le warning ServerName
if [ -f "/etc/apache2/apache2.conf" ] && [ -f "/var/www/html/docker/apache/apache2.conf.append" ]; then
    echo "🔧 Suppression du warning Apache ServerName..."
    cat /var/www/html/docker/apache/apache2.conf.append >> /etc/apache2/apache2.conf
fi

# Test final avant démarrage Apache
echo "🧪 Test final de configuration..."

# Vérifier que les fichiers de config sont corrects
if [ -f "/etc/apache2/ports.conf" ]; then
    echo "✅ ports.conf existe"
    grep "Listen" /etc/apache2/ports.conf || echo "❌ Pas de Listen dans ports.conf"
else
    echo "❌ ports.conf manquant"
fi

if [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
    echo "✅ 000-default.conf existe"
    grep "VirtualHost" /etc/apache2/sites-available/000-default.conf || echo "❌ Pas de VirtualHost"
else
    echo "❌ 000-default.conf manquant"
fi

# Vérifier que le health check est accessible
if [ -f "/var/www/html/public/health.php" ]; then
    echo "✅ health.php trouvé"
else
    echo "❌ health.php manquant - création d'un basique"
    mkdir -p /var/www/html/public
    cat > /var/www/html/public/health.php << 'EOF'
<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'timestamp' => date('c'),
    'port' => $_SERVER['SERVER_PORT'] ?? 'unknown',
    'environment' => getenv('APP_ENV') ?: 'unknown'
]);
?>
EOF
    chown www-data:www-data /var/www/html/public/health.php
fi

# Variables pour debug
echo "🔍 Variables importantes:"
echo "  PORT: ${PORT:-'non défini'}"
echo "  APACHE_PORT: ${APACHE_PORT:-'non défini'}"
echo "  RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-'non défini'}"

# Initialisation de la base de données
echo "🗄️  Initialisation de la base de données..."
php /var/www/html/scripts/init-database.php

if [ $? -eq 0 ]; then
    echo "✅ Base de données initialisée avec succès"
else
    echo "❌ Erreur lors de l'initialisation de la base de données"
    echo "⚠️  L'application va quand même démarrer, mais la DB pourrait ne pas être configurée"
fi

# Démarrage d'Apache
echo "🌐 Démarrage d'Apache..."
exec apache2-foreground