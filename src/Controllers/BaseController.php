<?php
namespace EcoRide\Controllers;

class BaseController {
    protected $config;
    protected $db;
    
    public function __construct($config) {
        $this->config = $config;
        $this->initDatabase();
    }
    
    private function initDatabase() {
        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $this->config['database']['mysql']['host'],
                $this->config['database']['mysql']['port'] ?? 3306,
                $this->config['database']['mysql']['dbname']
            );

            $this->db = new \PDO(
                $dsn,
                $this->config['database']['mysql']['username'],
                $this->config['database']['mysql']['password'],
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                    \PDO::ATTR_TIMEOUT => 5, // Timeout de 5 secondes
                    \PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
        } catch (\PDOException $e) {
            // Sur Railway, ne pas faire planter l'app si la DB n'est pas encore prête
            if (isset($_ENV['RAILWAY_ENVIRONMENT'])) {
                error_log('Railway: Base de données pas encore accessible - ' . $e->getMessage());
                $this->db = null; // DB sera initialisée lors du premier accès réel
            } else {
                throw new \Exception('Erreur de connexion à la base de données: ' . $e->getMessage());
            }
        }
    }

    protected function getDatabase() {
        // Lazy loading de la DB sur Railway avec retry
        if ($this->db === null && isset($_ENV['RAILWAY_ENVIRONMENT'])) {
            // Retry sur Railway car le réseau interne peut prendre du temps
            $maxAttempts = 3;
            for ($i = 1; $i <= $maxAttempts; $i++) {
                try {
                    $this->initDatabase();
                    if ($this->db !== null) {
                        error_log("Railway: Connexion DB réussie à la tentative $i");
                        break;
                    }
                } catch (Exception $e) {
                    error_log("Railway: Tentative DB $i/$maxAttempts échouée: " . $e->getMessage());
                    if ($i < $maxAttempts) {
                        sleep(2); // Attendre 2s avant retry
                    }
                }
            }
        } elseif ($this->db === null) {
            $this->initDatabase();
        }
        return $this->db;
    }
}