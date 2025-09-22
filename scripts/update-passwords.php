<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Configuration
$config = require_once __DIR__ . '/../config/config.php';

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['database']['mysql']['host'],
        $config['database']['mysql']['dbname']
    );

    $pdo = new PDO(
        $dsn,
        $config['database']['mysql']['username'],
        $config['database']['mysql']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // Mots de passe de test
    $passwords = [
        'admin@ecoride.fr' => 'admin123',
        'employe1@ecoride.fr' => 'employe123',
        'employe2@ecoride.fr' => 'employe123',
        'marie.dupont@email.com' => 'marie123',
        'jean.martin@email.com' => 'jean123',
        'sophie.bernard@email.com' => 'sophie123',
        'pierre.durand@email.com' => 'pierre123',
        'claire.moreau@email.com' => 'claire123'
    ];

    $sql = "UPDATE users SET password_hash = ? WHERE email = ?";
    $stmt = $pdo->prepare($sql);

    foreach ($passwords as $email => $password) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt->execute([$hash, $email]);
        echo "Mot de passe mis à jour pour: $email\n";
    }

    echo "\nTous les mots de passe ont été mis à jour avec succès!\n";

} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
}
?>