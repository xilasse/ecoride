<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '../config/database.php';

// Charger les variables d'environnement
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->load();
}

// Test de connexion à la base de données
try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // Créer une table de test si elle n'existe pas
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $conn->exec($sql);
    
    $message = "✅ Connexion à MySQL réussie!";
    
    // Récupérer les utilisateurs
    $stmt = $conn->query("SELECT * FROM users");
    $users = $stmt->fetchAll();
    
} catch (Exception $e) {
    $message = "❌ Erreur: " . $e->getMessage();
    $users = [];
}

use EcoRide\Controllers\RideController;
use EcoRide\Controllers\AuthController;

// Configuration des sessions
ini_set('session.cookie_lifetime', 86400); // 24 heures
ini_set('session.cookie_httponly', 0); // Permettre JavaScript en dev
ini_set('session.use_only_cookies', 1); // Sécurité
ini_set('session.cookie_secure', 0); // Pas de HTTPS requis en dev
ini_set('session.cookie_samesite', 'Lax'); // Permettre cross-origin

// Démarrer la session
session_start();

// Router simple
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

switch ($path) {
    case '/':
    case '/index.html':
        include 'index.html';
        break;
    case '/covoiturages':
    case '/covoiturages.php':
    case '/covoiturages.html':
        include 'covoiturages.html';
        break;
    case '/connexion':
    case '/connexion.html':
        include 'connexion.html';
        break;
    case '/contact':
    case '/contact.html':
        include 'contact.html';
        break;
    case '/profil':
    case '/profil.html':
        include 'profil.html';
        break;

    // API Routes
    case '/api/rides/create':
        $controller = new RideController($db);
        $controller->createRide();
        break;
    case '/api/rides':
        $controller = new RideController($db);
        $controller->getRides();
        break;
    case '/api/rides/search':
        $controller = new RideController($db);
        $controller->searchRides();
        break;

    // Auth Routes
    case '/api/auth/login':
        $controller = new AuthController($db);
        $controller->login();
        break;
    case '/api/auth/register':
        $controller = new AuthController($db);
        $controller->register();
        break;
    case '/api/auth/logout':
        $controller = new AuthController($db);
        $controller->logout();
        break;
    case '/api/auth/profile':
        $controller = new AuthController($db);
        $controller->getProfile();
        break;
    case '/api/auth/session':
        $controller = new AuthController($db);
        $controller->checkSession();
        break;

    default:
        http_response_code(404);
        echo '404 - Page non trouvée';
        break;
}
?>