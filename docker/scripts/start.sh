#!/bin/bash

# Script de démarrage pour EcoRide

echo "🚀 Démarrage d'EcoRide..."

# Install netcat for connection testing
apt-get update && apt-get install -y netcat-openbsd

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