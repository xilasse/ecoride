#!/bin/sh

# Script de sauvegarde pour EcoRide
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

echo "= Démarrage de la sauvegarde - $DATE"

# Créer le dossier de sauvegarde
mkdir -p "$BACKUP_DIR/mysql" "$BACKUP_DIR/mongodb"

# Sauvegarde MySQL
echo "=¾ Sauvegarde MySQL..."
mysqldump -h$MYSQL_HOST -u$MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > "$BACKUP_DIR/mysql/ecoride_${DATE}.sql"

if [ $? -eq 0 ]; then
    echo " Sauvegarde MySQL réussie"
    # Compresser la sauvegarde
    gzip "$BACKUP_DIR/mysql/ecoride_${DATE}.sql"
else
    echo "L Échec de la sauvegarde MySQL"
fi

# Sauvegarde MongoDB
echo "=¾ Sauvegarde MongoDB..."
mongodump --host $MONGO_HOST:27017 --username $MONGO_USER --password $MONGO_PASSWORD --authenticationDatabase admin --db ecoride_nosql --out "$BACKUP_DIR/mongodb/ecoride_${DATE}"

if [ $? -eq 0 ]; then
    echo " Sauvegarde MongoDB réussie"
    # Compresser la sauvegarde
    cd "$BACKUP_DIR/mongodb"
    tar -czf "ecoride_${DATE}.tar.gz" "ecoride_${DATE}/"
    rm -rf "ecoride_${DATE}/"
else
    echo "L Échec de la sauvegarde MongoDB"
fi

# Nettoyage des anciennes sauvegardes (garde 7 jours)
find "$BACKUP_DIR" -name "ecoride_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "ecoride_*.tar.gz" -mtime +7 -delete

echo " Sauvegarde terminée - $DATE"