<?php
// Test de connexion à la base de données Railway
header('Content-Type: application/json');
header('Cache-Control: no-cache');

$result = [
    'timestamp' => date('c'),
    'database' => 'not_configured'
];

// Vérifier si DATABASE_URL est configuré
if (isset($_ENV['DATABASE_URL']) || isset($_ENV['MYSQL_URL'])) {
    try {
        $databaseUrl = $_ENV['DATABASE_URL'] ?? $_ENV['MYSQL_URL'];
        $parsedUrl = parse_url($databaseUrl);

        $dsn = "mysql:host={$parsedUrl['host']};port=" . ($parsedUrl['port'] ?? 3306);
        $pdo = new PDO($dsn, $parsedUrl['user'], $parsedUrl['pass'], [
            PDO::ATTR_TIMEOUT => 5,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);

        $stmt = $pdo->query('SELECT 1 as test');
        $test = $stmt->fetch();

        $result['database'] = 'connected';
        $result['host'] = $parsedUrl['host'];
        $result['port'] = $parsedUrl['port'] ?? 3306;

    } catch (Exception $e) {
        $result['database'] = 'error';
        $result['error'] = $e->getMessage();
    }
} else {
    $result['database'] = 'no_url_configured';
    $result['env_vars'] = array_keys($_ENV);
}

echo json_encode($result, JSON_PRETTY_PRINT);
?>