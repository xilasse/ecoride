#!/bin/sh

# Script de sauvegarde pour EcoRide
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

echo "Demarrage de la sauvegarde - $DATE"

# Creer le dossier de sauvegarde
mkdir -p "$BACKUP_DIR/mysql"

# Sauvegarde MySQL
echo "Sauvegarde MySQL..."
echo "Host: $MYSQL_HOST, User: $MYSQL_USER, Database: $MYSQL_DATABASE"
mysqldump -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD --single-transaction --no-tablespaces $MYSQL_DATABASE > "$BACKUP_DIR/mysql/ecoride_${DATE}.sql"

if [ $? -eq 0 ]; then
    echo "Sauvegarde MySQL reussie"
    # Compresser la sauvegarde
    gzip "$BACKUP_DIR/mysql/ecoride_${DATE}.sql"
else
    echo "Echec de la sauvegarde MySQL"
fi

# Nettoyage des anciennes sauvegardes (garde 7 jours)
find "$BACKUP_DIR" -name "ecoride_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "ecoride_*.tar.gz" -mtime +7 -delete

echo "Sauvegarde terminee - $DATE"