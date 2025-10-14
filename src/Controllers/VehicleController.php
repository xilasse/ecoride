<?php
namespace EcoRide\Controllers;

use Exception;
use PDO;

class VehicleController extends BaseController {

    public function getUserVehicles() {
        header('Content-Type: application/json');

        try {
            // Vérifier que l'utilisateur est connecté
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous devez être connecté'
                ]);
                return;
            }

            $userId = $_SESSION['user_id'];

            $sql = "SELECT * FROM vehicles
                    WHERE user_id = ?
                    ORDER BY created_at DESC";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $vehicles = $stmt->fetchAll();

            echo json_encode([
                'success' => true,
                'vehicles' => $vehicles
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la récupération des véhicules',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }

    public function getVehicle($vehicleId) {
        header('Content-Type: application/json');

        try {
            // Vérifier que l'utilisateur est connecté
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous devez être connecté'
                ]);
                return;
            }

            $userId = $_SESSION['user_id'];
            $vehicleId = intval($vehicleId);

            $sql = "SELECT * FROM vehicles
                    WHERE id = ? AND user_id = ?";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$vehicleId, $userId]);
            $vehicle = $stmt->fetch();

            if (!$vehicle) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Véhicule non trouvé'
                ]);
                return;
            }

            echo json_encode([
                'success' => true,
                'vehicle' => $vehicle
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la récupération du véhicule',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }

    public function deleteVehicle($vehicleId) {
        header('Content-Type: application/json');

        try {
            // Vérifier que l'utilisateur est connecté
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous devez être connecté'
                ]);
                return;
            }

            $userId = $_SESSION['user_id'];
            $vehicleId = intval($vehicleId);

            // Vérifier que le véhicule appartient à l'utilisateur
            $sql = "SELECT id FROM vehicles WHERE id = ? AND user_id = ?";
            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$vehicleId, $userId]);
            $vehicle = $stmt->fetch();

            if (!$vehicle) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Véhicule non trouvé'
                ]);
                return;
            }

            // Vérifier qu'il n'y a pas de trajets actifs avec ce véhicule
            $sql = "SELECT COUNT(*) as count FROM rides
                    WHERE vehicle_id = ?
                    AND status_id IN (1, 2)
                    AND departure_datetime > NOW()";
            $stmt = $db->prepare($sql);
            $stmt->execute([$vehicleId]);
            $result = $stmt->fetch();

            if ($result['count'] > 0) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Impossible de supprimer ce véhicule car il est utilisé dans des trajets actifs'
                ]);
                return;
            }

            // Supprimer le véhicule
            $sql = "DELETE FROM vehicles WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$vehicleId]);

            echo json_encode([
                'success' => true,
                'message' => 'Véhicule supprimé avec succès'
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la suppression',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }

    public function createVehicle() {
        header('Content-Type: application/json');

        try {
            // Vérifier que l'utilisateur est connecté
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous devez être connecté'
                ]);
                return;
            }

            // Vérifier que c'est une requête POST
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Méthode non autorisée']);
                return;
            }

            $userId = $_SESSION['user_id'];
            $input = json_decode(file_get_contents('php://input'), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Données JSON invalides']);
                return;
            }

            // Validation des champs requis
            $requiredFields = ['brand', 'model', 'fuel_type', 'seat_count'];
            foreach ($requiredFields as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Le champ '$field' est requis"]);
                    return;
                }
            }

            $sql = "INSERT INTO vehicles (user_id, brand, model, color, license_plate, fuel_type, seat_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?)";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $userId,
                $input['brand'],
                $input['model'],
                $input['color'] ?? 'Non spécifiée',
                $input['license_plate'] ?? '',
                $input['fuel_type'],
                $input['seat_count']
            ]);

            $vehicleId = $db->lastInsertId();

            echo json_encode([
                'success' => true,
                'message' => 'Véhicule créé avec succès',
                'vehicleId' => $vehicleId
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la création du véhicule',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }
}
