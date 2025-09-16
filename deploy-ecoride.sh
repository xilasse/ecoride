#!/bin/bash
# deploy-ecoride.sh - Script de déploiement automatisé pour EcoRide
# Usage: chmod +x deploy-ecoride.sh && ./deploy-ecoride.sh

set -e

echo "🚀 EcoRide - Script de Déploiement Docker"
echo "=========================================="

# Vérification des prérequis
echo "🔍 Vérification des prérequis..."

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    echo "Installez Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

echo "✅ Docker et Docker Compose détectés"

# Vérifier les fichiers essentiels
echo "🔍 Vérification des fichiers..."
missing_files=0

for file in Dockerfile compose.yml .env public/index.html config/config.php; do
    if [ ! -f "$file" ]; then
        echo "❌ Fichier manquant: $file"
        missing_files=1
    else
        echo "✅ $file trouvé"
    fi
done

if [ $missing_files -eq 1 ]; then
    echo "❌ Des fichiers essentiels sont manquants"
    exit 1
fi

# Fixer les terminaisons de ligne (problème Windows)
echo "🔧 Correction des terminaisons de ligne..."
for script in docker/scripts/start.sh scripts/backup.sh; do
    if [ -f "$script" ]; then
        # Détecter les terminaisons CRLF
        if file "$script" | grep -q "CRLF"; then
            echo "🔧 Correction de $script (CRLF → LF)"
            dos2unix "$script" 2>/dev/null || sed -i 's/\r$//' "$script"
        fi
        chmod +x "$script"
        echo "✅ $script vérifié"
    fi
done

# Vérifier phpdotenv
echo "🔍 Vérification des dépendances PHP..."
if ! grep -q "vlucas/phpdotenv" composer.json; then
    echo "❌ phpdotenv manquant dans composer.json"
    echo "La dépendance vlucas/phpdotenv est requise pour charger le fichier .env"
    exit 1
fi
echo "✅ phpdotenv trouvé"

# Vérifier la configuration .env
echo "🔍 Vérification de la configuration .env..."
if ! grep -q "DB_HOST=mysql" .env; then
    echo "⚠️  Configuration .env incomplète"
    echo "Vérifiez que .env contient les variables DB_HOST, MONGO_HOST, etc."
fi

# Vérifier la configuration Apache
echo "🔍 Vérification de la configuration Apache..."
if grep -q "/var/www/html/public" docker/apache/000-default.conf; then
    echo "✅ Apache DocumentRoot configuré correctement"
else
    echo "⚠️  DocumentRoot Apache pourrait nécessiter une vérification"
fi

echo ""
echo "🚀 Démarrage du déploiement..."
echo "Cette opération peut prendre quelques minutes..."

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down 2>/dev/null || true

# Nettoyer les images orphelines (optionnel)
echo "🧹 Nettoyage des images non utilisées..."
docker image prune -f 2>/dev/null || true

# Construire et démarrer
echo "🔨 Construction et démarrage des conteneurs..."
docker-compose up -d --build

echo "⏳ Attente du démarrage des services (30 secondes)..."
sleep 30

# Vérifier le statut des conteneurs
echo "📊 Statut des conteneurs:"
docker-compose ps

# Tester la connectivité
echo ""
echo "🌐 Test de connectivité..."

# Test de l'application principale
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ EcoRide accessible: http://localhost:8080"
else
    echo "❌ EcoRide non accessible"
    echo "📋 Logs de l'application:"
    docker-compose logs webapp --tail=10
    echo ""
    echo "💡 Conseils de dépannage:"
    echo "1. Vérifiez que le port 8080 n'est pas utilisé par un autre service"
    echo "2. Consultez les logs: docker-compose logs webapp"
    echo "3. Redémarrez: docker-compose restart webapp"
    exit 1
fi

# Test PHPMyAdmin
if curl -f http://localhost:8081 > /dev/null 2>&1; then
    echo "✅ PHPMyAdmin accessible: http://localhost:8081"
else
    echo "⚠️  PHPMyAdmin non accessible: http://localhost:8081"
fi

# Test Mongo Express
if curl -f http://localhost:8082 > /dev/null 2>&1; then
    echo "✅ Mongo Express accessible: http://localhost:8082"
else
    echo "⚠️  Mongo Express non accessible: http://localhost:8082"
fi

echo ""
echo "🎉 Déploiement terminé avec succès!"
echo "================================================"
echo "🌐 EcoRide:        http://localhost:8080"
echo "🗄️ PHPMyAdmin:     http://localhost:8081"
echo "   Utilisateur:    ecoride_mysql_admin"
echo "   Mot de passe:   mysqlDBmdp8_"
echo ""
echo "🍃 Mongo Express:  http://localhost:8082"
echo "   Utilisateur:    atm"
echo "   Mot de passe:   adm8_"
echo ""
echo "📋 Commandes utiles:"
echo "   Statut:         docker-compose ps"
echo "   Logs:           docker-compose logs webapp"
echo "   Redémarrer:     docker-compose restart"
echo "   Arrêter:        docker-compose down"
echo ""
echo "📖 Documentation complète: docker-config.md"
echo "================================================"