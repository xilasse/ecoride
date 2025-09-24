<?php
// src/config/database.php - Version corrigée pour Railway
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        $maxRetries = 15; // Plus de tentatives
        $retryDelay = 5; // Plus de temps entre les tentatives
        $connected = false;
        
        for ($i = 0; $i < $maxRetries; $i++) {
            try {
                // D'abord, essayer MYSQL_PRIVATE_URL qui est souvent plus fiable sur Railway
                $databaseUrl = getenv('MYSQL_PRIVATE_URL') ?: getenv('DATABASE_PRIVATE_URL') ?: getenv('MYSQL_URL') ?: getenv('DATABASE_URL');
                
                if ($databaseUrl) {
                    error_log("Utilisation de l'URL: " . preg_replace('/:[^:@]+@/', ':***@', $databaseUrl));
                    
                    $url = parse_url($databaseUrl);
                    $host = $url['host'];
                    $port = $url['port'] ?? 3306;
                    $dbname = ltrim($url['path'], '/');
                    $username = $url['user'];
                    $password = $url['pass'] ?? '';
                } else {
                    // Fallback sur les variables individuelles
                    $host = getenv('MYSQLHOST') ?: getenv('MYSQL_HOST');
                    $port = getenv('MYSQLPORT') ?: getenv('MYSQL_PORT') ?: '3306';
                    $dbname = getenv('MYSQLDATABASE') ?: getenv('MYSQL_DATABASE');
                    $username = getenv('MYSQLUSER') ?: getenv('MYSQL_USER');
                    $password = getenv('MYSQLPASSWORD') ?: getenv('MYSQL_PASSWORD');
                    
                    // IMPORTANT: Si le host contient "testsite", c'est incorrect
                    // Il faut le nom du service MySQL, pas de l'app
                    if ($host && strpos($host, 'testsite') !== false) {
                        error_log("⚠️ ATTENTION: Le host '$host' semble incorrect.");
                        error_log("Le host devrait être [nom-service-mysql].railway.internal");
                        
                        // Essayer avec des noms communs de service MySQL
                        $possibleHosts = ['mysql.railway.internal', 'database.railway.internal', 'db.railway.internal'];
                        foreach ($possibleHosts as $tryHost) {
                            error_log("Tentative avec host alternatif: $tryHost");
                            try {
                                $testDsn = "mysql:host=$tryHost;port=$port;dbname=$dbname;charset=utf8mb4";
                                $testPdo = new PDO($testDsn, $username, $password, [
                                    PDO::ATTR_TIMEOUT => 2,
                                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                                ]);
                                $testPdo->query('SELECT 1');
                                $host = $tryHost;
                                error_log("✅ Host trouvé: $tryHost");
                                break;
                            } catch (Exception $e) {
                                continue;
                            }
                        }
                    }
                }
                
                // Si on n'a toujours pas de config valide, environnement local
                if (!$host) {
                    error_log("Utilisation de la configuration locale");
                    $host = 'localhost';
                    $port = '3306';
                    $dbname = 'myapp';
                    $username = 'root';
                    $password = '';
                }
                
                $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
                
                error_log("Tentative de connexion MySQL #" . ($i + 1));
                error_log("Host: $host, Port: $port, DB: $dbname, User: $username");
                
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 10,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ];
                
                $this->connection = new PDO($dsn, $username, $password, $options);
                
                // Test de connexion
                $this->connection->query('SELECT 1');
                $connected = true;
                error_log("✅ Connexion MySQL réussie!");
                break;
                
            } catch (PDOException $e) {
                error_log("Tentative #" . ($i + 1) . " échouée: " . $e->getMessage());
                
                if ($i < $maxRetries - 1) {
                    error_log("Nouvelle tentative dans $retryDelay secondes...");
                    sleep($retryDelay);
                } else {
                    // Log détaillé pour debug
                    error_log("=== ÉCHEC APRÈS $maxRetries TENTATIVES ===");
                    error_log("Variables disponibles:");
                    error_log("MYSQL_URL: " . (getenv('MYSQL_URL') ? 'OUI' : 'NON'));
                    error_log("MYSQL_PRIVATE_URL: " . (getenv('MYSQL_PRIVATE_URL') ? 'OUI' : 'NON'));
                    error_log("DATABASE_URL: " . (getenv('DATABASE_URL') ? 'OUI' : 'NON'));
                    error_log("MYSQLHOST: " . getenv('MYSQLHOST'));
                    error_log("MYSQLDATABASE: " . getenv('MYSQLDATABASE'));
                    
                    throw new Exception("Impossible de se connecter à MySQL après $maxRetries tentatives: " . $e->getMessage());
                }
            }
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
}