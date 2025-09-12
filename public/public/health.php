<?php
header('Content-Type: application/json');

$health = [
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'environment' => $_ENV['APP_ENV'] ?? 'unknown'
];

// Test de base de données
try {
    $config = include '../config/config.php';
    $dbConfig = $config['database']['mysql'];
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};dbname={$dbConfig['dbname']}",
        $dbConfig['username'],
        $dbConfig['password']
    );
    $health['database'] = 'connected';
} catch (Exception $e) {
    $health['database'] = 'error: ' . $e->getMessage();
    $health['status'] = 'error';
    http_response_code(500);
}

echo json_encode($health, JSON_PRETTY_PRINT);
?>