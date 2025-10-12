<?php
namespace EcoRide\Controllers;

use Exception;
use PDO;

class ReservationController extends BaseController {

    public function getUserReservations() {
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
                        res.*,
                        r.departure_city,
                        r.arrival_city,
                        r.departure_datetime,
                        r.estimated_arrival_datetime,
                        r.duration_minutes,
                        r.price_per_seat,
                        r.departure_address,
                        r.driver_id,
                        u.pseudo as driver_name,
                        u.profile_picture as driver_avatar,
                        v.brand,
                        v.model,
                        v.color,
                        v.fuel_type,
                        v.is_ecological
                    FROM reservations res
                    JOIN rides r ON res.ride_id = r.id
                    JOIN users u ON r.driver_id = u.id
                    JOIN vehicles v ON r.vehicle_id = v.id
                    WHERE res.user_id = ?
                    ORDER BY r.departure_datetime DESC";

            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $reservations = $stmt->fetchAll();

            // Ajouter le statut en texte
            foreach ($reservations as &$reservation) {
                $reservation['status'] = $this->getReservationStatus($reservation['status_id']);
            }

            echo json_encode([
                'success' => true,
                'reservations' => $reservations
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la récupération des réservations',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }

    public function cancelReservation($reservationId) {
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
            $reservationId = intval($reservationId);

            // Vérifier que la réservation appartient à l'utilisateur
            $sql = "SELECT res.*, r.departure_datetime
                    FROM reservations res
                    JOIN rides r ON res.ride_id = r.id
                    WHERE res.id = ? AND res.user_id = ?";
            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$reservationId, $userId]);
            $reservation = $stmt->fetch();

            if (!$reservation) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Réservation non trouvée'
                ]);
                return;
            }

            // Vérifier que le trajet n'est pas déjà passé
            $now = new \DateTime();
            $departureDate = new \DateTime($reservation['departure_datetime']);
            if ($departureDate < $now) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Impossible d\'annuler une réservation pour un trajet déjà passé'
                ]);
                return;
            }

            // Mettre à jour le statut à "annulé" (status_id = 4)
            $sql = "UPDATE reservations SET status_id = 4 WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$reservationId]);

            // Incrémenter le nombre de places disponibles dans le trajet
            $sql = "UPDATE rides
                    SET available_seats = available_seats + ?
                    WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $reservation['seats_reserved'],
                $reservation['ride_id']
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Réservation annulée avec succès'
            ]);

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

    public function createReservation() {
        header('Content-Type: application/json');

        try {
            // Vérifier que l'utilisateur est connecté
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous devez être connecté pour réserver'
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
            if (empty($input['ride_id']) || empty($input['seats'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Trajet et nombre de places requis']);
                return;
            }

            $rideId = intval($input['ride_id']);
            $seatsRequested = intval($input['seats']);

            // Vérifier que le trajet existe et a assez de places
            $db = $this->getDatabase();
            $sql = "SELECT * FROM rides WHERE id = ? AND status_id IN (1, 2)";
            $stmt = $db->prepare($sql);
            $stmt->execute([$rideId]);
            $ride = $stmt->fetch();

            if (!$ride) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Trajet non trouvé ou non disponible'
                ]);
                return;
            }

            // Vérifier que l'utilisateur n'est pas le conducteur
            if ($ride['driver_id'] == $userId) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous ne pouvez pas réserver votre propre trajet'
                ]);
                return;
            }

            // Vérifier les places disponibles
            if ($ride['available_seats'] < $seatsRequested) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Pas assez de places disponibles'
                ]);
                return;
            }

            // Vérifier qu'il n'y a pas déjà une réservation active
            $sql = "SELECT id FROM reservations
                    WHERE user_id = ? AND ride_id = ? AND status_id IN (1, 2)";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId, $rideId]);
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous avez déjà une réservation active pour ce trajet'
                ]);
                return;
            }

            // Créer la réservation
            $sql = "INSERT INTO reservations (user_id, ride_id, seats_reserved, status_id)
                    VALUES (?, ?, ?, 1)";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId, $rideId, $seatsRequested]);

            $reservationId = $db->lastInsertId();

            // Décrémenter le nombre de places disponibles
            $sql = "UPDATE rides
                    SET available_seats = available_seats - ?
                    WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$seatsRequested, $rideId]);

            echo json_encode([
                'success' => true,
                'message' => 'Réservation créée avec succès',
                'reservationId' => $reservationId
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la création de la réservation',
                'details' => $e->getMessage()
            ]);
            error_log($e->getMessage());
        }
    }

    private function getReservationStatus($statusId) {
        $statuses = [
            1 => 'pending',
            2 => 'confirmed',
            3 => 'rejected',
            4 => 'cancelled',
            5 => 'completed'
        ];
        return $statuses[$statusId] ?? 'pending';
    }
}
