<?php
namespace EcoRide\Controllers;

use Exception;
use DateTime;

class AuthController extends BaseController {

    public function login() {
        header('Content-Type: application/json');

        try {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Méthode non autorisée']);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Données JSON invalides']);
                return;
            }

            if (empty($input['email']) || empty($input['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email et mot de passe requis']);
                return;
            }

            $user = $this->authenticateUser($input['email'], $input['password']);

            if ($user) {
                // Créer la session
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_pseudo'] = $user['pseudo'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_role'] = $user['role_id'];
                $_SESSION['is_logged_in'] = true;
                $_SESSION['login_time'] = time();

                // Mettre à jour la dernière connexion
                $this->updateLastLogin($user['id']);

                echo json_encode([
                    'success' => true,
                    'message' => 'Connexion réussie',
                    'user' => [
                        'id' => $user['id'],
                        'pseudo' => $user['pseudo'],
                        'email' => $user['email'],
                        'credits' => $user['credits']
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Email ou mot de passe incorrect']);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur interne du serveur', 'details' => $e->getMessage()]); // Include details for debugging
            error_log($e->getMessage());
        }
    }

    public function register() {
        header('Content-Type: application/json');

        try {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Méthode non autorisée']);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Données JSON invalides']);
                return;
            }

            if (empty($input['email']) || empty($input['password']) || empty($input['pseudo'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email, mot de passe et pseudo sont requis']);
                return;
            }

            // Validation
            if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Email invalide']);
                return;
            }

            if (strlen($input['password']) < 6) {
                http_response_code(400);
                echo json_encode(['error' => 'Le mot de passe doit contenir au moins 6 caractères']);
                return;
            }

            if (strlen($input['pseudo']) < 3) {
                http_response_code(400);
                echo json_encode(['error' => 'Le pseudo doit contenir au moins 3 caractères']);
                return;
            }

            // Validation optionnelle des champs supplémentaires
            if (!empty($input['birthdate'])) {
                $birthdate = DateTime::createFromFormat('Y-m-d', $input['birthdate']);
                if (!$birthdate || $birthdate->format('Y-m-d') !== $input['birthdate']) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Format de date de naissance invalide (YYYY-MM-DD)']);
                    return;
                }
            }

            if (!empty($input['gender']) && !in_array($input['gender'], ['male', 'female', 'other', 'prefer_not_to_say'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Genre invalide']);
                return;
            }

            if (!empty($input['phone']) && !preg_match('/^(\+33|0)[1-9](\d{8})$/', $input['phone'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Numéro de téléphone invalide']);
                return;
            }

            // Vérifier si l'utilisateur existe déjà
            if ($this->userExists($input['email'], $input['pseudo'])) {
                http_response_code(409);
                echo json_encode(['error' => 'Cet email ou ce pseudo est déjà utilisé']);
                return;
            }

            // Créer l'utilisateur
            $userId = $this->createUser($input);

            if ($userId) {
                // Connexion automatique après inscription
                $user = $this->getUserById($userId);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_pseudo'] = $user['pseudo'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_role'] = $user['role_id'];
                $_SESSION['is_logged_in'] = true;
                $_SESSION['login_time'] = time();

                echo json_encode([
                    'success' => true,
                    'message' => 'Compte créé avec succès',
                    'user' => [
                        'id' => $user['id'],
                        'pseudo' => $user['pseudo'],
                        'email' => $user['email'],
                        'credits' => $user['credits']
                    ]
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Erreur lors de la création du compte']);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur interne du serveur', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    public function logout() {
        header('Content-Type: application/json');

        try {
            // Nettoyer les variables de session
            $_SESSION = [];
            session_destroy();

            echo json_encode([
                'success' => true,
                'message' => 'Déconnexion réussie'
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la déconnexion', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    public function getProfile() {
        header('Content-Type: application/json');

        try {
            if (!isset($_SESSION['is_logged_in']) || !$_SESSION['is_logged_in']) {
                http_response_code(401);
                echo json_encode(['error' => 'Non connecté']);
                return;
            }

            $user = $this->getUserById($_SESSION['user_id']);

            if ($user) {
                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $user['id'],
                        'pseudo' => $user['pseudo'],
                        'email' => $user['email'],
                        'phone' => $user['phone'],
                        'address' => $user['address'],
                        'birthdate' => $user['birthdate'],
                        'gender' => $user['gender'],
                        'bio' => $user['bio'],
                        'credits' => $user['credits'],
                        'rating' => $user['rating_average'],
                        'totalRidesAsDriver' => $user['total_rides_as_driver'],
                        'totalRidesAsPassenger' => $user['total_rides_as_passenger']
                    ]
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Utilisateur non trouvé']);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur interne du serveur', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    public function checkSession() {
        header('Content-Type: application/json');

        $isLoggedIn = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'];

        echo json_encode([
            'isLoggedIn' => $isLoggedIn,
            'user' => $isLoggedIn ? [
                'id' => $_SESSION['user_id'],
                'pseudo' => $_SESSION['user_pseudo'],
                'email' => $_SESSION['user_email']
            ] : null
        ]);
    }

    private function authenticateUser($email, $password) {
        $db = $this->getDatabase();
        $sql = "SELECT id, email, password_hash, pseudo, role_id, credits, rating_average,
                       total_rides_as_driver, total_rides_as_passenger, is_active
                FROM users
                WHERE email = ? AND is_active = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            return $user;
        }

        return false;
    }

    private function userExists($email, $pseudo) {
        $db = $this->getDatabase();
        $sql = "SELECT id FROM users WHERE email = ? OR pseudo = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$email, $pseudo]);
        return $stmt->fetch() !== false;
    }

    private function createUser($data) {
        try {
            $db = $this->getDatabase();

            // Préparer les données optionnelles
            $phone = !empty($data['phone']) ? $data['phone'] : null;
            $address_user = !empty($data['address_user']) ? $data['address_user'] : null;
            $birthdate = !empty($data['birthdate']) ? $data['birthdate'] : null;
            $gender = !empty($data['gender']) ? $data['gender'] : null;
            $bio = !empty($data['bio']) ? $data['bio'] : null;

            $sql = "INSERT INTO users (
                        email, password_hash, pseudo, phone, address_user,
                        birthdate, gender, bio, role_id, credits, is_active, is_verified
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, 20, 1, 0)";

            $stmt = $db->prepare($sql);
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

            $result = $stmt->execute([
                $data['email'],
                $passwordHash,
                $data['pseudo'],
                $phone,
                $address_user,
                $birthdate,
                $gender,
                $bio
            ]);

            return $result ? $db->lastInsertId() : false;

        } catch (Exception $e) {
            error_log('Erreur createUser: ' . $e->getMessage());
            return false;
        }
    }

    private function getUserById($userId) {
        $db = $this->getDatabase();
        $sql = "SELECT id, email, pseudo, phone, address_user, birthdate, gender, bio,
                       role_id, credits, rating_average, total_rides_as_driver, total_rides_as_passenger
                FROM users
                WHERE id = ? AND is_active = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    public function updateProfile() {
        header('Content-Type: application/json');

        try {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Méthode non autorisée']);
                return;
            }

            if (!isset($_SESSION['is_logged_in']) || !$_SESSION['is_logged_in']) {
                http_response_code(401);
                echo json_encode(['error' => 'Non connecté']);
                return;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Données JSON invalides']);
                return;
            }

            $userId = $_SESSION['user_id'];
            $db = $this->getDatabase();

            // Validation optionnelle des champs
            if (!empty($input['phone']) && !preg_match('/^(\+33|0)[1-9](\d{8})$/', $input['phone'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Numéro de téléphone invalide']);
                return;
            }

            if (!empty($input['birthdate'])) {
                $birthdate = DateTime::createFromFormat('Y-m-d', $input['birthdate']);
                if (!$birthdate || $birthdate->format('Y-m-d') !== $input['birthdate']) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Format de date de naissance invalide (YYYY-MM-DD)']);
                    return;
                }
            }

            if (!empty($input['gender']) && !in_array($input['gender'], ['male', 'female', 'other', 'prefer_not_to_say'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Genre invalide']);
                return;
            }

            // Mise à jour du profil
            $sql = "UPDATE users SET
                        phone = ?,
                        address_user = ?,
                        birthdate = ?,
                        gender = ?,
                        bio = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?";

            $stmt = $db->prepare($sql);
            $result = $stmt->execute([
                $input['phone'] ?? null,
                $input['address'] ?? null,
                $input['birthdate'] ?? null,
                $input['gender'] ?? null,
                $input['bio'] ?? null,
                $userId
            ]);

            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Profil mis à jour avec succès'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Erreur lors de la mise à jour']);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur interne du serveur', 'details' => $e->getMessage()]);
            error_log($e->getMessage());
        }
    }

    private function updateLastLogin($userId) {
        try {
            $db = $this->getDatabase();
            $sql = "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
        } catch (Exception $e) {
            error_log('Erreur updateLastLogin: ' . $e->getMessage());
            // Ignore silencieusement, car non critique
        }
    }
}