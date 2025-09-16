# Fichiers de Configuration Docker - EcoRide

## Structure des dossiers à créer :

```
ecoride/
├── docker/
│   ├── apache/
│   │   └── 000-default.conf
│   ├── php/
│   │   └── php.ini
│   └── scripts/
│       └── start.sh
├── scripts/
│   └── backup.sh
├── mongo-init/
│   └── init-mongo.js
└── .env.example
```

## 1. docker/apache/000-default.conf

```apache
<VirtualHost *:80>
    ServerAdmin webmaster@ecoride.local
    DocumentRoot /var/www/html/public
    
    <Directory /var/www/html/public>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Configuration pour les API endpoints
    <Directory /var/www/html/public/api>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^(.*)$ index.php [QSA,L]
    </Directory>
    
    # Headers de sécurité
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    # Compression Gzip
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/plain
        AddOutputFilterByType DEFLATE text/html
        AddOutputFilterByType DEFLATE text/xml
        AddOutputFilterByType DEFLATE text/css
        AddOutputFilterByType DEFLATE application/xml
        AddOutputFilterByType DEFLATE application/xhtml+xml
        AddOutputFilterByType DEFLATE application/rss+xml
        AddOutputFilterByType DEFLATE application/javascript
        AddOutputFilterByType DEFLATE application/x-javascript
    </IfModule>
    
    ErrorLog ${APACHE_LOG_DIR}/ecoride_error.log
    CustomLog ${APACHE_LOG_DIR}/ecoride_access.log combined
</VirtualHost>
```

## 2. docker/php/php.ini

```ini
; Configuration PHP pour EcoRide
; Paramètres généraux
memory_limit = 256M
max_execution_time = 30
max_input_time = 60
post_max_size = 50M
upload_max_filesize = 50M
max_file_uploads = 20

; Sessions
session.save_handler = redis
session.save_path = "tcp://redis:6379?auth=redis_password_secure"
session.gc_maxlifetime = 3600
session.cookie_secure = 0
session.cookie_httponly = 1
session.use_strict_mode = 1

; Sécurité
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php/error.log

; OPcache
opcache.enable = 1
opcache.enable_cli = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 4000
opcache.revalidate_freq = 2
opcache.fast_shutdown = 1

; Date et timezone
date.timezone = "Europe/Paris"

; Extensions
extension=pdo_mysql
extension=mysqli
extension=mongodb
extension=redis
extension=zip
extension=gd
```

## 3. docker/scripts/start.sh

```bash
#!/bin/bash

# Script de démarrage pour EcoRide

echo "🚀 Démarrage d'EcoRide..."

# Attendre que MySQL soit prêt
echo "⏳ Attente de MySQL..."
while ! nc -z mysql 3306; do
    echo "MySQL n'est pas encore prêt, attente..."
    sleep 2
done
echo "✅ MySQL est prêt"

# Attendre que MongoDB soit prêt
echo "⏳ Attente de MongoDB..."
while ! nc -z mongodb 27017; do
    echo "MongoDB n'est pas encore prêt, attente..."
    sleep 2
done
echo "✅ MongoDB est prêt"

# Créer les dossiers de logs si nécessaires
mkdir -p /var/log/php
touch /var/log/php/error.log
chown www-data:www-data /var/log/php/error.log

# Installation/mise à jour des dépendances Composer si nécessaire
if [ -f "composer.json" ]; then
    echo "📦 Installation des dépendances PHP..."
    composer install --no-dev --optimize-autoloader --no-interaction
fi

# Démarrage d'Apache
echo "🌐 Démarrage d'Apache..."
apache2-foreground
```

## 4. scripts/backup.sh

```bash
#!/bin/sh

# Script de sauvegarde pour EcoRide
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

echo "🔄 Démarrage de la sauvegarde - $DATE"

# Créer le dossier de sauvegarde
mkdir -p "$BACKUP_DIR/mysql" "$BACKUP_DIR/mongodb"

# Sauvegarde MySQL
echo "💾 Sauvegarde MySQL..."
mysqldump -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > "$BACKUP_DIR/mysql/ecoride_${DATE}.sql"

if [ $? -eq 0 ]; then
    echo "✅ Sauvegarde MySQL réussie"
    # Compresser la sauvegarde
    gzip "$BACKUP_DIR/mysql/ecoride_${DATE}.sql"
else
    echo "❌ Échec de la sauvegarde MySQL"
fi

# Sauvegarde MongoDB
echo "💾 Sauvegarde MongoDB..."
mongodump --host $MONGO_HOST:27017 --username $MONGO_USER --password $MONGO_PASSWORD --authenticationDatabase admin --db ecoride_nosql --out "$BACKUP_DIR/mongodb/ecoride_${DATE}"

if [ $? -eq 0 ]; then
    echo "✅ Sauvegarde MongoDB réussie"
    # Compresser la sauvegarde
    cd "$BACKUP_DIR/mongodb"
    tar -czf "ecoride_${DATE}.tar.gz" "ecoride_${DATE}/"
    rm -rf "ecoride_${DATE}/"
else
    echo "❌ Échec de la sauvegarde MongoDB"
fi

# Nettoyage des anciennes sauvegardes (garde 7 jours)
find "$BACKUP_DIR" -name "ecoride_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "ecoride_*.tar.gz" -mtime +7 -delete

echo "✅ Sauvegarde terminée - $DATE"
```

## 5. mongo-init/init-mongo.js

```javascript
// Initialisation de MongoDB pour EcoRide

// Connexion à la base de données
db = db.getSiblingDB('ecoride_nosql');

// Création des collections
db.createCollection('user_preferences');
db.createCollection('ride_logs');
db.createCollection('search_history');
db.createCollection('notifications');

// Index pour les préférences utilisateurs
db.user_preferences.createIndex({ "user_id": 1 }, { unique: true });

// Index pour les logs de covoiturage
db.ride_logs.createIndex({ "ride_id": 1, "timestamp": -1 });
db.ride_logs.createIndex({ "user_id": 1, "timestamp": -1 });

// Index pour l'historique de recherche
db.search_history.createIndex({ "user_id": 1, "timestamp": -1 });
db.search_history.createIndex({ "departure": 1, "arrival": 1 });

// Index pour les notifications
db.notifications.createIndex({ "user_id": 1, "read": 1, "timestamp": -1 });

// Insertion de données de test
db.user_preferences.insertMany([
    {
        user_id: 1,
        music_preference: "rock",
        temperature_preference: 20,
        conversation_level: "moderate",
        smoking_allowed: false,
        pets_allowed: true,
        created_at: new Date(),
        updated_at: new Date()
    }
]);

print('✅ Base MongoDB initialisée avec succès pour EcoRide');
```

## 6. .env.example

```env
# Configuration EcoRide

# Base de données MySQL
DB_HOST=mysql
DB_PORT=3306
DB_NAME=ecoride_db
DB_USER=ecoride_user
DB_PASSWORD=ecoride_password

# MongoDB
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_USER=mongo_admin
MONGO_PASSWORD=mongo_password_secure
MONGO_DB=ecoride_nosql

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_secure

# Configuration application
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8080

# Système de crédits
INITIAL_CREDITS=20
PLATFORM_FEE_CREDITS=2

# Mail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_ADDRESS=noreply@ecoride.local
MAIL_FROM_NAME="EcoRide"

# API Keys (si nécessaire)
GOOGLE_MAPS_API_KEY=your_google_maps_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
```