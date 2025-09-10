<?php
require_once '../config/config.php';

$config = include '../config/config.php';
$dbConfig = $config['database']['mysql'];

try {
    // Connexion sans base de données
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};port={$dbConfig['port']}",
        $dbConfig['username'],
        $dbConfig['password']
    );
    
    // Créer la base si elle n'existe pas
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbConfig['dbname']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    // Utiliser la base
    $pdo->exec("USE `{$dbConfig['dbname']}`");
    
    // Exécuter le script SQL
    $sql = file_get_contents('../sql/structure.sql');
    $pdo->exec($sql);
    
    echo "Base de données initialisée avec succès!\n";
    
} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    exit(1);
}
?>
