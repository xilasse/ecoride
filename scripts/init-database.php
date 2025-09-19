<?php
/**
 * Script d'initialisation automatique de la base de données EcoRide
 *
 * Ce script vérifie si les tables existent et les crée si nécessaire
 * Utilisé lors du déploiement sur Railway ou premier lancement Docker
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Charger la configuration
$config = require __DIR__ . '/../config/config.php';
$dbConfig = $config['database']['mysql'];

echo "🚀 Initialisation de la base de données EcoRide...\n";

try {
    // Connexion à MySQL sans spécifier la base de données
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};port={$dbConfig['port']};charset=utf8mb4",
        $dbConfig['username'],
        $dbConfig['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // Définir l'encodage UTF8
    $pdo->exec("SET NAMES utf8mb4");

    echo "✅ Connexion MySQL établie\n";

    // Créer la base de données si elle n'existe pas
    $dbName = $dbConfig['dbname'];
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✅ Base de données '{$dbName}' vérifiée/créée\n";

    // Se connecter à la base de données
    $pdo->exec("USE `{$dbName}`");

    // Vérifier si les tables existent déjà
    $stmt = $pdo->query("SHOW TABLES");
    $existingTables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($existingTables) > 0) {
        echo "ℹ️  Tables existantes trouvées: " . implode(', ', $existingTables) . "\n";

        // Vérifier si on a toutes les tables principales
        $requiredTables = ['users', 'user_roles', 'rides', 'vehicles', 'bookings'];
        $missingTables = array_diff($requiredTables, $existingTables);

        if (empty($missingTables)) {
            echo "✅ Toutes les tables principales existent déjà. Initialisation terminée.\n";
            exit(0);
        } else {
            echo "⚠️  Tables manquantes: " . implode(', ', $missingTables) . "\n";
            echo "🔄 Recréation complète de la structure...\n";
        }
    } else {
        echo "📋 Aucune table trouvée. Création de la structure complète...\n";
    }

    // Lire et exécuter le fichier structure.sql
    $structureFile = __DIR__ . '/../sql/structure.sql';
    if (!file_exists($structureFile)) {
        throw new Exception("Fichier structure.sql non trouvé: {$structureFile}");
    }

    $sql = file_get_contents($structureFile);
    if ($sql === false) {
        throw new Exception("Impossible de lire le fichier structure.sql");
    }

    echo "📄 Exécution du fichier structure.sql...\n";

    // Diviser le SQL en instructions séparées
    $statements = explode(';', $sql);
    $executedStatements = 0;

    foreach ($statements as $statement) {
        $statement = trim($statement);

        // Ignorer les commentaires et les lignes vides
        if (empty($statement) || strpos($statement, '--') === 0 || strpos($statement, '/*') === 0) {
            continue;
        }

        try {
            $pdo->exec($statement);
            $executedStatements++;
        } catch (PDOException $e) {
            // Ignorer les erreurs de tables déjà existantes ou de données dupliquées
            if (strpos($e->getMessage(), 'already exists') !== false ||
                strpos($e->getMessage(), 'Duplicate entry') !== false) {
                continue;
            }
            throw $e;
        }
    }

    echo "✅ Structure créée avec succès ({$executedStatements} instructions exécutées)\n";

    // Vérifier les données de base (rôles et statuts)
    $rolesCount = $pdo->query("SELECT COUNT(*) FROM user_roles")->fetchColumn();
    $statusCount = $pdo->query("SELECT COUNT(*) FROM ride_statuses")->fetchColumn();

    echo "✅ Données de référence vérifiées:\n";
    echo "   - Rôles utilisateur: {$rolesCount}\n";
    echo "   - Statuts de trajet: {$statusCount}\n";

    // Optionnel: Lire et exécuter data.sql s'il contient des données
    $dataFile = __DIR__ . '/../sql/data.sql';
    if (file_exists($dataFile)) {
        $dataSql = file_get_contents($dataFile);
        if (!empty(trim($dataSql)) && trim($dataSql) !== '') {
            echo "📄 Exécution du fichier data.sql...\n";
            $pdo->exec($dataSql);
            echo "✅ Données additionnelles chargées\n";
        }
    }

    // Statistiques finales
    $stmt = $pdo->query("SHOW TABLES");
    $finalTables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo "\n🎉 Initialisation terminée avec succès!\n";
    echo "📊 Tables créées: " . count($finalTables) . "\n";
    echo "📋 Liste: " . implode(', ', $finalTables) . "\n";

} catch (Exception $e) {
    echo "❌ Erreur lors de l'initialisation: " . $e->getMessage() . "\n";
    echo "📍 Fichier: " . $e->getFile() . ":" . $e->getLine() . "\n";

    if ($e instanceof PDOException) {
        echo "🔍 Code SQL: " . $e->getCode() . "\n";
    }

    exit(1);
}

echo "\n✅ Base de données EcoRide prête à l'emploi!\n";