<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

use EcoRide\Controllers\RideController;
use EcoRide\Controllers\AuthController;

// Créer l'instance de base de données
$db = Database::getInstance();

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

// Check for specific ride endpoints FIRST (before generic route)

// Check for ride edit endpoint
if (preg_match('/^\/api\/rides\/(\d+)\/edit$/', $path, $matches)) {
    error_log("DEBUG: Route edit détectée pour ID: " . $matches[1]);
    $controller = new RideController($db);
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getRideForEdit($matches[1]);
    } else {
        $controller->updateRide($matches[1]);
    }
    exit;
}

// Check for ride passengers endpoint
if (preg_match('/^\/api\/rides\/(\d+)\/passengers$/', $path, $matches)) {
    error_log("DEBUG: Route passengers détectée pour ID: " . $matches[1]);
    $controller = new RideController($db);
    $controller->getRidePassengers($matches[1]);
    exit;
}

// Check for ride cancel endpoint
if (preg_match('/^\/api\/rides\/(\d+)\/cancel$/', $path, $matches)) {
    $controller = new RideController($db);
    $controller->cancelRide($matches[1]);
    exit;
}

// Check for ride validate payments endpoint
if (preg_match('/^\/api\/rides\/(\d+)\/validate-payments$/', $path, $matches)) {
    $controller = new RideController($db);
    $controller->validateRidePayments($matches[1]);
    exit;
}

// Check for generic ride details (MUST BE LAST)
if (preg_match('/^\/api\/rides\/(\d+)$/', $path, $matches)) {
    $controller = new RideController($db);
    $controller->getRideDetails($matches[1]);
    exit;
}

// Check for vehicle endpoints
if (preg_match('/^\/api\/vehicles\/(\d+)$/', $path, $matches)) {
    $controller = new \EcoRide\Controllers\VehicleController($db);
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $controller->deleteVehicle($matches[1]);
    } else {
        $controller->getVehicle($matches[1]);
    }
    exit;
}

// Check for reservation cancel endpoint
if (preg_match('/^\/api\/reservations\/(\d+)\/cancel$/', $path, $matches)) {
    $controller = new \EcoRide\Controllers\ReservationController($db);
    $controller->cancelReservation($matches[1]);
    exit;
}

// Check for reservation release escrow endpoint
if (preg_match('/^\/api\/reservations\/(\d+)\/release-escrow$/', $path, $matches)) {
    $controller = new \EcoRide\Controllers\ReservationController($db);
    $controller->releaseEscrow($matches[1]);
    exit;
}

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

    // API Routes - Rides
    case '/api/rides/create':
        $controller = new RideController($db);
        $controller->createRide();
        break;
    case '/api/rides':
        $controller = new RideController($db);
        $controller->getRides();
        break;
    case '/api/rides/user':
        $controller = new RideController($db);
        $controller->getUserRides();
        break;
    case '/api/rides/search':
        $controller = new RideController($db);
        $controller->searchRides();
        break;

    // API Routes - Vehicles
    case '/api/vehicles/user':
        $controller = new \EcoRide\Controllers\VehicleController($db);
        $controller->getUserVehicles();
        break;

    // API Routes - Reservations
    case '/api/reservations/create':
        $controller = new \EcoRide\Controllers\ReservationController($db);
        $controller->createReservation();
        break;
    case '/api/reservations/user':
        $controller = new \EcoRide\Controllers\ReservationController($db);
        $controller->getUserReservations();
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
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $controller->updateProfile();
        } else {
            $controller->getProfile();
        }
        break;
    case '/api/auth/session':
        $controller = new AuthController($db);
        $controller->checkSession();
        break;
    case '/api/auth/upload-avatar':
        $controller = new AuthController($db);
        $controller->uploadAvatar();
        break;
    case '/api/auth/credits/transactions':
        $controller = new AuthController($db);
        $controller->getCreditsTransactions();
        break;
    case '/api/auth/credits/purchase':
        $controller = new AuthController($db);
        $controller->purchaseCredits();
        break;

    default:
        http_response_code(404);
        echo '404 - Page non trouvée';
        break;
}
?>
