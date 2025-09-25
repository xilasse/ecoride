<?php
namespace EcoRide\Controllers;

require_once __DIR__ . '/../../config/database.php';

class BaseController {
    protected $db;

    public function __construct(\Database $db) {
        $this->db = $db;
    }

    protected function getDatabase() {
        // Simply return the PDO connection from the Database instance
        return $this->db->getConnection();
    }
}