<?php
// Configuration pour Railway
$databaseUrl = $_ENV['DATABASE_URL'] ?? $_ENV['MYSQL_URL'] ?? null;

if ($databaseUrl) {
    $parsedUrl = parse_url($databaseUrl);
    $dbConfig = [
        'host' => $parsedUrl['host'],
        'dbname' => ltrim($parsedUrl['path'], '/'),
        'username' => $parsedUrl['user'],
        'password' => $parsedUrl['pass'],
        'port' => $parsedUrl['port'] ?? 3306
    ];
} else {
    // Configuration locale
    $dbConfig = [
        'host' => 'localhost',
        'dbname' => 'ecoride_db',
        'username' => 'root',
        'password' => '',
        'port' => 3306
    ];
}

return [
    'database' => [
        'mysql' => $dbConfig
    ],
    'app' => [
        'base_url' => $_ENV['RAILWAY_STATIC_URL'] ?? 'http://localhost:8000',
        'secret_key' => $_ENV['APP_SECRET'] ?? '1LfXNCsdTvpmGqcS+srg/XqOoivOHIaAv1kBADRHUHI=',
        'environment' => $_ENV['APP_ENV'] ?? 'development',
        'debug' => ($_ENV['DEBUG'] ?? 'true') === 'true'
    ]
];