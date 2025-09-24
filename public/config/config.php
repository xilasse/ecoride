<?php
// Load .env file for local/Docker deployment - Version sans Composer
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Configuration pour Railway (priorité si DATABASE_URL existe)
// Railway peut utiliser getenv() ou $_ENV
$databaseUrl = $_ENV['DATABASE_URL'] ?? $_ENV['MYSQL_URL'] ??
               getenv('DATABASE_URL') ?: getenv('MYSQL_URL') ?: null;

// Fallback vers variables individuelles Railway si URL interne ne fonctionne pas
if (!$databaseUrl && getenv('RAILWAY_ENVIRONMENT')) {
    $mysqlHost = getenv('MYSQLHOST');
    $mysqlPort = getenv('MYSQLPORT');
    $mysqlUser = getenv('MYSQLUSER');
    $mysqlPassword = getenv('MYSQLPASSWORD');
    $mysqlDatabase = getenv('MYSQLDATABASE');

    if ($mysqlHost && $mysqlUser && $mysqlPassword && $mysqlDatabase) {
        $databaseUrl = "mysql://{$mysqlUser}:{$mysqlPassword}@{$mysqlHost}:{$mysqlPort}/{$mysqlDatabase}";
        error_log('Railway: Utilisation des variables individuelles pour construire DATABASE_URL');
        error_log('Railway: URL construite avec host externe: ' . $mysqlHost);
    }
}

// Debug pour Railway
if (getenv('RAILWAY_ENVIRONMENT')) {
    error_log('=== CONFIG.PHP DEBUG RAILWAY ===');
    error_log('DATABASE_URL via $_ENV: ' . ($_ENV['DATABASE_URL'] ?? 'NON DÉFINI'));
    error_log('MYSQL_URL via $_ENV: ' . ($_ENV['MYSQL_URL'] ?? 'NON DÉFINI'));
    error_log('DATABASE_URL via getenv(): ' . (getenv('DATABASE_URL') ?: 'NON DÉFINI'));
    error_log('MYSQL_URL via getenv(): ' . (getenv('MYSQL_URL') ?: 'NON DÉFINI'));
    error_log('Final databaseUrl: ' . ($databaseUrl ?? 'NON DÉFINI'));
    error_log('================================');
}

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

    // Log des valeurs après parsing
    if (getenv('RAILWAY_ENVIRONMENT')) {
        error_log('=== PARSING RÉSULTATS ===');
        error_log('DatabaseUrl original: ' . $databaseUrl);
        error_log('Parsed host: ' . ($parsedUrl['host'] ?? 'NON DÉFINI'));
        error_log('Parsed dbname: ' . (ltrim($parsedUrl['path'], '/') ?? 'NON DÉFINI'));
        error_log('Parsed username: ' . ($parsedUrl['user'] ?? 'NON DÉFINI'));
        error_log('Parsed password: ' . (isset($parsedUrl['pass']) ? 'DÉFINI' : 'NON DÉFINI'));
        error_log('Parsed port: ' . ($parsedUrl['port'] ?? '3306 par défaut'));
        error_log('Final dbConfig host: ' . $dbConfig['host']);
        error_log('Final dbConfig port: ' . $dbConfig['port']);
        error_log('========================');
    }
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