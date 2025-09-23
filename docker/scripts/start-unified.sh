#!/bin/bash

# Script de démarrage unifié pour EcoRide (Local Docker + Railway)
echo "🚀 Démarrage d'EcoRide..."
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
wait_for_mysql_admin
# Démarrage d'Apache
echo "🌐 Démarrage d'Apache..."
exec apache2-foreground