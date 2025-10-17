<?php
namespace EcoRide\Controllers;

use DateTime;
use Exception;
use PDO;
use EcoRide\Services\RouteService;

class RideController extends BaseController {

    public function createRide() {
        header('Content-Type: application/json');

        try {
            // Vérifier que l'utilisateur est connecté
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode([
                    'error' => 'Vous devez être connecté pour créer un trajet',
                    'redirect' => '/connexion',
                    'requiresAuth' => true
                ]);
                return;
            }

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

            // Calculer l'heure d'arrivée si non fournie
            if (empty($input['arrivalTime'])) {
                $routeService = new RouteService();
                $arrivalData = $routeService->calculateArrivalTime(
                    $input['from'],
                    $input['to'],
                    $input['date'],
                    $input['time']
                );
                $input['estimated_arrival_datetime'] = $arrivalData['arrival_datetime'];
                $input['duration_minutes'] = $arrivalData['duration_minutes'];
            } else {
                // Utiliser l'heure fournie par le chauffeur
                $input['estimated_arrival_datetime'] = $input['date'] . ' ' . $input['arrivalTime'] . ':00';

                // Calculer la durée
                $departure = new DateTime($input['date'] . ' ' . $input['time']);
                $arrival = new DateTime($input['estimated_arrival_datetime']);
                $interval = $departure->diff($arrival);
                $input['duration_minutes'] = ($interval->h * 60) + $interval->i;
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
            error_log($e->getMessage());
            echo json_encode(['error' => 'Erreur interne du serveur', 'details' => $e->getMessage()]);
        }
    }

    public function getRides() {
        header('Content-Type: application/json');

        try {
            // Paramètres de pagination
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 10; // Max 50, défaut 10
            $offset = ($page - 1) * $limit;

            // Paramètres de filtrage
            $ecoOnly = isset($_GET['eco_only']) && $_GET['eco_only'] === 'true';
            $maxPrice = isset($_GET['max_price']) ? floatval($_GET['max_price']) : null;
            $maxDuration = isset($_GET['max_duration']) ? intval($_GET['max_duration']) : null;
            $minRating = isset($_GET['min_rating']) ? floatval($_GET['min_rating']) : null;
            $petsAllowed = isset($_GET['pets_allowed']) && $_GET['pets_allowed'] === 'true';
            $nonSmoking = isset($_GET['non_smoking']) && $_GET['non_smoking'] === 'true';

            // Paramètre de tri
            $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'datetime';

            // Construction de la clause WHERE avec filtres
            $whereConditions = ["r.departure_datetime >= NOW()", "r.status_id IN (1, 2)"];
            $params = [];

            if ($ecoOnly) {
                $whereConditions[] = "(v.is_ecological = 1 OR v.fuel_type = 'electrique')";
            }

            if ($maxPrice !== null && $maxPrice > 0) {
                $whereConditions[] = "r.price_per_seat <= ?";
                $params[] = $maxPrice;
            }

            if ($maxDuration !== null && $maxDuration > 0) {
                $whereConditions[] = "r.duration_minutes <= ?";
                $params[] = $maxDuration;
            }

            if ($minRating !== null && $minRating > 0) {
                $whereConditions[] = "u.rating_average >= ?";
                $params[] = $minRating;
            }

            if ($petsAllowed) {
                $whereConditions[] = "r.pets_allowed = 1";
            }

            if ($nonSmoking) {
                $whereConditions[] = "r.smoking_allowed = 0";
            }

            $whereClause = implode(' AND ', $whereConditions);

            // Construction de la clause ORDER BY
            $orderClause = $this->buildOrderClause($sortBy);

            // Requête pour compter le total avec filtres
            $countSql = "SELECT COUNT(*) as total
                        FROM rides r
                        JOIN users u ON r.driver_id = u.id
                        JOIN vehicles v ON r.vehicle_id = v.id
                        WHERE $whereClause";

            $db = $this->getDatabase();
            $countStmt = $db->prepare($countSql);
            $countStmt->execute($params);
            $totalCount = $countStmt->fetch()['total'];

            // Requête pour les données paginées avec les mêmes filtres
            $sql = "SELECT
                        r.*,
                        u.pseudo as driver_name,
                        u.profile_picture as driver_avatar,
                        v.brand, v.model, v.color, v.fuel_type, v.is_ecological
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    JOIN vehicles v ON r.vehicle_id = v.id
                    WHERE $whereClause
                    $orderClause
                    LIMIT ? OFFSET ?";

            $stmt = $db->prepare($sql);

            // Bind all the filter parameters first
            for ($i = 0; $i < count($params); $i++) {
                $stmt->bindValue($i + 1, $params[$i]);
            }

            // Then bind the pagination parameters as integers
            $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
            $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);

            $stmt->execute();
            $rides = $stmt->fetchAll();

            // Calculs de pagination
            $totalPages = ceil($totalCount / $limit);
            $hasNextPage = $page < $totalPages;
            $hasPreviousPage = $page > 1;

            echo json_encode([
                'rides' => $rides,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_count' => $totalCount,
                    'limit' => $limit,
                    'has_next' => $hasNextPage,
                    'has_previous' => $hasPreviousPage
                ]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la récupération des trajets', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    public function getRideDetails($rideId) {
        header('Content-Type: application/json');

        try {
            $rideId = intval($rideId);

            if ($rideId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'ID de trajet invalide']);
                return;
            }

            $sql = "SELECT
                        r.*,
                        u.pseudo as driver_name,
                        u.email as driver_email,
                        u.profile_picture as driver_avatar,
                        u.bio as driver_bio,
                        v.brand, v.model, v.color, v.fuel_type, v.is_ecological
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    JOIN vehicles v ON r.vehicle_id = v.id
                    WHERE r.id = ?";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $ride = $stmt->fetch();

            if (!$ride) {
                http_response_code(404);
                echo json_encode(['error' => 'Trajet non trouvé']);
                return;
            }

            echo json_encode([
                'success' => true,
                'ride' => $ride
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la récupération des détails', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    public function searchRides() {
        header('Content-Type: application/json');

        try {
            $from = $_GET['from'] ?? '';
            $to = $_GET['to'] ?? '';
            $date = $_GET['date'] ?? '';

            // Paramètres de pagination
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 10;
            $offset = ($page - 1) * $limit;

            // Paramètres de filtrage
            $ecoOnly = isset($_GET['eco_only']) && $_GET['eco_only'] === 'true';
            $maxPrice = isset($_GET['max_price']) ? floatval($_GET['max_price']) : null;
            $maxDuration = isset($_GET['max_duration']) ? intval($_GET['max_duration']) : null;
            $minRating = isset($_GET['min_rating']) ? floatval($_GET['min_rating']) : null;
            $petsAllowed = isset($_GET['pets_allowed']) && $_GET['pets_allowed'] === 'true';
            $nonSmoking = isset($_GET['non_smoking']) && $_GET['non_smoking'] === 'true';

            // Construction de la clause WHERE
            $whereConditions = ["r.status_id IN (1, 2)", "r.departure_datetime >= NOW()"];
            $params = [];

            if (!empty($from)) {
                $whereConditions[] = "LOWER(r.departure_city) LIKE LOWER(?)";
                $params[] = "%$from%";
            }

            if (!empty($to)) {
                $whereConditions[] = "LOWER(r.arrival_city) LIKE LOWER(?)";
                $params[] = "%$to%";
            }

            if (!empty($date)) {
                $whereConditions[] = "DATE(r.departure_datetime) = ?";
                $params[] = $date;
            }

            // Ajouter les filtres
            if ($ecoOnly) {
                $whereConditions[] = "(v.is_ecological = 1 OR v.fuel_type = 'electrique')";
            }

            if ($maxPrice !== null && $maxPrice > 0) {
                $whereConditions[] = "r.price_per_seat <= ?";
                $params[] = $maxPrice;
            }

            if ($maxDuration !== null && $maxDuration > 0) {
                $whereConditions[] = "r.duration_minutes <= ?";
                $params[] = $maxDuration;
            }

            if ($minRating !== null && $minRating > 0) {
                $whereConditions[] = "u.rating_average >= ?";
                $params[] = $minRating;
            }

            if ($petsAllowed) {
                $whereConditions[] = "r.pets_allowed = 1";
            }

            if ($nonSmoking) {
                $whereConditions[] = "r.smoking_allowed = 0";
            }

            $whereClause = implode(' AND ', $whereConditions);

            // Requête pour compter le total
            $countSql = "SELECT COUNT(*) as total
                        FROM rides r
                        JOIN users u ON r.driver_id = u.id
                        JOIN vehicles v ON r.vehicle_id = v.id
                        WHERE $whereClause";

            $db = $this->getDatabase();
            $countStmt = $db->prepare($countSql);
            $countStmt->execute($params);
            $totalCount = $countStmt->fetch()['total'];

            // Requête pour les données paginées
            $sql = "SELECT
                        r.*,
                        u.pseudo as driver_name,
                        u.profile_picture as driver_avatar,
                        v.brand, v.model, v.color, v.fuel_type, v.is_ecological
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    JOIN vehicles v ON r.vehicle_id = v.id
                    WHERE $whereClause
                    ORDER BY r.departure_datetime ASC
                    LIMIT ? OFFSET ?";

            $stmt = $db->prepare($sql);

            // Bind all the search parameters first
            for ($i = 0; $i < count($params); $i++) {
                $stmt->bindValue($i + 1, $params[$i]);
            }

            // Then bind the pagination parameters as integers
            $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
            $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);

            $stmt->execute();
            $rides = $stmt->fetchAll();

            // Calculs de pagination
            $totalPages = ceil($totalCount / $limit);
            $hasNextPage = $page < $totalPages;
            $hasPreviousPage = $page > 1;

            echo json_encode([
                'rides' => $rides,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_count' => $totalCount,
                    'limit' => $limit,
                    'has_next' => $hasNextPage,
                    'has_previous' => $hasPreviousPage
                ],
                'search' => [
                    'from' => $from,
                    'to' => $to,
                    'date' => $date
                ]
            ]);

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

        // Validation de la date et heure (pas dans le passé)
        $rideDateTime = new DateTime($data['date'] . ' ' . $data['time']);
        $now = new DateTime();
        if ($rideDateTime < $now) {
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
                        departure_datetime, estimated_arrival_datetime, duration_minutes,
                        price_per_seat, available_seats, total_seats, description,
                        departure_address, pets_allowed, smoking_allowed
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);

            // Utiliser l'ID du conducteur authentifié (vérifié au début de createRide)
            $driverId = $_SESSION['user_id'];

            $petsAllowed = (is_array($data['preferences']) && in_array('pets', $data['preferences'])) ? 1 : 0;
            $smokingAllowed = (is_array($data['preferences']) && !in_array('nosmoking', $data['preferences'])) ? 1 : 0;

            $stmt->execute([
                $driverId,
                $vehicleId,
                $data['from'],
                $data['to'],
                $departureDateTime,
                $data['estimated_arrival_datetime'] ?? null,
                $data['duration_minutes'] ?? null,
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
            $driverId = $_SESSION['user_id'];

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

    public function getUserRides() {
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

            $sql = "SELECT
                        r.*,
                        u.pseudo as driver_name,
                        v.brand, v.model, v.color, v.fuel_type, v.is_ecological,
                        (SELECT COUNT(*) FROM reservations res
                         WHERE res.ride_id = r.id
                         AND res.status_id IN (1, 2)) as confirmed_passengers,
                        (SELECT COUNT(*) FROM reservations res
                         WHERE res.ride_id = r.id
                         AND res.escrow_status = 'blocked') as pending_escrow_count,
                        (SELECT SUM(res.escrow_amount) FROM reservations res
                         WHERE res.ride_id = r.id
                         AND res.escrow_status = 'blocked') as pending_escrow_amount
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    JOIN vehicles v ON r.vehicle_id = v.id
                    WHERE r.driver_id = ?
                    ORDER BY r.departure_datetime DESC";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $rides = $stmt->fetchAll();

            // Ajouter le statut en texte
            foreach ($rides as &$ride) {
                $ride['status'] = $this->getRideStatus($ride['status_id']);
            }

            echo json_encode([
                'success' => true,
                'rides' => $rides
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la récupération des trajets',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }

    public function cancelRide($rideId) {
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
            $rideId = intval($rideId);
            $db = $this->getDatabase();

            // Vérifier que le trajet appartient à l'utilisateur
            $sql = "SELECT r.*, r.departure_city, r.arrival_city FROM rides r WHERE r.id = ? AND r.driver_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId, $userId]);
            $ride = $stmt->fetch();

            if (!$ride) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Trajet non trouvé ou vous n\'êtes pas le conducteur'
                ]);
                return;
            }

            // Vérifier que le trajet n'est pas déjà annulé
            if ($ride['status_id'] == 5) { // 5 = cancelled
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Ce trajet est déjà annulé'
                ]);
                return;
            }

            // Récupérer toutes les réservations actives avec escrow bloqué
            $sql = "SELECT id, user_id, escrow_amount, seats_reserved
                    FROM reservations
                    WHERE ride_id = ? AND status_id IN (1, 2) AND escrow_status = 'blocked'";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $reservations = $stmt->fetchAll();

            $db->beginTransaction();

            try {
                $totalRefunded = 0;
                $passengersRefunded = 0;

                // Rembourser 100% à tous les passagers (conducteur annule = remboursement total)
                foreach ($reservations as $reservation) {
                    $escrowAmount = floatval($reservation['escrow_amount']);
                    $passengerId = $reservation['user_id'];

                    // Récupérer le solde actuel du passager
                    $sql = "SELECT credits, credits_blocked FROM users WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$passengerId]);
                    $passenger = $stmt->fetch();

                    // Rembourser 100% et débloquer les crédits
                    $sql = "UPDATE users
                            SET credits = credits + ?,
                                credits_blocked = credits_blocked - ?
                            WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$escrowAmount, $escrowAmount, $passengerId]);

                    // Mettre à jour la réservation
                    $sql = "UPDATE reservations
                            SET status_id = 4,
                                escrow_status = 'refunded',
                                cancelled_at = NOW(),
                                refund_amount = ?,
                                refund_percentage = 100
                            WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$escrowAmount, $reservation['id']]);

                    // Enregistrer la transaction de remboursement
                    $sql = "INSERT INTO credit_transactions (
                                user_id, amount, type, status, related_reservation_id, related_ride_id,
                                description, escrow_related, balance_before, balance_after, completed_at
                            ) VALUES (?, ?, 'refund', 'completed', ?, ?, ?, TRUE, ?, ?, NOW())";
                    $stmt = $db->prepare($sql);
                    $description = "Remboursement intégral - Trajet {$ride['departure_city']} → {$ride['arrival_city']} annulé par le conducteur";
                    $stmt->execute([
                        $passengerId,
                        $escrowAmount,
                        $reservation['id'],
                        $rideId,
                        $description,
                        $passenger['credits'],
                        $passenger['credits'] + $escrowAmount
                    ]);

                    // Remettre les places disponibles
                    $sql = "UPDATE rides
                            SET available_seats = available_seats + ?
                            WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$reservation['seats_reserved'], $rideId]);

                    $totalRefunded += $escrowAmount;
                    $passengersRefunded++;
                }

                // Mettre à jour le statut du trajet à "annulé" (status_id = 5 dans ride_statuses)
                $sql = "UPDATE rides SET status_id = 5 WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$rideId]);

                $db->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Trajet annulé avec succès',
                    'passengers_refunded' => $passengersRefunded,
                    'total_refunded' => $totalRefunded
                ]);

            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de l\'annulation',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }

    private function getRideStatus($statusId) {
        $statuses = [
            1 => 'pending',
            2 => 'confirmed',
            3 => 'completed',
            4 => 'cancelled'
        ];
        return $statuses[$statusId] ?? 'pending';
    }

    public function validateRidePayments($rideId) {
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
            $rideId = intval($rideId);
            $db = $this->getDatabase();

            // Vérifier que le trajet appartient à l'utilisateur
            $sql = "SELECT r.*, r.departure_datetime
                    FROM rides r
                    WHERE r.id = ? AND r.driver_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId, $userId]);
            $ride = $stmt->fetch();

            if (!$ride) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Trajet non trouvé ou vous n\'êtes pas le conducteur'
                ]);
                return;
            }

            // Vérifier que le trajet est terminé depuis 24h
            $departureDate = new DateTime($ride['departure_datetime']);
            $now = new DateTime();
            $hoursSinceDeparture = ($now->getTimestamp() - $departureDate->getTimestamp()) / 3600;

            if ($hoursSinceDeparture < 24) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Le paiement ne peut être validé que 24h après le départ',
                    'hours_remaining' => ceil(24 - $hoursSinceDeparture)
                ]);
                return;
            }

            // Récupérer toutes les réservations avec escrow bloqué pour ce trajet
            $sql = "SELECT res.id, res.user_id, res.escrow_amount
                    FROM reservations res
                    WHERE res.ride_id = ? AND res.escrow_status = 'blocked'";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $reservations = $stmt->fetchAll();

            if (count($reservations) === 0) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Aucun paiement en attente pour ce trajet'
                ]);
                return;
            }

            $totalAmount = 0;
            $successCount = 0;
            $errorCount = 0;

            // Traiter chaque réservation
            foreach ($reservations as $reservation) {
                $db->beginTransaction();

                try {
                    $escrowAmount = floatval($reservation['escrow_amount']);
                    $passengerId = $reservation['user_id'];

                    // Calculer la commission (2 crédits fixes ou 10% du montant, ce qui est le plus petit)
                    $commission = min(2.0, $escrowAmount * 0.10);
                    $driverAmount = $escrowAmount - $commission;

                    // 1. Débloquer les crédits du passager
                    $sql = "UPDATE users
                            SET credits_blocked = credits_blocked - ?
                            WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$escrowAmount, $passengerId]);

                    // 2. Créditer le conducteur (montant après commission)
                    $sql = "SELECT credits FROM users WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$userId]);
                    $driver = $stmt->fetch();

                    if (!$driver) {
                        throw new Exception('Conducteur non trouvé');
                    }

                    $balanceBefore = floatval($driver['credits']);

                    $sql = "UPDATE users
                            SET credits = credits + ?,
                                total_credits_earned = total_credits_earned + ?
                            WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$driverAmount, $driverAmount, $userId]);

                    $balanceAfter = $balanceBefore + $driverAmount;

                    // 3. Créditer l'admin avec la commission (user_id = 1 pour l'admin)
                    $adminId = 1; // ID du compte admin
                    $sql = "UPDATE users
                            SET credits = credits + ?
                            WHERE id = ? AND role_id = 1";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$commission, $adminId]);

                    // 3. Mettre à jour la réservation
                    $sql = "UPDATE reservations
                            SET escrow_status = 'released',
                                escrow_released_at = NOW(),
                                status_id = 5
                            WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$reservation['id']]);

                    // 4. Enregistrer la transaction pour le conducteur
                    $sql = "INSERT INTO credit_transactions (
                                user_id, amount, type, status, related_reservation_id, related_ride_id,
                                description, escrow_related, balance_before, balance_after, completed_at
                            ) VALUES (?, ?, 'payout', 'completed', ?, ?, ?, TRUE, ?, ?, NOW())";
                    $stmt = $db->prepare($sql);
                    $description = "Paiement trajet {$ride['departure_city']} → {$ride['arrival_city']} - Validation manuelle (après commission {$commission}€)";
                    $stmt->execute([
                        $userId,
                        $driverAmount,
                        $reservation['id'],
                        $rideId,
                        $description,
                        $balanceBefore,
                        $balanceAfter
                    ]);

                    // 5. Enregistrer la transaction de commission pour l'admin
                    $sql = "INSERT INTO credit_transactions (
                                user_id, amount, type, status, related_reservation_id, related_ride_id,
                                description, escrow_related, completed_at
                            ) VALUES (?, ?, 'commission', 'completed', ?, ?, ?, TRUE, NOW())";
                    $stmt = $db->prepare($sql);
                    $commissionDesc = "Commission trajet {$ride['departure_city']} → {$ride['arrival_city']}";
                    $stmt->execute([
                        $adminId,
                        $commission,
                        $reservation['id'],
                        $rideId,
                        $commissionDesc
                    ]);

                    $db->commit();
                    $totalAmount += $driverAmount;
                    $successCount++;

                } catch (Exception $e) {
                    $db->rollBack();
                    error_log('Erreur validation paiement réservation #' . $reservation['id'] . ': ' . $e->getMessage());
                    $errorCount++;
                }
            }

            echo json_encode([
                'success' => true,
                'message' => "Paiement validé avec succès",
                'total_amount' => $totalAmount,
                'reservations_processed' => $successCount,
                'errors' => $errorCount
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la validation du paiement',
                'details' => $e->getMessage()
            ]);
            error_log('Erreur validateRidePayments: ' . $e->getMessage());
        }
    }

    public function getRideForEdit($rideId) {
        header('Content-Type: application/json');

        // Debug temporaire
        error_log("DEBUG: getRideForEdit appelée avec ID: " . $rideId);

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
            $rideId = intval($rideId);
            $db = $this->getDatabase();

            // Récupérer le trajet d'abord
            $sql = "SELECT r.* FROM rides r WHERE r.id = ? AND r.driver_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId, $userId]);
            $ride = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$ride) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Trajet non trouvé ou vous n\'êtes pas le conducteur'
                ]);
                return;
            }

            // Récupérer les infos du véhicule
            $sql = "SELECT * FROM vehicles WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$ride['vehicle_id']]);
            $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);

            // Compter les réservations
            $sql = "SELECT COUNT(*) as reservation_count FROM reservations WHERE ride_id = ? AND status != 'cancelled'";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $reservationCount = $stmt->fetch(PDO::FETCH_ASSOC)['reservation_count'];

            // Ajouter les infos véhicule au trajet
            if ($vehicle) {
                $ride['vehicle_id'] = $vehicle['id'];
                $ride['brand'] = $vehicle['brand'];
                $ride['model'] = $vehicle['model'];
                $ride['color'] = $vehicle['color'];
                $ride['fuel_type'] = $vehicle['fuel_type'];
                $ride['is_ecological'] = $vehicle['is_ecological'];
            }
            $ride['reservation_count'] = $reservationCount;

            // Vérifier que le trajet peut être modifié (pas de réservations ou pas encore parti)
            $departureDate = new DateTime($ride['departure_datetime']);
            $now = new DateTime();

            if ($ride['reservation_count'] > 0 && $departureDate <= $now) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Ce trajet ne peut plus être modifié (déjà parti ou a des réservations)'
                ]);
                return;
            }

            // Récupérer les véhicules de l'utilisateur pour le sélecteur
            $sqlVehicles = "SELECT id, brand, model, color, fuel_type, is_ecological
                           FROM vehicles
                           WHERE user_id = ?
                           ORDER BY brand, model";
            $stmtVehicles = $db->prepare($sqlVehicles);
            $stmtVehicles->execute([$userId]);
            $vehicles = $stmtVehicles->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'ride' => $ride,
                'vehicles' => $vehicles,
                'can_modify_passengers' => $ride['reservation_count'] == 0
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la récupération des données',
                'details' => $e->getMessage()
            ]);
            error_log('Erreur getRideForEdit: ' . $e->getMessage());
        }
    }

    public function updateRide($rideId) {
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

            // Vérifier que c'est une requête PUT ou POST
            if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
                http_response_code(405);
                echo json_encode(['error' => 'Méthode non autorisée']);
                return;
            }

            $userId = $_SESSION['user_id'];
            $rideId = intval($rideId);

            // Récupérer les données JSON
            $input = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Données JSON invalides']);
                return;
            }

            $db = $this->getDatabase();

            // Vérifier que le trajet appartient à l'utilisateur
            $sql = "SELECT r.* FROM rides r WHERE r.id = ? AND r.driver_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId, $userId]);
            $ride = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$ride) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Trajet non trouvé ou vous n\'êtes pas le conducteur'
                ]);
                return;
            }

            // Compter les réservations
            $sql = "SELECT COUNT(*) as reservation_count FROM reservations WHERE ride_id = ? AND status != 'cancelled'";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $reservationCount = $stmt->fetch(PDO::FETCH_ASSOC)['reservation_count'];
            $ride['reservation_count'] = $reservationCount;

            // Valider les données de modification
            if (!$this->validateRideUpdateData($input, $ride)) {
                http_response_code(400);
                echo json_encode(['error' => 'Données invalides']);
                return;
            }

            // Recalculer l'heure d'arrivée si nécessaire
            if (!empty($input['from']) && !empty($input['to']) && !empty($input['date']) && !empty($input['time'])) {
                if (empty($input['arrivalTime'])) {
                    $routeService = new RouteService();
                    $arrivalData = $routeService->calculateArrivalTime(
                        $input['from'],
                        $input['to'],
                        $input['date'],
                        $input['time']
                    );
                    $input['estimated_arrival_datetime'] = $arrivalData['arrival_datetime'];
                    $input['duration_minutes'] = $arrivalData['duration_minutes'];
                } else {
                    $input['estimated_arrival_datetime'] = $input['date'] . ' ' . $input['arrivalTime'] . ':00';

                    $departure = new DateTime($input['date'] . ' ' . $input['time']);
                    $arrival = new DateTime($input['estimated_arrival_datetime']);
                    $interval = $departure->diff($arrival);
                    $input['duration_minutes'] = ($interval->h * 60) + $interval->i;
                }
            }

            // Mettre à jour le trajet
            $this->performRideUpdate($rideId, $input);

            echo json_encode([
                'success' => true,
                'message' => 'Trajet modifié avec succès'
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la modification',
                'details' => $e->getMessage()
            ]);
            error_log('Erreur updateRide: ' . $e->getMessage());
        }
    }

    public function getRidePassengers($rideId) {
        header('Content-Type: application/json');

        // Debug temporaire
        error_log("DEBUG: getRidePassengers appelée avec ID: " . $rideId);

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
            $rideId = intval($rideId);
            $db = $this->getDatabase();

            // Vérifier que le trajet appartient à l'utilisateur
            $sql = "SELECT id FROM rides WHERE id = ? AND driver_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId, $userId]);

            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Trajet non trouvé ou vous n\'êtes pas le conducteur'
                ]);
                return;
            }

            // Récupérer les passagers avec leurs détails
            $sql = "SELECT
                        res.id as reservation_id,
                        res.user_id,
                        res.status,
                        res.seats_reserved,
                        res.total_price,
                        res.created_at,
                        res.escrow_amount,
                        u.pseudo,
                        u.email,
                        u.profile_picture,
                        u.phone,
                        u.avg_rating
                    FROM reservations res
                    JOIN users u ON res.user_id = u.id
                    WHERE res.ride_id = ? AND res.status != 'cancelled'
                    ORDER BY res.created_at ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $passengers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculer les statistiques
            $stats = [
                'total_passengers' => count($passengers),
                'total_seats_reserved' => array_sum(array_column($passengers, 'seats_reserved')),
                'total_revenue' => array_sum(array_column($passengers, 'total_price')),
                'escrow_amount' => array_sum(array_column($passengers, 'escrow_amount'))
            ];

            echo json_encode([
                'success' => true,
                'passengers' => $passengers,
                'stats' => $stats
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la récupération des passagers',
                'details' => $e->getMessage()
            ]);
            error_log('Erreur getRidePassengers: ' . $e->getMessage());
        }
    }

    private function validateRideUpdateData($input, $existingRide) {
        // Validation basique des champs modifiables
        if (isset($input['seats']) && ($input['seats'] < 1 || $input['seats'] > 8)) {
            return false;
        }

        if (isset($input['price']) && ($input['price'] < 1 || $input['price'] > 200)) {
            return false;
        }

        // Vérifier que la date n'est pas dans le passé
        if (isset($input['date']) && isset($input['time'])) {
            $newDeparture = new DateTime($input['date'] . ' ' . $input['time']);
            $now = new DateTime();
            if ($newDeparture <= $now) {
                return false;
            }
        }

        return true;
    }

    private function performRideUpdate($rideId, $input) {
        $db = $this->getDatabase();

        $updateFields = [];
        $values = [];

        // Construire dynamiquement la requête UPDATE
        if (isset($input['from'])) {
            $updateFields[] = "departure_city = ?";
            $values[] = $input['from'];
        }

        if (isset($input['to'])) {
            $updateFields[] = "arrival_city = ?";
            $values[] = $input['to'];
        }

        if (isset($input['date']) && isset($input['time'])) {
            $updateFields[] = "departure_datetime = ?";
            $values[] = $input['date'] . ' ' . $input['time'] . ':00';
        }

        if (isset($input['estimated_arrival_datetime'])) {
            $updateFields[] = "estimated_arrival_datetime = ?";
            $values[] = $input['estimated_arrival_datetime'];
        }

        if (isset($input['duration_minutes'])) {
            $updateFields[] = "duration_minutes = ?";
            $values[] = $input['duration_minutes'];
        }

        if (isset($input['seats'])) {
            $updateFields[] = "available_seats = ?";
            $values[] = $input['seats'];
        }

        if (isset($input['price'])) {
            $updateFields[] = "price_per_seat = ?";
            $values[] = $input['price'];
        }

        if (isset($input['vehicleId'])) {
            $updateFields[] = "vehicle_id = ?";
            $values[] = $input['vehicleId'];
        }

        if (isset($input['description'])) {
            $updateFields[] = "description = ?";
            $values[] = $input['description'];
        }

        if (isset($input['departureAddress'])) {
            $updateFields[] = "departure_address = ?";
            $values[] = $input['departureAddress'];
        }

        if (empty($updateFields)) {
            return; // Rien à mettre à jour
        }

        $values[] = $rideId;

        $sql = "UPDATE rides SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($values);
    }

    private function buildOrderClause($sortBy) {
        switch ($sortBy) {
            case 'price':
                return 'ORDER BY r.price_per_seat ASC';
            case 'rating':
                // Pour l'instant, on trie par nombre d'avis (à améliorer plus tard avec une vraie table de ratings)
                return 'ORDER BY r.departure_datetime ASC'; // Fallback temporaire
            case 'ecological':
                return 'ORDER BY v.is_ecological DESC, v.fuel_type = "electrique" DESC, r.price_per_seat ASC';
            case 'datetime':
            default:
                return 'ORDER BY r.departure_datetime ASC';
        }
    }
}