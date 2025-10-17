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
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Vous devez être connecté']);
                return;
            }

            $userId = $_SESSION['user_id'];
            $reservationId = intval($reservationId);

            $sql = "SELECT res.*, r.departure_datetime, r.driver_id, r.departure_city, r.arrival_city
                    FROM reservations res
                    JOIN rides r ON res.ride_id = r.id
                    WHERE res.id = ? AND res.user_id = ?";
            $db = $this->getDatabase();
            $stmt = $db->prepare($sql);
            $stmt->execute([$reservationId, $userId]);
            $reservation = $stmt->fetch();

            if (!$reservation) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Réservation non trouvée']);
                return;
            }

            if (in_array($reservation['status_id'], [4, 5])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Cette réservation ne peut plus être annulée']);
                return;
            }

            if ($reservation['escrow_status'] !== 'blocked') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Le paiement a déjà été traité']);
                return;
            }

            $now = new \DateTime();
            $departureDate = new \DateTime($reservation['departure_datetime']);
            if ($departureDate < $now) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Impossible d\'annuler un trajet passé']);
                return;
            }

            $hoursBeforeDeparture = ($departureDate->getTimestamp() - $now->getTimestamp()) / 3600;
            $escrowAmount = floatval($reservation['escrow_amount']);

            if ($hoursBeforeDeparture > 168) {
                $refundPercent = 100;
                $conductorCompensation = 0;
            } elseif ($hoursBeforeDeparture > 72) {
                $refundPercent = 75;
                $conductorCompensation = 25;
            } elseif ($hoursBeforeDeparture > 24) {
                $refundPercent = 50;
                $conductorCompensation = 50;
            } elseif ($hoursBeforeDeparture > 6) {
                $refundPercent = 25;
                $conductorCompensation = 75;
            } else {
                $refundPercent = 0;
                $conductorCompensation = 100;
            }

            $refundAmount = ($escrowAmount * $refundPercent) / 100;
            $compensationAmount = ($escrowAmount * $conductorCompensation) / 100;

            $sql = "SELECT credits, credits_blocked FROM users WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $passenger = $stmt->fetch();

            $db->beginTransaction();

            try {
                $sql = "UPDATE users SET credits = credits + ?, credits_blocked = credits_blocked - ? WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$refundAmount, $escrowAmount, $userId]);

                if ($compensationAmount > 0) {
                    $sql = "SELECT credits FROM users WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$reservation['driver_id']]);
                    $driver = $stmt->fetch();

                    $sql = "UPDATE users SET credits = credits + ?, total_credits_earned = total_credits_earned + ? WHERE id = ?";
                    $stmt = $db->prepare($sql);
                    $stmt->execute([$compensationAmount, $compensationAmount, $reservation['driver_id']]);

                    $sql = "INSERT INTO credit_transactions (user_id, amount, type, status, related_reservation_id, related_ride_id, description, escrow_related, balance_before, balance_after, completed_at) VALUES (?, ?, 'compensation', 'completed', ?, ?, ?, TRUE, ?, ?, NOW())";
                    $stmt = $db->prepare($sql);
                    $description = "Compensation annulation trajet {$reservation['departure_city']} → {$reservation['arrival_city']} ({$conductorCompensation}%)";
                    $stmt->execute([$reservation['driver_id'], $compensationAmount, $reservationId, $reservation['ride_id'], $description, $driver['credits'], $driver['credits'] + $compensationAmount]);
                }

                $sql = "UPDATE reservations SET status_id = 4, escrow_status = 'refunded', cancelled_at = NOW(), refund_amount = ?, refund_percentage = ? WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$refundAmount, $refundPercent, $reservationId]);

                $sql = "UPDATE rides SET available_seats = available_seats + ? WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$reservation['seats_reserved'], $reservation['ride_id']]);

                $sql = "INSERT INTO credit_transactions (user_id, amount, type, status, related_reservation_id, related_ride_id, description, escrow_related, balance_before, balance_after, completed_at) VALUES (?, ?, 'refund', 'completed', ?, ?, ?, TRUE, ?, ?, NOW())";
                $stmt = $db->prepare($sql);
                $description = "Remboursement annulation trajet {$reservation['departure_city']} → {$reservation['arrival_city']} ({$refundPercent}%)";
                $stmt->execute([$userId, $refundAmount, $reservationId, $reservation['ride_id'], $description, $passenger['credits'], $passenger['credits'] + $refundAmount]);

                $db->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Réservation annulée avec succès',
                    'refund' => ['amount' => $refundAmount, 'percentage' => $refundPercent, 'original_amount' => $escrowAmount],
                    'compensation' => ['amount' => $compensationAmount, 'percentage' => $conductorCompensation],
                    'new_balance' => floatval($passenger['credits']) + $refundAmount,
                    'hours_before_departure' => round($hoursBeforeDeparture, 1)
                ]);

            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'annulation', 'details' => $e->getMessage()]);
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
            if (empty($input['ride_id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Trajet requis']);
                return;
            }

            $rideId = intval($input['ride_id']);
            $price = floatval($input['price'] ?? 0);
            $reservationFor = !empty($input['reservation_for']) ? trim($input['reservation_for']) : null;
            $paymentMethod = $input['payment_method'] ?? 'credits_escrow';

            // Vérifier que le trajet existe et récupérer les informations
            $db = $this->getDatabase();
            $sql = "SELECT r.*, u.pseudo as driver_name
                    FROM rides r
                    JOIN users u ON r.driver_id = u.id
                    WHERE r.id = ? AND r.status_id IN (1, 2)";
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
            if ($ride['available_seats'] < 1) {
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

            // Récupérer le solde de crédits de l'utilisateur
            $sql = "SELECT credits, credits_blocked FROM users WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Utilisateur non trouvé'
                ]);
                return;
            }

            // Vérifier que l'utilisateur a assez de crédits
            if ($user['credits'] < $price) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Solde de crédits insuffisant',
                    'required' => $price,
                    'available' => $user['credits']
                ]);
                return;
            }

            // Démarrer une transaction
            $db->beginTransaction();

            try {
                // 1. Bloquer les crédits (débiter du compte disponible et ajouter au compte bloqué)
                $sql = "UPDATE users
                        SET credits = credits - ?,
                            credits_blocked = credits_blocked + ?
                        WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$price, $price, $userId]);

                // 2. Créer la réservation avec escrow
                $sql = "INSERT INTO reservations (
                            user_id, ride_id, seats_reserved, status_id, total_price,
                            escrow_amount, escrow_status, payment_method, reservation_for
                        ) VALUES (?, ?, 1, 2, ?, ?, 'blocked', ?, ?)";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    $userId,
                    $rideId,
                    $price,
                    $price,
                    $paymentMethod,
                    $reservationFor
                ]);

                $reservationId = $db->lastInsertId();

                // 3. Enregistrer la transaction de crédit
                $sql = "INSERT INTO credit_transactions (
                            user_id, amount, type, status, related_reservation_id, related_ride_id,
                            description, escrow_related, balance_before, balance_after, completed_at
                        ) VALUES (?, ?, 'reservation', 'completed', ?, ?, ?, TRUE, ?, ?, NOW())";
                $stmt = $db->prepare($sql);
                $balanceBefore = $user['credits'];
                $balanceAfter = $user['credits'] - $price;
                $description = "Réservation trajet {$ride['departure_city']} → {$ride['arrival_city']} - Crédits bloqués en escrow";
                $stmt->execute([
                    $userId,
                    -$price, // Négatif car c'est un débit
                    $reservationId,
                    $rideId,
                    $description,
                    $balanceBefore,
                    $balanceAfter
                ]);

                // 4. Décrémenter le nombre de places disponibles
                $sql = "UPDATE rides
                        SET available_seats = available_seats - 1
                        WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$rideId]);

                // Valider la transaction
                $db->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Réservation créée avec succès',
                    'reservationId' => $reservationId,
                    'escrow' => [
                        'amount' => $price,
                        'status' => 'blocked',
                        'message' => 'Vos crédits sont sécurisés et seront versés au conducteur 24-48h après le trajet'
                    ],
                    'newBalance' => $balanceAfter,
                    'blockedCredits' => floatval($user['credits_blocked']) + $price
                ]);

            } catch (Exception $e) {
                // Annuler la transaction en cas d'erreur
                $db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la création de la réservation',
                'details' => $e->getMessage()
            ]);
            error_log('Erreur createReservation: ' . $e->getMessage());
        }
    }

    /**
     * Libère l'escrow et transfère les crédits au conducteur
     * Appelé automatiquement 24-48h après la fin du trajet
     */
    public function releaseEscrow($reservationId) {
        header('Content-Type: application/json');

        try {
            $reservationId = intval($reservationId);
            $db = $this->getDatabase();

            // Récupérer la réservation avec les infos du trajet et du conducteur
            $sql = "SELECT res.*, r.driver_id, r.departure_city, r.arrival_city, r.estimated_arrival_datetime
                    FROM reservations res
                    JOIN rides r ON res.ride_id = r.id
                    WHERE res.id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$reservationId]);
            $reservation = $stmt->fetch();

            if (!$reservation) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Réservation non trouvée'
                ]);
                return;
            }

            // Vérifier que l'escrow est toujours bloqué
            if ($reservation['escrow_status'] !== 'blocked') {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'L\'escrow a déjà été traité',
                    'current_status' => $reservation['escrow_status']
                ]);
                return;
            }

            $escrowAmount = floatval($reservation['escrow_amount']);
            $passengerId = $reservation['user_id'];
            $driverId = $reservation['driver_id'];

            // Démarrer une transaction
            $db->beginTransaction();

            try {
                // 1. Débloquer les crédits du passager
                $sql = "UPDATE users
                        SET credits_blocked = credits_blocked - ?
                        WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$escrowAmount, $passengerId]);

                // 2. Créditer le conducteur
                $sql = "SELECT credits FROM users WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$driverId]);
                $driver = $stmt->fetch();

                if (!$driver) {
                    throw new Exception('Conducteur non trouvé');
                }

                $sql = "UPDATE users
                        SET credits = credits + ?,
                            total_credits_earned = total_credits_earned + ?
                        WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$escrowAmount, $escrowAmount, $driverId]);

                // 3. Mettre à jour la réservation
                $sql = "UPDATE reservations
                        SET escrow_status = 'released',
                            escrow_released_at = NOW(),
                            status_id = 5
                        WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$reservationId]);

                // 4. Enregistrer la transaction pour le conducteur
                $sql = "INSERT INTO credit_transactions (
                            user_id, amount, type, status, related_reservation_id, related_ride_id,
                            description, escrow_related, balance_before, balance_after, completed_at
                        ) VALUES (?, ?, 'payout', 'completed', ?, ?, ?, TRUE, ?, ?, NOW())";
                $stmt = $db->prepare($sql);
                $balanceBefore = $driver['credits'];
                $balanceAfter = $driver['credits'] + $escrowAmount;
                $description = "Paiement trajet {$reservation['departure_city']} → {$reservation['arrival_city']} - Escrow libéré";
                $stmt->execute([
                    $driverId,
                    $escrowAmount,
                    $reservationId,
                    $reservation['ride_id'],
                    $description,
                    $balanceBefore,
                    $balanceAfter
                ]);

                // Valider la transaction
                $db->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Escrow libéré avec succès',
                    'amount' => $escrowAmount,
                    'driver_id' => $driverId,
                    'driver_new_balance' => $balanceAfter
                ]);

            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la libération de l\'escrow',
                'details' => $e->getMessage()
            ]);
            error_log('Erreur releaseEscrow: ' . $e->getMessage());
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
