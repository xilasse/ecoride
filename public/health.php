<?php
// Health check endpoint optimisé pour Railway et Docker local

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$startTime = microtime(true);

// Configuration du health check
$health = [
    'status' => 'ok',
    'timestamp' => date('c'),
    'environment' => getenv('APP_ENV') ?: 'unknown',
    'services' => [],
    'checks' => []
];

// Fonction utilitaire pour les timeouts courts
function quickCheck($callback, $service) {
    $start = microtime(true);
    try {
        $result = $callback();
        return [
            'status' => 'ok',
            'duration' => round((microtime(true) - $start) * 1000, 2) . 'ms',
            'details' => $result
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'duration' => round((microtime(true) - $start) * 1000, 2) . 'ms',
            'error' => $e->getMessage()
        ];
    }
}

// 1. Check de base - PHP et Apache
$health['checks']['php'] = [
    'status' => 'ok',
    'version' => PHP_VERSION,
    'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . 'MB'
];

// 2. Check système de fichiers
$health['checks']['filesystem'] = quickCheck(function() {
    $testFile = '/tmp/health_check_' . uniqid();
    file_put_contents($testFile, 'test');
    $content = file_get_contents($testFile);
    unlink($testFile);
    return $content === 'test' ? 'writable' : 'error';
}, 'filesystem');

// 3. Check MySQL avec timeout court
if (getenv('DB_HOST')) {
    $health['checks']['mysql'] = quickCheck(function() {
        $dsn = "mysql:host=" . getenv('DB_HOST') . ";port=" . (getenv('DB_PORT') ?: 3306);
        $options = [
            PDO::ATTR_TIMEOUT => 3,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ];

        $pdo = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASSWORD'), $options);
        $stmt = $pdo->query('SELECT 1 as test');
        $result = $stmt->fetch();
        return $result['test'] == 1 ? 'connected' : 'error';
    }, 'mysql');

    $health['services']['mysql'] = $health['checks']['mysql']['status'];
}

// 4. Check MongoDB avec timeout court (optionnel)
if (getenv('MONGO_HOST') && class_exists('MongoDB\Driver\Manager')) {
    $health['checks']['mongodb'] = quickCheck(function() {
        $uri = "mongodb://";
        if (getenv('MONGO_USER') && getenv('MONGO_PASSWORD')) {
            $uri .= getenv('MONGO_USER') . ":" . getenv('MONGO_PASSWORD') . "@";
        }
        $uri .= getenv('MONGO_HOST') . ":" . (getenv('MONGO_PORT') ?: 27017);

        $manager = new MongoDB\Driver\Manager($uri, [
            'connectTimeoutMS' => 3000,
            'serverSelectionTimeoutMS' => 3000
        ]);

        $command = new MongoDB\Driver\Command(['ping' => 1]);
        $result = $manager->executeCommand('admin', $command);
        return 'connected';
    }, 'mongodb');

    $health['services']['mongodb'] = $health['checks']['mongodb']['status'];
}

// 5. Vérification de l'environnement Railway
if (getenv('RAILWAY_ENVIRONMENT')) {
    $health['railway'] = [
        'environment' => getenv('RAILWAY_ENVIRONMENT'),
        'project_id' => getenv('RAILWAY_PROJECT_ID'),
        'service_id' => getenv('RAILWAY_SERVICE_ID'),
        'replica_id' => getenv('RAILWAY_REPLICA_ID')
    ];
}

// Déterminer le statut global
$allServicesOk = true;
foreach ($health['checks'] as $check) {
    if ($check['status'] !== 'ok') {
        $allServicesOk = false;
        break;
    }
}

// Status final
if (!$allServicesOk) {
    $health['status'] = 'degraded';
} else {
    $health['status'] = 'ok';
}

// Durée totale du health check
$health['total_duration'] = round((microtime(true) - $startTime) * 1000, 2) . 'ms';

// Réponse HTTP appropriée
http_response_code($health['status'] === 'ok' ? 200 : 503);
echo json_encode($health, JSON_PRETTY_PRINT);
?>