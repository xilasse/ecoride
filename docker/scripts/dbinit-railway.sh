#!/bin/bash
set -e
set -x # Activer le mode débogage

# Valeurs par défaut et validation
: ${PORT:=80}
: ${MYSQLHOST:?Erreur : MYSQLHOST non défini}
: ${MYSQLUSER:?Erreur : MYSQLUSER non défini}
: ${MYSQLPASSWORD:?Erreur : MYSQLPASSWORD non défini}
: ${MYSQLDATABASE:?Erreur : MYSQLDATABASE non défini}

# Tester la connectivité réseau
ping -c 4 ${MYSQLHOST} || echo "Impossible de ping ${MYSQLHOST}"

# Attendre que MySQL soit prêt
for i in {1..120}; do
if mysql -h${MYSQLHOST} -u${MYSQLUSER} -p${MYSQLPASSWORD} --skip-ssl -e "SELECT 1" >/dev/null 2>&1; then
    echo "MySQL prêt, exécution du schéma..."

    # Compter le nombre de tables dans la base de données
    #TABLE_COUNT=$(mysql -h${MYSQLHOST} -u${MYSQLUSER} -p${MYSQLPASSWORD} --skip-ssl -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${MYSQLDATABASE}'" | grep -v "COUNT" | awk '{print $1}')
    TABLE_COUNT=0
    if [ "$TABLE_COUNT" -eq 0 ]; then
      echo "Base de données vide, exécution du schéma..."
      mysql -h${MYSQLHOST} -u${MYSQLUSER} -p${MYSQLPASSWORD} --skip-ssl ${MYSQLDATABASE} < /sql/structure.sql
      rm /sql/structure.sql
      echo "Schéma appliqué avec succès."
    else
      echo "Base de données non vide (contient $TABLE_COUNT tables), saut de l'exécution du schéma."
    fi
    break
  else
    echo "Tentative $i : Échec de connexion à MySQL. Erreur : $(mysql -h${MYSQLHOST} -u${MYSQLUSER} -p${MYSQLPASSWORD} -e "SELECT 1" 2>&1)"
  fi
  if [ $i -eq 120 ]; then
    echo "Erreur : Impossible de se connecter à MySQL après 120 tentatives."
    exit 1
  fi
  sleep 2
done

exec apache2-foreground