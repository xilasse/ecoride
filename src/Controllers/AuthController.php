<?php
namespace EcoRide\Controllers;

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
            echo json_encode(['error' => 'Erreur interne du serveur']);
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

            if (empty($input['email']) || empty($input['password']) || empty($input['pseudo'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Tous les champs sont requis']);
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
            echo json_encode(['error' => 'Erreur interne du serveur']);
            error_log($e->getMessage());
        }
    }

    public function logout() {
        header('Content-Type: application/json');

        try {
            // Détruire la session
            session_destroy();

            echo json_encode([
                'success' => true,
                'message' => 'Déconnexion réussie'
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la déconnexion']);
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
                        'fullName' => $user['full_name'],
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
            echo json_encode(['error' => 'Erreur interne du serveur']);
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
        $sql = "SELECT id, email, password_hash, pseudo, role_id, credits, rating_average,
                       total_rides_as_driver, total_rides_as_passenger, is_active
                FROM users
                WHERE email = ? AND is_active = 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            return $user;
        }

        return false;
    }

    private function userExists($email, $pseudo) {
        $sql = "SELECT id FROM users WHERE email = ? OR pseudo = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email, $pseudo]);
        return $stmt->fetch() !== false;
    }

    private function createUser($data) {
        $sql = "INSERT INTO users (email, password_hash, pseudo, role_id, credits, is_active, is_verified)
                VALUES (?, ?, ?, 3, 20, 1, 0)";

        $stmt = $this->db->prepare($sql);
        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

        $result = $stmt->execute([
            $data['email'],
            $passwordHash,
            $data['pseudo']
        ]);

        return $result ? $this->db->lastInsertId() : false;
    }

    private function getUserById($userId) {
        $sql = "SELECT id, email, pseudo, full_name, phone, address, birthdate, gender, bio,
                       role_id, credits, rating_average, total_rides_as_driver, total_rides_as_passenger
                FROM users
                WHERE id = ? AND is_active = 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    private function updateLastLogin($userId) {
        $sql = "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
    }
}