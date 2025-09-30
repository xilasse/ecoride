<?php
namespace EcoRide\Controllers;

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
            echo json_encode(['error' => 'Erreur interne du serveur']);
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
        if (!$db) {
            throw new \Exception('Base de données non accessible');
        }
        $stmt = $db->prepare($sql);
            $stmt->execute();
            $rides = $stmt->fetchAll();

            echo json_encode(['rides' => $rides]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la récupération des trajets']);
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
        if (!$db) {
            throw new \Exception('Base de données non accessible');
        }
        $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $rides = $stmt->fetchAll();

            echo json_encode(['rides' => $rides]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la recherche']);
            error_log($e->getMessage());
        }
    }

    public function getRideDetails() {
        header('Content-Type: application/json');

        try {
            $rideId = $_GET['id'] ?? null;

            if (!$rideId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID du trajet requis']);
                return;
            }

            $sql = "SELECT
                        r.id, r.departure_city, r.arrival_city, r.departure_datetime,
                        r.price_per_seat, r.available_seats, r.total_seats,
                        r.description, r.departure_address, r.pets_allowed, r.smoking_allowed,
                        u.pseudo as driver_name, u.email as driver_email, u.rating as driver_rating,
                        u.profile_picture as driver_avatar,
                        v.brand, v.model, v.color, v.fuel_type, v.is_ecological
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    JOIN vehicles v ON r.vehicle_id = v.id
                    WHERE r.id = ?";

            $db = $this->getDatabase();
            if (!$db) {
                throw new \Exception('Base de données non accessible');
            }

            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $ride = $stmt->fetch();

            if (!$ride) {
                http_response_code(404);
                echo json_encode(['error' => 'Trajet non trouvé']);
                return;
            }

            // Formatage des données pour l'affichage
            $rideDetails = [
                'id' => $ride['id'],
                'driver' => $ride['driver_name'],
                'avatar' => strtoupper(substr($ride['driver_name'], 0, 1)),
                'rating' => $ride['driver_rating'] ?: 4.5,
                'reviewCount' => 15, // Valeur par défaut, à récupérer depuis une table reviews plus tard
                'departure' => [
                    'city' => $ride['departure_city'],
                    'time' => date('H:i', strtotime($ride['departure_datetime']))
                ],
                'arrival' => [
                    'city' => $ride['arrival_city'],
                    'time' => date('H:i', strtotime($ride['departure_datetime'] . ' +4 hours')) // Calcul approximatif
                ],
                'duration' => $this->calculateDuration($ride['departure_city'], $ride['arrival_city']),
                'car' => [
                    'model' => $ride['brand'] . ' ' . $ride['model'],
                    'color' => $ride['color'],
                    'type' => $ride['fuel_type']
                ],
                'price' => $ride['price_per_seat'],
                'seatsAvailable' => $ride['available_seats'],
                'ecological' => $ride['is_ecological'] || $ride['fuel_type'] === 'electrique',
                'preferences' => [
                    'pets' => $ride['pets_allowed'],
                    'smoking' => !$ride['smoking_allowed'], // Non fumeur si smoking_allowed = false
                    'music' => true // Valeur par défaut
                ],
                'description' => $ride['description'] ?: 'Trajet confortable et écologique.',
                'driverBio' => 'Conducteur expérimenté et responsable.',
                'reviews' => [
                    ['author' => 'Marie', 'rating' => 5, 'comment' => 'Excellent trajet, très ponctuelle !'],
                    ['author' => 'Pierre', 'rating' => 4, 'comment' => 'Conducteur sympa, voyage agréable']
                ]
            ];

            echo json_encode(['ride' => $rideDetails]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la récupération des détails']);
            error_log($e->getMessage());
        }
    }

    private function calculateDuration($departure, $arrival) {
        // Durées approximatives entre villes principales
        $durations = [
            'Paris_Lyon' => '4h 30min',
            'Lyon_Marseille' => '3h 15min',
            'Paris_Bordeaux' => '5h 45min',
            'Toulouse_Montpellier' => '2h 30min',
            'Lille_Bruxelles' => '1h 45min'
        ];

        $key = $departure . '_' . $arrival;
        $reverseKey = $arrival . '_' . $departure;

        return $durations[$key] ?? $durations[$reverseKey] ?? '3h 00min';
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
            // D'abord, il faut créer/récupérer un véhicule pour le conducteur
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
        if (!$db) {
            throw new \Exception('Base de données non accessible');
        }
        $stmt = $db->prepare($sql);

            // Pour cette démo, on utilise un driver_id fictif
            $driverId = 4; // Marie

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
        // D'abord, essayons de trouver un véhicule existant du même type pour l'utilisateur
        $fuelType = $this->mapVehicleType($data['vehicleType']);
        $driverId = 4; // Marie pour cette démo

        $sql = "SELECT id FROM vehicles
                WHERE user_id = ? AND fuel_type = ?
                ORDER BY created_at DESC LIMIT 1";

        $db = $this->getDatabase();
        if (!$db) {
            throw new \Exception('Base de données non accessible');
        }
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
        if (!$db) {
            throw new \Exception('Base de données non accessible');
        }
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
    }

    private function mapVehicleType($type) {
        switch($type) {
            case 'electric': return 'electrique';
            case 'hybrid': return 'hybride';
            case 'gasoline': return 'essence';
            default: return 'essence';
        }
    }

    private function getDefaultBrand($fuelType) {
        switch($fuelType) {
            case 'electrique': return 'Tesla';
            case 'hybride': return 'Toyota';
            case 'essence': return 'Peugeot';
            default: return 'Renault';
        }
    }

    private function getDefaultModel($fuelType) {
        switch($fuelType) {
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