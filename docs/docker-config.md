# EcoRide - Guide de Déploiement Docker

## 📋 Table des Matières
1. [Vue d'Ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Structure du Projet](#structure-du-projet)
4. [Configuration](#configuration)
5. [Déploiement](#déploiement)
6. [Problèmes Courants et Solutions](#problèmes-courants-et-solutions)
7. [Vérification](#vérification)
8. [Maintenance](#maintenance)
9. [Dépannage](#dépannage)

## 🎯 Vue d'Ensemble

EcoRide est une plateforme de covoiturage écologique basée sur PHP 8.2 avec Apache, utilisant:
- **MySQL 8.0** - Base de données principale (utilisateurs, trajets, réservations)
- **MongoDB 6.0** - Base NoSQL (préférences, logs, notifications)
- **Redis 7** - Cache et sessions
- **PHPMyAdmin** - Administration MySQL
- **Mongo Express** - Administration MongoDB

## ⚙️ Prérequis

### Système requis
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB espace disque

### Ports utilisés
- `8080` - Application EcoRide
- `8081` - PHPMyAdmin
- `8082` - Mongo Express
- `3306` - MySQL (optionnel)
- `27017` - MongoDB (optionnel)
- `6379` - Redis (optionnel)

## 📁 Structure du Projet

```
ecoride/
├── docker/
│   ├── apache/
│   │   └── 000-default.conf      # Configuration Apache
│   ├── php/
│   │   └── php.ini               # Configuration PHP
│   └── scripts/
│       └── start.sh              # Script de démarrage
├── sql/
│   ├── structure.sql             # Structure base MySQL
│   └── data.sql                  # Données de test MySQL
├── mongo-init/
│   └── init-mongo.js             # Initialisation MongoDB
├── public/                       # Code source PHP
├── src/                          # Classes PHP
├── config/
│   └── config.php                # Configuration application
├── Dockerfile                    # Image PHP/Apache
├── compose.yml                   # Orchestration Docker
└── .env                          # Variables d'environnement
```

## 🔧 Configuration

### 1. Créer le fichier .env
```bash
# Configuration base de données MySQL
DB_HOST=mysql
DB_PORT=3306
DB_NAME=ecoride_db
DB_USER=ecoride_user
DB_PASSWORD=ecoride_password

# Configuration MongoDB
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_USER=mongo_admin
MONGO_PASSWORD=mongo_password_secure
MONGO_DB=ecoride_nosql

# Configuration Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_secure

# Configuration application
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost:8080
APP_SECRET=your_secret_key_here

# Configuration crédits
INITIAL_CREDITS=20
PLATFORM_FEE_CREDITS=2

# Configuration mail (optionnel)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
```

### 2. Sécuriser les mots de passe
**⚠️ IMPORTANT**: Modifiez les mots de passe par défaut dans `compose.yml`:
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `MONGO_INITDB_ROOT_PASSWORD`
- Redis `requirepass`

## 🚀 Déploiement

### Déploiement Standard

```bash
# 1. Cloner le projet
git clone <repository-url>
cd ecoride

# 2. Créer le fichier .env
cp .env.example .env
# Éditer .env avec vos configurations

# 3. Construire et démarrer les services
docker-compose up -d --build

# 4. Vérifier le statut
docker-compose ps
```

### Déploiement de Production

```bash
# 1. Préparer l'environnement
export COMPOSE_PROJECT_NAME=ecoride_prod
export APP_ENV=production

# 2. Construire avec optimisations
docker-compose -f compose.yml -f compose.prod.yml up -d --build

# 3. Configurer les sauvegardes automatiques
docker-compose exec backup /backup.sh
```

### Scripts de Déploiement Automatisé

```bash
#!/bin/bash
# deploy.sh - Script de déploiement automatisé

set -e

echo "🚀 Déploiement EcoRide..."

# Vérifications préliminaires
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant"
    exit 1
fi

# Arrêt des services existants
echo "🛑 Arrêt des services existants..."
docker-compose down

# Sauvegarde des données (si existantes)
if [ -d "volumes" ]; then
    echo "💾 Sauvegarde des données..."
    tar -czf "backup_$(date +%Y%m%d_%H%M%S).tar.gz" volumes/
fi

# Construction et démarrage
echo "🔨 Construction des images..."
docker-compose build --no-cache

echo "⚡ Démarrage des services..."
docker-compose up -d

# Attente des services
echo "⏳ Attente des services..."
sleep 30

# Vérification de l'état
echo "🔍 Vérification des services..."
docker-compose ps

echo "✅ Déploiement terminé!"
echo "🌐 Application: http://localhost:8080"
echo "🗄️ PHPMyAdmin: http://localhost:8081"
echo "🍃 Mongo Express: http://localhost:8082"
```

## 🚨 Problèmes Courants et Solutions

### ⚠️ **IMPORTANT**: Solutions aux erreurs fréquentes

#### 1. Erreur: `webapp exited with code 127`

**Symptôme**: Le conteneur webapp se ferme immédiatement avec le code d'erreur 127.

**Cause**: Problème de terminaisons de ligne Windows (CRLF) dans les scripts shell.

**Solution**:
```bash
# Convertir les terminaisons de ligne en format Unix
dos2unix docker/scripts/start.sh 2>/dev/null || sed -i 's/\r$//' docker/scripts/start.sh
dos2unix scripts/backup.sh 2>/dev/null || sed -i 's/\r$//' scripts/backup.sh

# Vérifier que les scripts sont maintenant corrects
file docker/scripts/start.sh  # Doit afficher "executable" sans "CRLF"

# Reconstruire le conteneur
docker-compose down && docker-compose up -d --build
```

#### 2. Erreur: Vous voyez la liste des fichiers au lieu du site web

**Symptôme**: http://localhost:8080 affiche une liste de fichiers au lieu de votre site EcoRide.

**Cause**: Apache DocumentRoot pointe vers le mauvais répertoire.

**Solution**: Vérifiez que `docker/apache/000-default.conf` contient:
```apache
DocumentRoot /var/www/html/public

<Directory /var/www/html/public>
    Options FollowSymLinks
    AllowOverride All
    Require all granted
    DirectoryIndex index.html index.php
</Directory>
```

Puis reconstruisez:
```bash
docker-compose down && docker-compose up -d --build
```

#### 3. Erreur: Variables d'environnement non chargées

**Symptôme**: L'application ne peut pas se connecter aux bases de données.

**Cause**: Le fichier .env n'est pas chargé par PHP.

**Solution**: Vérifiez que `composer.json` contient:
```json
{
    "require": {
        "vlucas/phpdotenv": "^5.6"
    }
}
```

Et que `config/config.php` commence par:
```php
<?php
// Load .env file for local/Docker deployment
if (file_exists(__DIR__ . '/../.env') && class_exists('Dotenv\Dotenv')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}
```

#### 4. Erreur: PHPMyAdmin ne se connecte pas

**Symptôme**: PHPMyAdmin affiche "Cannot log in to the MySQL server".

**Cause**: Informations de connexion incorrectes.

**Solution**: Vérifiez que dans `compose.yml`, la section PHPMyAdmin utilise:
```yaml
phpmyadmin:
  environment:
    PMA_HOST: mysql
    PMA_PORT: 3306
    PMA_USER: ecoride_mysql_admin
    PMA_PASSWORD: mysqlDBmdp8_
    MYSQL_ROOT_PASSWORD: mysqlDBmdp8_root
```

#### 5. Checklist de Déploiement Complet

**Avant de démarrer** - Vérifiez ces points:

✅ **Fichiers requis**:
```bash
ls -la Dockerfile compose.yml .env
ls -la docker/apache/000-default.conf
ls -la docker/php/php.ini
ls -la docker/scripts/start.sh
ls -la public/index.html
```

✅ **Terminaisons de ligne** (sur Windows):
```bash
file docker/scripts/start.sh | grep -v CRLF || echo "⚠️ Fixer les terminaisons de ligne"
```

✅ **Dépendances PHP**:
```bash
grep "vlucas/phpdotenv" composer.json || echo "⚠️ Ajouter phpdotenv"
```

✅ **Configuration .env**:
```bash
grep "DB_HOST=mysql" .env || echo "⚠️ Vérifier .env"
```

#### 6. Script de Déploiement Automatisé avec Vérifications

```bash
#!/bin/bash
# deploy-ecoride.sh - Script de déploiement avec vérifications

set -e

echo "🔍 Vérification des prérequis..."

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# Vérifier les fichiers essentiels
for file in Dockerfile compose.yml .env public/index.html; do
    if [ ! -f "$file" ]; then
        echo "❌ Fichier manquant: $file"
        exit 1
    fi
done

# Fixer les terminaisons de ligne (Windows)
echo "🔧 Correction des terminaisons de ligne..."
for script in docker/scripts/start.sh scripts/backup.sh; do
    if [ -f "$script" ]; then
        dos2unix "$script" 2>/dev/null || sed -i 's/\r$//' "$script"
        chmod +x "$script"
        echo "✅ $script corrigé"
    fi
done

# Vérifier que phpdotenv est installé
if ! grep -q "vlucas/phpdotenv" composer.json; then
    echo "❌ phpdotenv manquant dans composer.json"
    echo "Ajoutez: \"vlucas/phpdotenv\": \"^5.6\" dans require"
    exit 1
fi

echo "🚀 Démarrage du déploiement..."

# Arrêter les conteneurs existants
docker-compose down 2>/dev/null || true

# Construire et démarrer
docker-compose up -d --build

echo "⏳ Attente du démarrage des services..."
sleep 30

# Vérifier le statut
docker-compose ps

# Tester la connectivité
echo "🌐 Test de connectivité..."
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Application accessible: http://localhost:8080"
else
    echo "❌ Application non accessible"
    echo "📋 Logs webapp:"
    docker-compose logs webapp --tail=10
    exit 1
fi

echo ""
echo "🎉 Déploiement réussi!"
echo "🌐 EcoRide: http://localhost:8080"
echo "🗄️ PHPMyAdmin: http://localhost:8081"
echo "🍃 Mongo Express: http://localhost:8082"
```

#### 7. Commandes de Diagnostic Rapide

```bash
# Vérification complète du déploiement
echo "=== STATUS DES CONTENEURS ==="
docker-compose ps

echo -e "\n=== TEST DE CONNECTIVITÉ ==="
curl -I http://localhost:8080 2>/dev/null | head -1 || echo "❌ App inaccessible"
curl -I http://localhost:8081 2>/dev/null | head -1 || echo "❌ PHPMyAdmin inaccessible"
curl -I http://localhost:8082 2>/dev/null | head -1 || echo "❌ Mongo Express inaccessible"

echo -e "\n=== LOGS RÉCENTS WEBAPP ==="
docker-compose logs webapp --tail=5

echo -e "\n=== ESPACE DISQUE ==="
df -h | grep -E "(Size|Available|/)"
```

## ✅ Vérification

### 1. Vérifier les services
```bash
# État des conteneurs
docker-compose ps

# Logs en temps réel
docker-compose logs -f webapp

# Santé des services
docker-compose exec webapp curl http://localhost
docker-compose exec mysql mysqladmin ping
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### 2. Tests de connectivité
```bash
# Test MySQL
docker-compose exec webapp php -r "
try {
    \$pdo = new PDO('mysql:host=mysql;dbname=ecoride_db', 'ecoride_user', 'ecoride_password');
    echo 'MySQL: ✅ Connecté\n';
} catch(Exception \$e) {
    echo 'MySQL: ❌ ' . \$e->getMessage() . '\n';
}"

# Test MongoDB
docker-compose exec webapp php -r "
try {
    \$mongo = new MongoDB\Client('mongodb://mongo_admin:mongo_password_secure@mongodb:27017');
    echo 'MongoDB: ✅ Connecté\n';
} catch(Exception \$e) {
    echo 'MongoDB: ❌ ' . \$e->getMessage() . '\n';
}"

# Test Redis
docker-compose exec webapp php -r "
try {
    \$redis = new Redis();
    \$redis->connect('redis', 6379);
    \$redis->auth('redis_password_secure');
    echo 'Redis: ✅ Connecté\n';
} catch(Exception \$e) {
    echo 'Redis: ❌ ' . \$e->getMessage() . '\n';
}"
```

### 3. Test de l'application
```bash
# Page d'accueil
curl -I http://localhost:8080

# API de santé (si disponible)
curl http://localhost:8080/api/health

# Interface d'administration
curl -I http://localhost:8081  # PHPMyAdmin
curl -I http://localhost:8082  # Mongo Express
```

## 🔧 Maintenance

### Sauvegarde des Données

```bash
# Sauvegarde manuelle
docker-compose exec backup /backup.sh

# Sauvegarde programmée (crontab)
0 2 * * * cd /path/to/ecoride && docker-compose exec backup /backup.sh
```

### Mise à Jour de l'Application

```bash
# 1. Arrêter l'application
docker-compose stop webapp

# 2. Mettre à jour le code
git pull origin main

# 3. Reconstruire l'image
docker-compose build webapp

# 4. Redémarrer
docker-compose up -d webapp
```

### Surveillance des Logs

```bash
# Logs de l'application
docker-compose logs -f webapp

# Logs de toutes les services
docker-compose logs -f

# Filtrer les erreurs
docker-compose logs webapp 2>&1 | grep -i error
```

### Nettoyage

```bash
# Nettoyer les images non utilisées
docker image prune -f

# Nettoyer les volumes non utilisés
docker volume prune -f

# Nettoyage complet (ATTENTION: perte de données)
docker-compose down -v
docker system prune -af
```

## 🔍 Dépannage

### Problèmes Courants

#### 1. Erreur de connexion MySQL
```
ERROR: Connection refused mysql:3306
```
**Solution**:
```bash
# Vérifier le statut
docker-compose ps mysql

# Vérifier les logs
docker-compose logs mysql

# Redémarrer MySQL
docker-compose restart mysql
```

#### 2. Problème de permissions
```
ERROR: Permission denied /var/www/html
```
**Solution**:
```bash
# Corriger les permissions
docker-compose exec webapp chown -R www-data:www-data /var/www/html
```

#### 3. Espace disque insuffisant
```
ERROR: No space left on device
```
**Solution**:
```bash
# Nettoyer Docker
docker system prune -af

# Vérifier l'espace
df -h
```

#### 4. Port déjà utilisé
```
ERROR: Port 8080 is already in use
```
**Solution**:
```bash
# Trouver le processus
sudo lsof -i :8080

# Modifier le port dans compose.yml
ports:
  - "8081:80"  # Au lieu de 8080:80
```

### Commandes de Diagnostic

```bash
# Informations système
docker system info
docker-compose version

# État des conteneurs
docker-compose ps
docker stats

# Inspection des réseaux
docker network ls
docker network inspect ecoride_ecoride_network

# Inspection des volumes
docker volume ls
docker volume inspect ecoride_mysql_data
```

### Logs Détaillés

```bash
# Activer le debug dans compose.yml
environment:
  APP_DEBUG: true

# Logs PHP détaillés
docker-compose exec webapp tail -f /var/log/php/error.log

# Logs Apache
docker-compose exec webapp tail -f /var/log/apache2/ecoride_error.log
```

## 📊 Monitoring

### Surveillance des Performances
```bash
# Utilisation des ressources
docker stats

# Espace disque des volumes
docker system df

# Métriques spécifiques
docker-compose exec webapp php -m  # Extensions PHP chargées
docker-compose exec mysql mysqladmin status
```

### Health Checks
Ajouter à `compose.yml`:
```yaml
webapp:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

## 🔐 Sécurité

### Configuration de Production
1. **Changer tous les mots de passe par défaut**
2. **Utiliser HTTPS avec un proxy inverse (Nginx/Traefik)**
3. **Configurer un firewall**
4. **Activer les sauvegardes automatiques**
5. **Surveiller les logs de sécurité**

### Variables d'Environnement Sensibles
```bash
# Utiliser Docker secrets en production
echo "mot_de_passe_secret" | docker secret create mysql_password -
```

---

## 📞 Support

Pour toute question ou problème:
1. Consulter les logs: `docker-compose logs`
2. Vérifier la documentation Docker Compose
3. Contacter l'équipe de développement

**Dernière mise à jour**: 2025-09-16