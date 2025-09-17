<?php
// Load .env file for local/Docker deployment
if (file_exists(__DIR__ . '/../.env') && class_exists('Dotenv\Dotenv')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

// Configuration pour Railway (priorité si DATABASE_URL existe)
$databaseUrl = $_ENV['DATABASE_URL'] ?? $_ENV['MYSQL_URL'] ?? null;

if ($databaseUrl) {
    // Configuration Railway
    $parsedUrl = parse_url($databaseUrl);
    $dbConfig = [
        'host' => $parsedUrl['host'],
        'dbname' => ltrim($parsedUrl['path'], '/'),
        'username' => $parsedUrl['user'],
        'password' => $parsedUrl['pass'],
        'port' => $parsedUrl['port'] ?? 3306
    ];
} else {
    // Configuration locale/Docker via .env
    $dbConfig = [
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'dbname' => $_ENV['DB_NAME'] ?? 'ecoride_db',
        'username' => $_ENV['DB_USER'] ?? 'root',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
        'port' => $_ENV['DB_PORT'] ?? 3306
    ];
}

return [
    'database' => [
        'mysql' => $dbConfig
    ],
    'app' => [
        'base_url' => $_ENV['RAILWAY_STATIC_URL'] ?? $_ENV['APP_URL'] ?? 'http://localhost:8000',
        'secret_key' => $_ENV['APP_SECRET'] ?? '1LfXNCsdTvpmGqcS+srg/XqOoivOHIaAv1kBADRHUHI=',
        'environment' => $_ENV['APP_ENV'] ?? 'development',
        'debug' => ($_ENV['APP_DEBUG'] ?? $_ENV['DEBUG'] ?? 'true') === 'true'
    ],
    'redis' => [
        'host' => $_ENV['REDIS_HOST'] ?? 'localhost',
        'port' => $_ENV['REDIS_PORT'] ?? 6379,
        'password' => $_ENV['REDIS_PASSWORD'] ?? null
    ],
    'mail' => [
        'host' => $_ENV['MAIL_HOST'] ?? 'localhost',
        'port' => $_ENV['MAIL_PORT'] ?? 587,
        'username' => $_ENV['MAIL_USERNAME'] ?? null,
        'password' => $_ENV['MAIL_PASSWORD'] ?? null,
        'from_address' => $_ENV['MAIL_FROM_ADDRESS'] ?? 'noreply@ecoride.local',
        'from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'EcoRide'
    ],
    'credits' => [
        'initial' => $_ENV['INITIAL_CREDITS'] ?? 20,
        'platform_fee' => $_ENV['PLATFORM_FEE_CREDITS'] ?? 2
    ]
];