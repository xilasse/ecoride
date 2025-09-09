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
                'mysql:host=%s;dbname=%s;charset=%s',
                $this->config['database']['mysql']['host'],
                $this->config['database']['mysql']['dbname'],
                $this->config['database']['mysql']['charset']
            );
            
            $this->db = new \PDO(
                $dsn,
                $this->config['database']['mysql']['username'],
                $this->config['database']['mysql']['password'],
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC
                ]
            );
        } catch (\PDOException $e) {
            throw new \Exception('Erreur de connexion à la base de données: ' . $e->getMessage());
        }
    }
}