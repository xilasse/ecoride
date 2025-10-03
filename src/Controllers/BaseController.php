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

            // Configurer l'encodage après la connexion
            $this->db->exec(statement: "SET NAMES utf8mb4");
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
        // Lazy loading de la DB sur Railway
        if ($this->db === null && isset($_ENV['RAILWAY_ENVIRONMENT'])) {
            $this->initDatabase();
        }
        return $this->db;
    }
}