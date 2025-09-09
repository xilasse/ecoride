<?php
require_once '../vendor/autoload.php';

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
    default:
        http_response_code(404);
        echo '404 - Page non trouvée';
        break;
}
?>