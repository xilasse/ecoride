#!/bin/bash

# Script de démarrage unifié pour EcoRide (Local Docker + Railway)
echo "🚀 Démarrage d'EcoRide..."

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
    DB_HOST=${MYSQLHOST:-"localhost"}
    DB_PORT=${MYSQLPORT:-3306}
    DB_USER=${MYSQLUSER:-"root"}
    DB_PASS=${MYSQLPASSWORD:-""}
    DB_NAME=${MYSQLDATABASE:-"mysql"}

    echo $MYSQL_URL
    echo $MYSQLHOST $MYSQLPORT $MYSQLUSER $MYSQLPASSWORD $MYSQLDATABASE

    echo "🧪 Test connexion immédiate..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT 1;" 2>/dev/null; then
            echo "✅ MySQL est prêt après $attempt tentative(s)"
            return 0
        fi

        echo "MySQL n'est pas encore prêt (tentative $attempt/$max_attempts)..."
        sleep 3
        attempt=$((attempt + 1))
    done

    echo "❌ Impossible de se connecter à MySQL"
    return 1

    # Test réseau de base
    echo "🌐 Test port $DB_PORT sur $DB_HOST..."
    if nc -z -w 5 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo "✅ Port accessible"
    else
        echo "❌ Port $DB_PORT INaccessible - vérifiez la configuration DB"
        return 1
    fi
}

# Fonction pour attendre Redis
wait_for_redis() {
    # Utiliser REDIS_URL de Railway si disponible, sinon variables individuelles
    local redis_url="${REDIS_URL}"

    if [ -n "$redis_url" ]; then
        echo "🔧 Parsing Railway REDIS_URL..."
        # Parser l'URL Railway: redis://user:pass@host:port ou redis://host:port
        local host=$(echo "$redis_url" | sed -E 's/.*:\/\/(([^:@]+):([^@]+)@)?([^:]+):([0-9]+).*/\4/')
        local port=$(echo "$redis_url" | sed -E 's/.*:\/\/(([^:@]+):([^@]+)@)?([^:]+):([0-9]+).*/\5/')
        local password=$(echo "$redis_url" | sed -E 's/.*:\/\/(([^:@]+):([^@]+)@)?([^:]+):([0-9]+).*/\3/')

        # Si pas de mot de passe dans l'URL, vérifier la variable REDIS_PASSWORD
        if [ -z "$password" ] || [ "$password" = "$redis_url" ]; then
            password=${REDIS_PASSWORD}
        fi
    else
        echo "🔧 Utilisation des variables Redis individuelles..."
        local host=${REDIS_HOST:-redis}
        local port=${REDIS_PORT:-6379}
        local password=${REDIS_PASSWORD}
    fi

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
    export SERVER_NAME=${SERVER_NAME:-localhost}
    echo "SERVER NAME === $SERVER_NAME"

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

# Créer les dossiers de logs si nécessaires
echo "📁 Création des dossiers nécessaires..."
mkdir -p /var/www/html/logs /var/www/html/cache /var/www/html/uploads
chown -R www-data:www-data /var/www/html/logs /var/www/html/cache /var/www/html/uploads

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
echo "  DATABASE_URL: ${DATABASE_URL:+DÉFINI}"
echo "  MYSQL_URL: ${MYSQL_URL:+DÉFINI}"
echo "  REDIS_URL: ${REDIS_URL:+DÉFINI}"
echo "  RAILWAY_STATIC_URL: ${RAILWAY_STATIC_URL:-'non défini'}"

# Initialisation de la base de données (seulement si MySQL accessible)
if [ -n "$RAILWAY_ENVIRONMENT" ]; then
    echo "🗄️  Initialisation de la base de données (Railway)..."
    echo "ℹ️  Sur Railway, l'initialisation se fera au premier accès de l'app"
    echo "✅ Mode Railway: initialisation différée"
else
    echo "🗄️  Initialisation de la base de données..."
    php /var/www/html/scripts/init-database.php

    if [ $? -eq 0 ]; then
        echo "✅ Base de données initialisée avec succès"
    else
        echo "❌ Erreur lors de l'initialisation de la base de données"
        echo "⚠️  L'application va quand même démarrer, mais la DB pourrait ne pas être configurée"
    fi
fi

# Démarrage d'Apache
echo "🌐 Démarrage d'Apache..."
exec apache2-foreground