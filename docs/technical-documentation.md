# Documentation Technique - EcoRide
## Plateforme de Covoiturage Écologique

---

## 1. Vue d'ensemble du Projet

### 1.1 Description
EcoRide est une plateforme web de covoiturage axée sur l'écologie, permettant de connecter des chauffeurs et des passagers pour réduire l'impact environnemental des déplacements en voiture. La plateforme privilégie les véhicules électriques et propose un système de crédits pour les transactions.

### 1.2 Objectifs
- Réduire l'empreinte carbone des déplacements
- Proposer une solution économique de transport
- Créer une communauté de covoitureurs responsables
- Encourager l'utilisation de véhicules électriques

### 1.3 Utilisateurs Cibles
- **Visiteurs** : Consultation publique des trajets
- **Utilisateurs** : Comptes créés (passagers/chauffeurs)
- **Employés** : Modération et support client
- **Administrateurs** : Gestion complète de la plateforme

---

## 2. Architecture Technique

### 2.1 Stack Technologique

#### Front-end
- **HTML5** : Structure sémantique
- **CSS3** : Styles avec variables CSS et animations
- **Bootstrap 5.3.0** : Framework responsive
- **JavaScript ES6+** : Interactivité côté client
- **Font Awesome 6.4.0** : Icônes
- **Chart.js** : Graphiques pour l'administration

#### Back-end
- **PHP 8.x** : Langage serveur
- **Architecture MVC** : Séparation des préoccupations
- **PDO** : Accès sécurisé aux données
- **Composer** : Gestionnaire de dépendances

#### Bases de Données
- **MySQL 8.0** : Base relationnelle principale
- **MongoDB** : Stockage NoSQL (préférences, logs)

#### Déploiement
- **Git** : Contrôle de version
- **GitHub** : Hébergement du code
- **Heroku/Railway** : Hébergement applicatif
- **JawsDB/MongoDB Atlas** : Bases de données cloud

### 2.2 Architecture Système

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Front-end     │    │    Back-end     │    │   Databases     │
│                 │    │                 │    │                 │
│ - HTML/CSS/JS   │◄──►│ - PHP (MVC)     │◄──►│ - MySQL         │
│ - Bootstrap     │    │ - API REST      │    │ - MongoDB       │
│ - Chart.js      │    │ - Authentif.    │    │ - Redis (cache) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 3. Configuration de l'Environnement

### 3.1 Prérequis
- PHP >= 8.0
- MySQL >= 8.0
- MongoDB >= 5.0
- Composer
- Git
- Serveur web (Apache/Nginx)

### 3.2 Installation Locale

#### Étape 1 : Clonage du projet
```bash
git clone https://github.com/username/ecoride.git
cd ecoride
```

#### Étape 2 : Installation des dépendances
```bash
composer install
npm install # Pour les assets front-end
```

#### Étape 3 : Configuration de la base de données
```bash
# Créer la base MySQL
mysql -u root -p
CREATE DATABASE ecoride_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Importer la structure
mysql -u root -p ecoride_db < sql/structure.sql
mysql -u root -p ecoride_db < sql/data.sql
```

#### Étape 4 : Configuration MongoDB
```bash
# Démarrer MongoDB
mongod

# Créer la collection (automatique à la première insertion)
```

#### Étape 5 : Configuration environnement
```php
// config/config.php
<?php
return [
    'database' => [
        'mysql' => [
            'host' => 'localhost',
            'dbname' => 'ecoride_db',
            'username' => 'root',
            'password' => '',
        ],
        'mongodb' => [
            'uri' => 'mongodb://localhost:27017',
            'database' => 'ecoride_nosql'
        ]
    ],
    'app' => [
        'base_url' => 'http://localhost:8000',
        'secret_key' => 'your-secret-key-here',
        'environment' => 'development'
    ]
];
```

---

## 4. Modèle Conceptuel de Données

### 4.1 Schéma Relationnel (MySQL)

#### Entités Principales
- **users** : Gestion des comptes utilisateurs
- **vehicles** : Véhicules des chauffeurs
- **rides** : Covoiturages proposés
- **bookings** : Réservations effectuées
- **reviews** : Système d'avis modérés

#### Relations Clés
- Un utilisateur peut avoir plusieurs véhicules (1:N)
- Un trajet appartient à un chauffeur et utilise un véhicule (N:1)
- Un trajet peut avoir plusieurs réservations (1:N)
- Une réservation peut générer plusieurs avis (1:N)

### 4.2 Diagramme Entité-Relation

```
[users] ──────┐
   │          │
   │ 1        │ 1
   │          │
   ▼ N        ▼ N
[vehicles] [rides] ────┐
   │          │       │
   │ 1        │ 1     │ 1
   │          │       │
   ▼ N        ▼ N     ▼ N
[rides]   [bookings] [reviews]
```

### 4.3 Modèle NoSQL (MongoDB)

#### Collections
```javascript
// user_preferences
{
  _id: ObjectId,
  user_id: 123,
  preferences: {
    smoking_allowed: false,
    pets_allowed: true,
    music_style: "Pop, Jazz",
    conversation_level: "Modérée"
  },
  created_at: ISODate,
  updated_at: ISODate
}

// activity_logs
{
  _id: ObjectId,
  user_id: 123,
  action: "ride_booked",
  details: {
    ride_id: 456,
    seats: 2,
    total_price: 70.00
  },
  ip_address: "192.168.1.1",
  timestamp: ISODate
}
```

---

## 5. Diagrammes UML

### 5.1 Diagramme de Cas d'Usage

```
     Visiteur
        │
    ┌───┼───┐
    │   │   │
    ▼   ▼   ▼
 Consulter Rechercher Se connecter
 trajets   trajets   /S'inscrire
    │       │          │
    │       │          ▼
    │       │      Utilisateur
    │       │          │
    │       │      ┌───┼───┐
    │       │      │   │   │
    │       │      ▼   ▼   ▼
    │       │   Réserver Proposer Gérer
    │       │   trajet   trajet  profil
    │       │      │       │      │
    └───────┼──────┘       │      │
            │              │      │
            ▼              ▼      ▼
        Employé        Chauffeur  │
            │              │      │
        ┌───┼───┐          │      │
        │   │   │          │      │
        ▼   ▼   ▼          ▼      ▼
     Modérer Gérer    Démarrer Historique
     avis   litiges   trajet   personnel
        │       │        │        │
        │       │        │        │
        ▼       ▼        ▼        ▼
   Administrateur   [Système de   [Gestion
        │           notification] utilisateur]
    ┌───┼───┐
    │   │   │
    ▼   ▼   ▼
  Gérer Stats Suspendre
comptes    comptes
```

### 5.2 Diagramme de Séquence : Réservation d'un Trajet

```
Utilisateur    Interface    Contrôleur    Modèle    Database
    │              │            │           │          │
    │──Clic "Réserver"──►       │           │          │
    │              │            │           │          │
    │              │────Vérifier crédits────►          │
    │              │            │           │──SELECT──►
    │              │            │           │◄─Result──│
    │              │            │           │          │
    │              │────Vérifier places─────►          │
    │              │            │           │──SELECT──►
    │              │            │           │◄─Result──│
    │              │            │           │          │
    │              │◄───Confirmation───────│           │
    │◄─Popup confirm─│          │           │          │
    │              │            │           │          │
    │──Confirmer─────►          │           │          │
    │              │            │           │          │
    │              │────Créer réservation───►          │
    │              │            │           │──INSERT──►
    │              │            │           │──UPDATE──► (crédits)
    │              │            │           │──UPDATE──► (places)
    │              │            │           │◄─Success─│
    │              │            │           │          │
    │              │◄───Succès──────────────│          │
    │◄─Notification─│            │           │          │
```

---

## 6. Sécurité

### 6.1 Authentification et Autorisation

#### Hachage des Mots de Passe
```php
// Lors de l'inscription
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Lors de la connexion
if (password_verify($password, $hashedPassword)) {
    // Connexion réussie
}
```

#### Gestion des Sessions
```php
// Configuration sécurisée des sessions
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.use_strict_mode', 1);

// Régénération d'ID de session
session_regenerate_id(true);
```

### 6.2 Protection CSRF
```php
// Génération du token
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Vérification
if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    throw new SecurityException('Token CSRF invalide');
}
```

### 6.3 Validation et Échappement

#### Validation des Données
```php
class Validator {
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function validatePrice($price) {
        return is_numeric($price) && $price >= 0 && $price <= 1000;
    }
    
    public static function sanitizeString($input) {
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
}
```

#### Requêtes Préparées
```php
$stmt = $pdo->prepare("SELECT * FROM rides WHERE departure_city = ? AND arrival_city = ?");
$stmt->execute([$departureCity, $arrivalCity]);
```

### 6.4 Protection XSS et Injection SQL
- Utilisation systématique de `htmlspecialchars()`
- Requêtes préparées avec PDO
- Validation côté serveur de toutes les données
- Whitelist des caractères autorisés

---

## 7. API et Endpoints

### 7.1 Structure RESTful

#### Authentification
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me
```

#### Covoiturages
```
GET    /api/rides              # Liste des trajets
GET    /api/rides/{id}         # Détail d'un trajet
POST   /api/rides              # Créer un trajet
PUT    /api/rides/{id}         # Modifier un trajet
DELETE /api/rides/{id}         # Supprimer un trajet
GET    /api/rides/search       # Rechercher des trajets
```

#### Réservations
```
GET    /api/bookings           # Mes réservations
POST   /api/bookings           # Créer une réservation
PUT    /api/bookings/{id}      # Modifier une réservation
DELETE /api/bookings/{id}      # Annuler une réservation
```

### 7.2 Format des Réponses JSON

#### Succès
```json
{
  "success": true,
  "data": {
    "id": 1,
    "departure_city": "Paris",
    "arrival_city": "Lyon",
    "price": 35.00
  },
  "message": "Trajet créé avec succès"
}
```

#### Erreur
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": {
      "price": "Le prix doit être supérieur à 0"
    }
  }
}
```

---

## 8. Gestion des États et Workflow

### 8.1 États des Covoiturages

```
[Créé] ──réservation──► [Confirmé] ──démarrage──► [En cours] ──arrivée──► [Terminé]
  │                         │                         │                      │
  └────annulation───► [Annulé]                       │                      │
                              └─────────annulation────┼──► [Annulé]          │
                                                      │                      │
                                              problème│                      │
                                                      ▼                      │
                                                 [Litige] ◄─────problème─────┘
```

### 8.2 Workflow de Modération des Avis

```
[Soumis] ──validation employé──► [Approuvé] ──► [Publié]
   │                                  │
   └──refus employé──► [Rejeté]       │
                           │          │
                           ▼          ▼
                     [Archivé]   [Visible publiquement]
```

---

## 9. Performance et Optimisation

### 9.1 Stratégies de Cache

#### Cache Redis
```php
// Cache des résultats de recherche
$cacheKey = "search:" . md5($departure . $arrival . $date);
$redis->setex($cacheKey, 300, json_encode($results)); // 5 minutes
```

#### Cache de Requêtes
```php
// Cache des statistiques
$cacheKey = "stats:daily:" . date('Y-m-d');
if (!$redis->exists($cacheKey)) {
    $stats = $this->calculateDailyStats();
    $redis->setex($cacheKey, 3600, json_encode($stats)); // 1 heure
}
```

### 9.2 Optimisation Base de Données

#### Index Composites
```sql
-- Index pour la recherche de trajets
CREATE INDEX idx_ride_search ON rides (departure_city, arrival_city, departure_datetime, available_seats);

-- Index pour les statistiques
CREATE INDEX idx_booking_stats ON bookings (booking_date, booking_status);
```

#### Pagination
```php
// Pagination efficace
$offset = ($page - 1) * $limit;
$sql = "SELECT * FROM rides WHERE ... LIMIT ? OFFSET ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$limit, $offset]);
```

### 9.3 Optimisation Front-end

#### Minification et Compression
- Compression Gzip activée
- Minification CSS/JS en production
- Sprite d'icônes pour réduire les requêtes HTTP
- Lazy loading des images

#### CDN et Cache Navigateur
```html
<!-- Cache du navigateur -->
<link rel="stylesheet" href="assets/css/style.min.css?v=1.2.3">
<script src="assets/js/app.min.js?v=1.2.3"></script>
```

---

## 10. Déploiement

### 10.1 Environnements

#### Développement
```bash
# Variables d'environnement
export APP_ENV=development
export DB_HOST=localhost
export DB_NAME=ecoride_dev
export REDIS_URL=redis://localhost:6379
```

#### Production
```bash
# Variables d'environnement Heroku
heroku config:set APP_ENV=production
heroku config:set DATABASE_URL=mysql://user:pass@host:port/dbname
heroku config:set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
heroku config:set REDIS_URL=redis://user:pass@host:port
```

### 10.2 Pipeline de Déploiement

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.1'
        
    - name: Install dependencies
      run: composer install --no-dev --optimize-autoloader
      
    - name: Run tests
      run: ./vendor/bin/phpunit
      
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "ecoride-app"
        heroku_email: "dev@ecoride.fr"
```

### 10.3 Configuration Serveur

#### Apache .htaccess
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# Sécurité
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

#### Nginx
```nginx
server {
    listen 80;
    server_name ecoride.fr www.ecoride.fr;
    root /var/www/ecoride/public;
    
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
    }
    
    # Cache statique
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 11. Monitoring et Logs

### 11.1 Logging

#### Configuration
```php
// Logger personnalisé
class Logger {
    public static function info($message, $context = []) {
        $log = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => 'INFO',
            'message' => $message,
            'context' => $context,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        
        file_put_contents('logs/app.log', json_encode($log) . "\n", FILE_APPEND);
    }
}
```

### 11.2 Métriques de Performance

#### Indicateurs Clés
- Temps de réponse des pages
- Taux de conversion (inscription → première réservation)
- Nombre de trajets créés/réservés par jour
- Taux d'annulation
- Satisfaction utilisateurs (notes moyennes)

#### Monitoring MongoDB
```javascript
// Requêtes lentes
db.setProfilingLevel(2, { slowms: 100 });

// Index de performance
db.user_preferences.createIndex({ "user_id": 1 });
db.activity_logs.createIndex({ "timestamp": -1 });
```

---

## 12. Tests

### 12.1 Tests Unitaires

```php
// tests/UserTest.php
class UserTest extends PHPUnit\Framework\TestCase {
    public function testUserRegistration() {
        $user = new User();
        $result = $user->register([
            'email' => 'test@example.com',
            'password' => 'SecurePass123!',
            'pseudo' => 'TestUser'
        ]);
        
        $this->assertTrue($result['success']);
        $this->assertEquals(20, $user->getCredits());
    }
}
```

### 12.2 Tests d'Intégration

```php
// tests/BookingTest.php
class BookingTest extends PHPUnit\Framework\TestCase {
    public function testCompleteBookingWorkflow() {
        // Créer un trajet
        $ride = $this->createTestRide();
        
        // Effectuer une réservation
        $booking = new Booking();
        $result = $booking->create($ride->id, $this->testUser->id, 2);
        
        // Vérifications
        $this->assertTrue($result['success']);
        $this->assertEquals(3, $ride->getAvailableSeats()); // 5-2=3
        $this->assertEquals(20-70, $this->testUser->getCredits()); // 20-35*2
    }
}
```

### 12.3 Tests End-to-End

```javascript
// cypress/integration/booking_flow.spec.js
describe('Processus de réservation', () => {
  it('Permet de réserver un trajet', () => {
    cy.visit('/covoiturages.php');
    cy.get('#departure').type('Paris');
    cy.get('#arrival').type('Lyon');
    cy.get('#date').type('2025-09-15');
    cy.get('form').submit();
    
    cy.get('.ride-card').first().find('.btn-detail').click();
    cy.get('#bookRideBtn').click();
    cy.get('#confirmBooking').click();
    
    cy.contains('Réservation confirmée');
  });
});
```

---

## 13. Maintenance et Evolution

### 13.1 Versioning

#### Stratégie Git Flow
- **main** : Code de production
- **develop** : Intégration des fonctionnalités
- **feature/*** : Développement de fonctionnalités
- **hotfix/*** : Corrections urgentes production

#### Nomenclature des Versions
- **v1.0.0** : Version initiale
- **v1.1.0** : Nouvelles fonctionnalités
- **v1.0.1** : Corrections de bugs

### 13.2 Migration de Données

```php
// migrations/001_add_rating_system.php
class AddRatingSystemMigration {
    public function up() {
        $sql = "
            ALTER TABLE users 
            ADD COLUMN rating_average DECIMAL(2,1) DEFAULT 0.0,
            ADD COLUMN total_ratings INT DEFAULT 0
        ";
        
        $this->pdo->exec($sql);
    }
    
    public function down() {
        $sql = "
            ALTER TABLE users 
            DROP COLUMN rating_average,
            DROP COLUMN total_ratings
        ";
        
        $this->pdo->exec($sql);
    }
}
```

### 13.3 Évolutions Prévues

#### Phase 2 (v1.1.0)
- Application mobile native
- Système de cashback
- Intégration GPS en temps réel
- Chat intégré chauffeur/passagers

#### Phase 3 (v1.2.0)
- Intelligence artificielle pour matching
- Prédiction de demande
- Système de fidélité avancé
- API publique pour partenaires

---

## 14. Annexes

### 14.1 Glossaire

- **Crédit** : Monnaie virtuelle pour payer les trajets
- **Trajet écologique** : Effectué avec véhicule électrique
- **Modération** : Validation manuelle du contenu par employés
- **Litige** : Conflit nécessitant intervention employé

### 14.2 Contacts et Ressources

#### Équipe Technique
- **Lead Developer** : José (Directeur Technique)
- **Full Stack Developer** : [Votre nom]

#### Documentation Externe
- [PHP Documentation](https://www.php.net/docs.php)
- [MySQL Reference](https://dev.mysql.com/doc/)
- [Bootstrap Documentation](https://getbootstrap.com/docs/)

#### Outils de Développement
- **IDE** : VS Code / PhpStorm
- **Database** : phpMyAdmin / MySQL Workbench
- **API Testing** : Postman
- **Monitoring** : New Relic / DataDog

---

*Documentation générée le 08/09/2025*
*Version 1.0.0 - EcoRide Technical Team*