<?php
namespace EcoRide\Controllers;

use Exception;
use DateTime;

class AuthController extends BaseController {

    // Constantes de validation
    private const ALLOWED_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];
    private const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    private const IMAGE_EXTENSION_MAP = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp'
    ];
    private const MAX_AVATAR_SIZE = 2097152; // 2MB en bytes
    private const MIN_IMAGE_DIMENSION = 50;
    private const MAX_IMAGE_DIMENSION = 4000;

    /**
     * Vérifie que la requête est POST
     */
    private function ensurePostMethod() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Méthode non autorisée']);
            return false;
        }
        return true;
    }

    /**
     * Parse et valide le JSON de la requête
     */
    private function parseJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['error' => 'Données JSON invalides']);
            return false;
        }
        return $input;
    }

    /**
     * Vérifie que l'utilisateur est connecté
     */
    private function ensureAuthenticated() {
        if (!isset($_SESSION['is_logged_in']) || !$_SESSION['is_logged_in']) {
            http_response_code(401);
            echo json_encode(['error' => 'Non connecté']);
            return false;
        }
        return true;
    }

    /**
     * Créer une session pour un utilisateur
     */
    private function createUserSession($user) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_pseudo'] = $user['pseudo'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_role'] = $user['role_id'];
        $_SESSION['is_logged_in'] = true;
        $_SESSION['login_time'] = time();
    }

    /**
     * Valide une date de naissance
     */
    private function validateBirthdate($birthdate) {
        if (empty($birthdate)) {
            return true; // Optionnel
        }
        $date = DateTime::createFromFormat('Y-m-d', $birthdate);
        if (!$date || $date->format('Y-m-d') !== $birthdate) {
            http_response_code(400);
            echo json_encode(['error' => 'Format de date de naissance invalide (YYYY-MM-DD)']);
            return false;
        }
        return true;
    }

    /**
     * Valide un genre
     */
    private function validateGender($gender) {
        if (empty($gender)) {
            return true; // Optionnel
        }
        if (!in_array($gender, self::ALLOWED_GENDERS)) {
            http_response_code(400);
            echo json_encode(['error' => 'Genre invalide']);
            return false;
        }
        return true;
    }

    /**
     * Gère les erreurs de manière centralisée
     */
    private function handleError(Exception $e, $context = '') {
        http_response_code(500);
        echo json_encode([
            'error' => 'Erreur interne du serveur',
            'details' => $e->getMessage()
        ]);
        error_log($context . ': ' . $e->getMessage());
    }

    public function login() {
        header('Content-Type: application/json');

        try {
            if (!$this->ensurePostMethod()) return;

            $input = $this->parseJsonInput();
            if ($input === false) return;

            if (empty($input['email']) || empty($input['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email et mot de passe requis']);
                return;
            }

            $user = $this->authenticateUser($input['email'], $input['password']);

            if ($user) {
                $this->createUserSession($user);
                $this->updateLastLogin($user['id']);

                echo json_encode([
                    'success' => true,
                    'message' => 'Connexion réussie',
                    'user' => [
                        'id' => $user['id'],
                        'pseudo' => $user['pseudo'],
                        'email' => $user['email'],
                        'credits' => $user['credits'],
                        'credits_blocked' => $user['credits_blocked'] ?? 0
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Email ou mot de passe incorrect']);
            }

        } catch (Exception $e) {
            $this->handleError($e, 'Login');
        }
    }

    public function register() {
        header('Content-Type: application/json');

        try {
            if (!$this->ensurePostMethod()) return;

            $input = $this->parseJsonInput();
            if ($input === false) return;

            if (empty($input['email']) || empty($input['password']) || empty($input['pseudo'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email, mot de passe et pseudo sont requis']);
                return;
            }

            // Validation des champs obligatoires
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

            // Validation des champs optionnels
            if (!$this->validateBirthdate($input['birthdate'] ?? '')) return;
            if (!$this->validateGender($input['gender'] ?? '')) return;

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
                $user = $this->getUserById($userId);
                $this->createUserSession($user);

                echo json_encode([
                    'success' => true,
                    'message' => 'Compte créé avec succès',
                    'user' => [
                        'id' => $user['id'],
                        'pseudo' => $user['pseudo'],
                        'email' => $user['email'],
                        'credits' => $user['credits'],
                        'credits_blocked' => $user['credits_blocked'] ?? 0
                    ]
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Erreur lors de la création du compte']);
            }

        } catch (Exception $e) {
            $this->handleError($e, 'Register');
        }
    }

    public function logout() {
        header('Content-Type: application/json');

        try {
            $_SESSION = [];
            session_destroy();

            echo json_encode([
                'success' => true,
                'message' => 'Déconnexion réussie'
            ]);

        } catch (Exception $e) {
            $this->handleError($e, 'Logout');
        }
    }

    public function getProfile() {
        header('Content-Type: application/json');

        try {
            if (!$this->ensureAuthenticated()) return;

            $user = $this->getUserById($_SESSION['user_id']);

            if ($user) {
                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $user['id'],
                        'pseudo' => $user['pseudo'],
                        'email' => $user['email'],
                        'phone' => $user['phone'],
                        'city' => $user['city'],
                        'birthdate' => $user['birthdate'],
                        'gender' => $user['gender'],
                        'bio' => $user['bio'],
                        'profile_picture' => $user['profile_picture'],
                        'role_id' => $user['role_id'],
                        'credits' => $user['credits'],
                        'credits_blocked' => $user['credits_blocked'] ?? 0,
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
            $this->handleError($e, 'GetProfile');
        }
    }

    public function checkSession() {
        header('Content-Type: application/json');

        $isLoggedIn = isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'];

        if ($isLoggedIn) {
            // Récupérer les informations complètes depuis la BDD pour avoir les crédits à jour
            $user = $this->getUserById($_SESSION['user_id']);

            if ($user) {
                echo json_encode([
                    'isLoggedIn' => true,
                    'user' => [
                        'id' => $user['id'],
                        'pseudo' => $user['pseudo'],
                        'email' => $user['email'],
                        'credits' => $user['credits'],
                        'credits_blocked' => $user['credits_blocked'] ?? 0,
                        'role_id' => $user['role_id']
                    ]
                ]);
            } else {
                // Session invalide, détruire la session
                $_SESSION = [];
                session_destroy();
                echo json_encode([
                    'isLoggedIn' => false,
                    'user' => null
                ]);
            }
        } else {
            echo json_encode([
                'isLoggedIn' => false,
                'user' => null
            ]);
        }
    }

    private function authenticateUser($email, $password) {
        $db = $this->getDatabase();
        $sql = "SELECT id, email, password_hash, pseudo, role_id, credits, credits_blocked, rating_average,
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
            $city = !empty($data['city']) ? $data['city'] : null;
            $birthdate = !empty($data['birthdate']) ? $data['birthdate'] : null;
            $gender = !empty($data['gender']) ? $data['gender'] : null;
            $bio = !empty($data['bio']) ? $data['bio'] : null;

            $sql = "INSERT INTO users (
                        email, password_hash, pseudo, phone, city,
                        birthdate, gender, bio, role_id, credits, is_active, is_verified
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, 20, 1, 0)";

            $stmt = $db->prepare($sql);
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);

            $result = $stmt->execute([
                $data['email'],
                $passwordHash,
                $data['pseudo'],
                $phone,
                $city,
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
        $sql = "SELECT id, email, pseudo, phone, city, birthdate, gender, bio,
                       role_id, credits, credits_blocked, rating_average, total_rides_as_driver, total_rides_as_passenger,
                       profile_picture
                FROM users
                WHERE id = ? AND is_active = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    public function updateProfile() {
        header('Content-Type: application/json');

        try {
            if (!$this->ensurePostMethod()) return;
            if (!$this->ensureAuthenticated()) return;

            $input = $this->parseJsonInput();
            if ($input === false) return;

            // Validation des champs
            if (!empty($input['phone']) && strlen($input['phone']) < 8) {
                http_response_code(400);
                echo json_encode(['error' => 'Numéro de téléphone trop court']);
                return;
            }

            if (!$this->validateBirthdate($input['birthdate'] ?? '')) return;
            if (!$this->validateGender($input['gender'] ?? '')) return;

            // Mise à jour du profil
            $db = $this->getDatabase();
            $sql = "UPDATE users SET
                        phone = ?,
                        city = ?,
                        birthdate = ?,
                        gender = ?,
                        bio = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?";

            $stmt = $db->prepare($sql);
            $result = $stmt->execute([
                !empty($input['phone']) ? $input['phone'] : null,
                !empty($input['city']) ? $input['city'] : null,
                !empty($input['birthdate']) ? $input['birthdate'] : null,
                !empty($input['gender']) ? $input['gender'] : null,
                !empty($input['bio']) ? $input['bio'] : null,
                $_SESSION['user_id']
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
            $this->handleError($e, 'UpdateProfile');
        }
    }

    public function uploadAvatar() {
        header('Content-Type: application/json');

        try {
            if (!$this->ensurePostMethod()) return;
            if (!$this->ensureAuthenticated()) return;

            // Vérifier qu'un fichier a été uploadé
            if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Aucun fichier uploadé ou erreur d\'upload']);
                return;
            }

            $file = $_FILES['avatar'];
            $userId = $_SESSION['user_id'];

            // Vérifier le type de fichier avec finfo (MIME type réel)
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mimeType, self::ALLOWED_IMAGE_TYPES)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WebP.']);
                return;
            }

            // Mapper le MIME type vers une extension sécurisée
            $extension = self::IMAGE_EXTENSION_MAP[$mimeType];

            // Vérifier la taille
            if ($file['size'] > self::MAX_AVATAR_SIZE) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Le fichier ne doit pas dépasser 2MB']);
                return;
            }

            // Vérifier que c'est vraiment une image valide
            $imageInfo = @getimagesize($file['tmp_name']);
            if ($imageInfo === false) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Le fichier n\'est pas une image valide']);
                return;
            }

            // Vérifier les dimensions
            list($width, $height) = $imageInfo;
            if ($width < self::MIN_IMAGE_DIMENSION || $height < self::MIN_IMAGE_DIMENSION) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => "L'image doit faire au moins {self::MIN_IMAGE_DIMENSION}x{self::MIN_IMAGE_DIMENSION} pixels"]);
                return;
            }
            if ($width > self::MAX_IMAGE_DIMENSION || $height > self::MAX_IMAGE_DIMENSION) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => "L'image ne doit pas dépasser {self::MAX_IMAGE_DIMENSION}x{self::MAX_IMAGE_DIMENSION} pixels"]);
                return;
            }

            // Générer un nom de fichier basé sur l'ID utilisateur (extension contrôlée par nous)
            $filename = 'user_' . $userId . '.' . $extension;
            $uploadDir = __DIR__ . '/../../public/uploads/avatars/';
            $uploadPath = $uploadDir . $filename;

            // Créer le dossier s'il n'existe pas
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Supprimer l'ancien avatar s'il existe
            $db = $this->getDatabase();
            $sql = "SELECT profile_picture FROM users WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if ($user && !empty($user['profile_picture'])) {
                $oldAvatarPath = $uploadDir . $user['profile_picture'];
                if (file_exists($oldAvatarPath)) {
                    if (unlink($oldAvatarPath)) {
                        error_log("✅ Ancien avatar supprimé: {$user['profile_picture']}");
                    } else {
                        error_log("⚠️ Impossible de supprimer l'ancien avatar: {$user['profile_picture']}");
                    }
                }
            }

            // Déplacer le fichier uploadé
            if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
                // Mettre à jour la base de données
                $sql = "UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
                $stmt = $db->prepare($sql);
                $result = $stmt->execute([$filename, $userId]);

                if ($result) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Avatar mis à jour avec succès',
                        'avatarUrl' => '/uploads/avatars/' . $filename
                    ]);
                } else {
                    // Supprimer le fichier si la BDD n'a pas été mise à jour
                    @unlink($uploadPath);
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Erreur lors de la mise à jour de la base de données']);
                }
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'enregistrement du fichier']);
            }

        } catch (Exception $e) {
            $this->handleError($e, 'UploadAvatar');
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