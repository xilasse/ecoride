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