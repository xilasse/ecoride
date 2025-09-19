<?php
require_once '../vendor/autoload.php';

use EcoRide\Controllers\RideController;

// Configuration
$config = require_once '../config/config.php';

// Démarrer la session
session_start();

// Router simple
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

switch ($path) {
    case '/':
        include 'index.html';
        break;
    case '/covoiturages':
    case '/covoiturages.php':
        include 'covoiturages.html';
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

    default:
        http_response_code(404);
        echo '404 - Page non trouvée';
        break;
}
?>