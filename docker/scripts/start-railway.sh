#!/bin/bash

# Script de démarrage optimisé pour Railway
echo "🚂 Démarrage EcoRide sur Railway..."

# Configuration du port dynamique Railway
APACHE_PORT=${PORT:-80}
export APACHE_PORT

echo "🌐 Configuration Apache pour le port: $APACHE_PORT"

# Vérifier que les templates existent
if [ ! -f "/etc/apache2/sites-available/000-default.conf.template" ]; then
    echo "❌ Template 000-default.conf.template manquant, création d'un basique..."
    cat > /etc/apache2/sites-available/000-default.conf << EOF
<VirtualHost *:${APACHE_PORT}>
    ServerName ecoride.railway.app
    DocumentRoot /var/www/html/public
    <Directory /var/www/html/public>
        AllowOverride All
        Require all granted
        DirectoryIndex index.html index.php
    </Directory>
    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF
else
    # Générer les fichiers de configuration Apache
    envsubst '${APACHE_PORT}' < /etc/apache2/sites-available/000-default.conf.template > /etc/apache2/sites-available/000-default.conf
fi

if [ ! -f "/etc/apache2/ports.conf.template" ]; then
    echo "❌ Template ports.conf.template manquant, création d'un basique..."
    cat > /etc/apache2/ports.conf << EOF
Listen ${APACHE_PORT}
EOF
else
    envsubst '${APACHE_PORT}' < /etc/apache2/ports.conf.template > /etc/apache2/ports.conf
fi

# Configuration Apache pour supprimer le warning ServerName
echo "ServerName ecoride.railway.app" >> /etc/apache2/apache2.conf

# Vérifier la configuration Apache
echo "🔧 Vérification de la configuration Apache..."
apache2ctl configtest
if [ $? -ne 0 ]; then
    echo "❌ Erreur de configuration Apache"
    exit 1
fi

# Créer un health check simple TOUJOURS
mkdir -p /var/www/html/public
echo "🏥 Création du health check..."
cat > /var/www/html/public/health.php << 'EOF'
<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache');

$health = [
    'status' => 'ok',
    'timestamp' => date('c'),
    'port' => $_SERVER['SERVER_PORT'] ?? 'unknown',
    'environment' => 'railway',
    'checks' => []
];

// Test simple PHP
$health['checks']['php'] = [
    'status' => 'ok',
    'version' => PHP_VERSION
];

// Test accès fichier
try {
    $testFile = '/tmp/health_' . uniqid();
    file_put_contents($testFile, 'test');
    unlink($testFile);
    $health['checks']['filesystem'] = ['status' => 'ok'];
} catch (Exception $e) {
    $health['checks']['filesystem'] = ['status' => 'error', 'error' => $e->getMessage()];
}

// Test DB optionnel
if (isset($_ENV['DATABASE_URL']) || isset($_ENV['MYSQL_URL'])) {
    try {
        // Configuration très simple
        if (isset($_ENV['DATABASE_URL'])) {
            $url = parse_url($_ENV['DATABASE_URL']);
            $dsn = "mysql:host={$url['host']};port=" . ($url['port'] ?? 3306);
            $pdo = new PDO($dsn, $url['user'], $url['pass'], [PDO::ATTR_TIMEOUT => 3]);
            $health['checks']['database'] = ['status' => 'ok'];
        } else {
            $health['checks']['database'] = ['status' => 'skipped', 'reason' => 'no_url'];
        }
    } catch (Exception $e) {
        $health['checks']['database'] = ['status' => 'error', 'error' => $e->getMessage()];
    }
}

// Statut global
$globalStatus = 'ok';
foreach ($health['checks'] as $check) {
    if (isset($check['status']) && $check['status'] === 'error') {
        $globalStatus = 'degraded';
        break;
    }
}
$health['status'] = $globalStatus;

http_response_code($globalStatus === 'ok' ? 200 : 503);
echo json_encode($health, JSON_PRETTY_PRINT);
?>
EOF

chown www-data:www-data /var/www/html/public/health.php
chmod 644 /var/www/html/public/health.php

echo "✅ Health check créé"

# Test rapide du health check
echo "🧪 Test du health check..."
php /var/www/html/public/health.php
echo ""

# Initialiser la base de données SANS bloquer le démarrage
if [ -n "$DATABASE_URL" ] || [ -n "$MYSQL_URL" ]; then
    echo "🗄️ Tentative d'initialisation de la base de données..."
    cd /var/www/html
    timeout 30 php scripts/init-database.php || echo "⚠️ Timeout ou erreur DB, l'app démarre quand même"
else
    echo "⚠️ Aucune base de données configurée (DATABASE_URL manquant)"
fi

# Variables d'environnement pour debug
echo "🔍 Configuration Railway:"
echo "  PORT: $PORT"
echo "  APACHE_PORT: $APACHE_PORT"
echo "  DATABASE_URL: ${DATABASE_URL:+DÉFINI}"
echo "  RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-non défini}"

# Test final de démarrage Apache en arrière-plan
echo "🧪 Test préliminaire d'Apache..."
apache2ctl start
sleep 2

# Vérifier que Apache écoute sur le bon port
if netstat -ln | grep ":$APACHE_PORT "; then
    echo "✅ Apache écoute sur le port $APACHE_PORT"
else
    echo "❌ Apache n'écoute pas sur le port $APACHE_PORT"
    echo "🔍 Ports en écoute:"
    netstat -ln | grep LISTEN
fi

# Arrêter Apache temporaire et démarrer en mode foreground
apache2ctl stop
sleep 1

# Démarrage Apache final
echo "🌐 Démarrage Apache final sur le port $APACHE_PORT..."
exec apache2-foreground