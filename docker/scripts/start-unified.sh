#!/bin/bash

# Script de démarrage unifié pour EcoRide (Local Docker + Railway)
echo "🚀 Démarrage d'EcoRide..."
wait_for_mysql_admin() {
    # Parser MYSQL_URL de Railway automatiquement
    if [ -n "$MYSQL_URL" ]; then
        echo "🔧 Parsing Railway MYSQL_URL..."
        # Format: mysql://user:pass@host:port/db
        DB_HOST=$(echo "$MYSQL_URL" | sed -E 's#mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+).*#\3#')
        DB_PORT=$(echo "$MYSQL_URL" | sed -E 's#mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+).*#\4#')
        DB_USER=$(echo "$MYSQL_URL" | sed -E 's#mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+).*#\1#')
        DB_PASS=$(echo "$MYSQL_URL" | sed -E 's#mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+).*#\2#')
        DB_NAME=$(echo "$MYSQL_URL" | sed -E 's#mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+).*#\5#')
    else
        # Fallback vers variables individuelles
        DB_HOST=${MYSQLHOST:-"localhost"}
        DB_PORT=${MYSQLPORT:-3306}
        DB_USER=${MYSQLUSER:-"root"}
        DB_PASS=${MYSQLPASSWORD:-""}
        DB_NAME=${MYSQLDATABASE:-"mysql"}
    fi

    echo "=== VARIABLES MYSQL FINALES ==="
    echo "MYSQL_URL: ${MYSQL_URL:+DÉFINI}"
    echo "DB_HOST: $DB_HOST"
    echo "DB_PORT: $DB_PORT"
    echo "DB_USER: $DB_USER"
    echo "DB_NAME: $DB_NAME"
    echo "DB_PASS: ${DB_PASS:+DÉFINI}"
    echo "==============================="

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
# Test MySQL non-bloquant sur Railway
if [ -n "$RAILWAY_ENVIRONMENT" ]; then
    echo "🚂 Mode Railway: test MySQL non-bloquant"
    if wait_for_mysql_admin; then
        echo "✅ MySQL accessible"
    else
        echo "⚠️  MySQL pas encore accessible - on continue quand même"
    fi
else
    echo "🐳 Mode local: test MySQL bloquant"
    wait_for_mysql_admin
fi

# Configuration Apache pour Railway
if [ -n "$PORT" ]; then
    echo "🔧 Configuration Apache pour Railway port $PORT"

    # Vérifier que les dossiers Apache existent
    if [ ! -d "/etc/apache2/sites-available" ]; then
        echo "❌ Dossier /etc/apache2/sites-available introuvable!"
        ls -la /etc/apache2/
        exit 1
    fi

    echo "📁 Dossiers Apache disponibles:"
    ls -la /etc/apache2/

    # Configurer ports.conf
    echo "🔧 Configuration de ports.conf..."
    cat > /etc/apache2/ports.conf << EOF
Listen $PORT
<IfModule ssl_module>
    Listen 443
</IfModule>
EOF
    echo "✅ ports.conf configuré"

    # Configurer VirtualHost
    echo "🔧 Configuration de 000-default.conf..."
    cat > /etc/apache2/sites-available/000-default.conf << EOF
<VirtualHost *:$PORT>
    DocumentRoot /var/www/html/public
    <Directory /var/www/html/public>
        AllowOverride All
        Require all granted
        DirectoryIndex index.php index.html
    </Directory>
    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF
    echo "✅ 000-default.conf configuré"

    # Vérifier que la configuration est correcte
    echo "🧪 Test de la configuration Apache..."
    if apache2ctl configtest; then
        echo "✅ Configuration Apache valide"
    else
        echo "❌ Configuration Apache invalide:"
        apache2ctl configtest
    fi
fi

# Démarrage d'Apache
echo "🌐 Démarrage d'Apache..."
exec apache2-foreground