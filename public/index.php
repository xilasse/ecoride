<?php
require_once '../vendor/autoload.php';

use EcoRide\Controllers\RideController;
use EcoRide\Controllers\AuthController;

// Configuration
$config = require_once '../config/config.php';

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
        $controller = new RideController($config);
        $controller->createRide();
        break;
    case '/api/rides':
        $controller = new RideController($config);
        $controller->getRides();
        break;
    case '/api/rides/search':
        $controller = new RideController($config);
        $controller->searchRides();
        break;
    case '/api/rides/details':
        $controller = new RideController($config);
        $controller->getRideDetails();
        break;

    // Auth Routes
    case '/api/auth/login':
        $controller = new AuthController($config);
        $controller->login();
        break;
    case '/api/auth/register':
        $controller = new AuthController($config);
        $controller->register();
        break;
    case '/api/auth/logout':
        $controller = new AuthController($config);
        $controller->logout();
        break;
    case '/api/auth/profile':
        $controller = new AuthController($config);
        $controller->getProfile();
        break;
    case '/api/auth/session':
        $controller = new AuthController($config);
        $controller->checkSession();
        break;

    // Test DB endpoint
    case '/api/test/db':
        header('Content-Type: application/json');
        try {
            $controller = new AuthController($config);
            $db = $controller->getDatabase();
            if ($db) {
                $stmt = $db->query("SELECT 1 as test");
                $result = $stmt->fetch();
                echo json_encode([
                    'success' => true,
                    'message' => 'Base de données accessible',
                    'test_result' => $result['test']
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Base de données non accessible'
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erreur DB: ' . $e->getMessage()
            ]);
        }
        break;

    default:
        http_response_code(404);
        echo '404 - Page non trouvée';
        break;
}
?>