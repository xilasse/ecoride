# Fix: Bouton Détails des Covoiturages

## Problème identifié
Le bouton "Détails" dans `covoiturages.html` ne fonctionnait pas car la fonction `viewRideDetails()` utilisait une variable `ridesDetailsData` qui n'existait pas et ne récupérait pas les données depuis la base de données.

## Solution implémentée

### 1. Nouveau endpoint API
**Fichier**: `src/Controllers/RideController.php`
- Ajout de la méthode `getRideDetails($rideId)` (lignes 169-214)
- Récupère tous les détails d'un ride depuis la base de données
- Inclut les informations du conducteur, du véhicule et du trajet
- Endpoint: `GET /api/rides/{id}`

### 2. Router mis à jour
**Fichier**: `public/index.php`
- Ajout du pattern matching pour `/api/rides/{id}` (lignes 26-30)
- Route dynamique qui capture l'ID du ride et appelle `getRideDetails()`

### 3. Frontend mis à jour
**Fichier**: `public/search.js`
- Fonction `viewRideDetails()` modifiée pour être asynchrone (lignes 317-347)
- Récupère maintenant les données depuis l'API au lieu d'une variable statique
- Ajout de la fonction `transformRideDataForModal()` (lignes 350-401)
- Transforme les données de l'API au format attendu par la modale

## Fonctionnalités
✅ Récupère les détails d'un ride depuis la base de données MySQL
✅ Affiche les informations du conducteur (nom, email, bio)
✅ Affiche les détails du véhicule (marque, modèle, couleur, type de carburant)
✅ Affiche les détails du trajet (départ, arrivée, durée, prix, places disponibles)
✅ Gère les erreurs de connexion et les rides non trouvés
✅ Compatible avec Docker local et Railway

## Configuration requise

### Docker Local
- `DB_HOST=mysql` (nom du service Docker)
- Port: `3306`

### Railway
La configuration `database.php` gère automatiquement:
- `MYSQL_PRIVATE_URL` (priorité)
- `DATABASE_PRIVATE_URL`
- `MYSQL_URL`
- Variables individuelles (MYSQLHOST, MYSQLPORT, etc.)

## Test

### Docker Local
```bash
# Démarrer les conteneurs
docker-compose up -d

# Tester l'API
curl http://localhost:8080/api/rides/1

# Accéder à l'interface
http://localhost:8080/covoiturages.html
```

### Railway
L'application utilise automatiquement les variables d'environnement Railway:
- `MYSQL_PRIVATE_URL` pour la connexion à la base de données
- Les logs de connexion sont disponibles dans les logs Railway

## Structure des données

### Requête API
```
GET /api/rides/{id}
```

### Réponse
```json
{
  "success": true,
  "ride": {
    "id": 1,
    "driver_name": "MarieDriveGreen",
    "driver_email": "marie.dupont@email.com",
    "driver_bio": null,
    "departure_city": "Paris",
    "arrival_city": "Lyon",
    "departure_datetime": "2025-10-05 14:00:00",
    "price_per_seat": "35.00",
    "available_seats": 3,
    "brand": "Tesla",
    "model": "Model 3",
    "color": "Blanche",
    "fuel_type": "electrique",
    "is_ecological": 1,
    ...
  }
}
```

## Améliorations futures
- [ ] Ajouter une table `ratings` pour les notes des conducteurs
- [ ] Ajouter une table `reviews` pour les avis des passagers
- [ ] Implémenter le chargement des avis dans la modale
- [ ] Ajouter des photos du conducteur et du véhicule

## Notes techniques
- La fonction utilise `async/await` pour les appels API
- Gestion d'erreurs avec `try/catch`
- Spinner de chargement affiché pendant la requête
- Notifications utilisateur en cas d'erreur
