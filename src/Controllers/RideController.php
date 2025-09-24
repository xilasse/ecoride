<?php
namespace EcoRide\Controllers;

use DateTime;

class RideController extends BaseController {

    public function createRide() {
        header('Content-Type: application/json');

        try {
            // Vérifier que c'est une requête POST
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Méthode non autorisée']);
                return;
            }

            // Récupérer les données JSON
            $input = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Données JSON invalides']);
                return;
            }

            // Validation des données requises
            $requiredFields = ['from', 'to', 'date', 'time', 'seats', 'price', 'vehicleType'];
            foreach ($requiredFields as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Le champ '$field' est requis"]);
                    return;
                }
            }

            // Validation des données
            if (!$this->validateRideData($input)) {
                http_response_code(400);
                echo json_encode(['error' => 'Données invalides']);
                return;
            }

            // Insérer en base de données
            $rideId = $this->saveRide($input);

            // Réponse de succès
            echo json_encode([
                'success' => true,
                'message' => 'Trajet créé avec succès',
                'rideId' => $rideId
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur interne du serveur', 'details' => $e->getMessage()]); // Include details for debugging
            error_log($e->getMessage());
        }
    }

    public function getRides() {
        header('Content-Type: application/json');

        try {
            $sql = "SELECT
                        r.*,
                        u.pseudo as driver_name,
                        u.profile_picture as driver_avatar,
                        v.brand, v.model, v.color, v.fuel_type, v.is_ecological
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    JOIN vehicles v ON r.vehicle_id = v.id
                    WHERE r.departure_datetime >= NOW()
                    AND r.status_id IN (1, 2)
                    ORDER BY r.departure_datetime ASC
                    LIMIT 20";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute();
            $rides = $stmt->fetchAll();

            echo json_encode(['rides' => $rides]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la récupération des trajets', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    public function searchRides() {
        header('Content-Type: application/json');

        try {
            $from = $_GET['from'] ?? '';
            $to = $_GET['to'] ?? '';
            $date = $_GET['date'] ?? '';

            $sql = "SELECT
                        r.*,
                        u.name as driver_name,
                        u.avatar as driver_avatar
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    WHERE 1=1";

            $params = [];

            if (!empty($from)) {
                $sql .= " AND LOWER(r.departure_city) LIKE LOWER(?)";
                $params[] = "%$from%";
            }

            if (!empty($to)) {
                $sql .= " AND LOWER(r.arrival_city) LIKE LOWER(?)";
                $params[] = "%$to%";
            }

            if (!empty($date)) {
                $sql .= " AND r.date = ?";
                $params[] = $date;
            }

            $sql .= " AND r.date >= CURDATE() ORDER BY r.date ASC, r.time ASC LIMIT 20";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $rides = $stmt->fetchAll();

            echo json_encode(['rides' => $rides]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la recherche', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    private function validateRideData($data) {
        // Validation du prix
        if ($data['price'] < 1 || $data['price'] > 200) {
            return false;
        }

        // Validation du nombre de places
        if ($data['seats'] < 1 || $data['seats'] > 6) {
            return false;
        }

        // Validation de la date (pas dans le passé)
        $rideDate = new DateTime($data['date']);
        $today = new DateTime();
        if ($rideDate < $today) {
            return false;
        }

        // Validation du type de véhicule
        $validVehicleTypes = ['electric', 'hybrid', 'gasoline'];
        if (!in_array($data['vehicleType'], $validVehicleTypes)) {
            return false;
        }

        return true;
    }

    private function saveRide($data) {
        try {
            // Récupérer ou créer un véhicule
            $vehicleId = $this->getOrCreateVehicle($data);

            $departureDateTime = $data['date'] . ' ' . $data['time'] . ':00';

            $sql = "INSERT INTO rides (
                        driver_id, vehicle_id, departure_city, arrival_city,
                        departure_datetime, price_per_seat, available_seats,
                        total_seats, description, departure_address,
                        pets_allowed, smoking_allowed
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);

            // TODO: Remplacer par l'ID du conducteur authentifié
            $driverId = $_SESSION['user_id'] ?? 4; // Fallback à 4 pour les tests

            $petsAllowed = is_array($data['preferences']) ? in_array('pets', $data['preferences']) : false;
            $smokingAllowed = is_array($data['preferences']) ? !in_array('nosmoking', $data['preferences']) : true;

            $stmt->execute([
                $driverId,
                $vehicleId,
                $data['from'],
                $data['to'],
                $departureDateTime,
                $data['price'],
                $data['seats'],
                $data['seats'], // total_seats = available_seats initialement
                $data['description'] ?? '',
                $data['meetingPoint'] ?? '',
                $petsAllowed,
                $smokingAllowed
            ]);

            return $db->lastInsertId();

        } catch (Exception $e) {
            error_log('Erreur saveRide: ' . $e->getMessage());
            throw $e;
        }
    }

    private function getOrCreateVehicle($data) {
        try {
            // Récupérer ou créer un véhicule
            $fuelType = $this->mapVehicleType($data['vehicleType']);
            $driverId = $_SESSION['user_id'] ?? 4; // TODO: Remplacer par l'ID du conducteur authentifié

            $sql = "SELECT id FROM vehicles
                    WHERE user_id = ? AND fuel_type = ?
                    ORDER BY created_at DESC LIMIT 1";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$driverId, $fuelType]);
            $existingVehicle = $stmt->fetch();

            if ($existingVehicle) {
                return $existingVehicle['id'];
            }

            // Créer un nouveau véhicule
            $brand = $data['vehicleBrand'] ?: $this->getDefaultBrand($fuelType);
            $model = $data['vehicleModel'] ?: $this->getDefaultModel($fuelType);
            $color = 'Grise'; // Couleur par défaut

            $sql = "INSERT INTO vehicles (user_id, brand, model, color, license_plate, first_registration, fuel_type, seats_available)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $licensePlate = $this->generateLicensePlate();
            $firstRegistration = date('Y-m-d', strtotime('-2 years'));

            $stmt->execute([
                $driverId,
                $brand,
                $model,
                $color,
                $licensePlate,
                $firstRegistration,
                $fuelType,
                $data['seats']
            ]);

            return $db->lastInsertId();

        } catch (Exception $e) {
            error_log('Erreur getOrCreateVehicle: ' . $e->getMessage());
            throw $e;
        }
    }

    private function mapVehicleType($type) {
        switch ($type) {
            case 'electric': return 'electrique';
            case 'hybrid': return 'hybride';
            case 'gasoline': return 'essence';
            default: return 'essence';
        }
    }

    private function getDefaultBrand($fuelType) {
        switch ($fuelType) {
            case 'electrique': return 'Tesla';
            case 'hybride': return 'Toyota';
            case 'essence': return 'Peugeot';
            default: return 'Renault';
        }
    }

    private function getDefaultModel($fuelType) {
        switch ($fuelType) {
            case 'electrique': return 'Model 3';
            case 'hybride': return 'Prius';
            case 'essence': return '308';
            default: return 'Clio';
        }
    }

    private function generateLicensePlate() {
        $letters1 = chr(rand(65, 90)) . chr(rand(65, 90));
        $numbers = sprintf('%03d', rand(100, 999));
        $letters2 = chr(rand(65, 90)) . chr(rand(65, 90));
        return $letters1 . '-' . $numbers . '-' . $letters2;
    }
}