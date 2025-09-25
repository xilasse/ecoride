-- Base de données EcoRide
-- Structure SQL pour MySQL/MariaDB

-- ========================================
-- SUPPRESSION DES TABLES EXISTANTES
-- ========================================
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rides;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS ride_statuses;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;

-- ========================================
-- CRÉATION DES TABLES DE RÉFÉRENCE
-- ========================================

-- Table des rôles utilisateur
CREATE TABLE user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des statuts de covoiturage
CREATE TABLE ride_statuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CRÉATION DES TABLES PRINCIPALES
-- ========================================

-- Table des utilisateurs (visiteur, utilisateur, employé, admin)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pseudo VARCHAR(100) NOT NULL UNIQUE,
    role_id INT NOT NULL DEFAULT 3, -- 3 = utilisateur par défaut
    credits INT DEFAULT 20,
    is_driver BOOLEAN DEFAULT FALSE,
    is_passenger BOOLEAN DEFAULT TRUE,
    profile_picture VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    address_user TEXT NULL,
    birthdate DATE NULL,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL,
    bio TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    rating_average DECIMAL(2,1) DEFAULT 0.0,
    total_rides_as_driver INT DEFAULT 0,
    total_rides_as_passenger INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES user_roles(id),
    INDEX idx_email (email),
    INDEX idx_pseudo (pseudo),
    INDEX idx_role (role_id),
    INDEX idx_active (is_active)
);

-- Table des véhicules
CREATE TABLE vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    first_registration DATE NOT NULL,
    fuel_type ENUM('essence', 'diesel', 'electrique', 'hybride') NOT NULL,
    seats_available TINYINT NOT NULL CHECK (seats_available BETWEEN 1 AND 8),
    is_ecological BOOLEAN GENERATED ALWAYS AS (fuel_type = 'electrique') STORED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_ecological (is_ecological),
    INDEX idx_active (is_active)
);

-- Table des covoiturages
CREATE TABLE rides (
    id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    departure_city VARCHAR(255) NOT NULL,
    departure_address TEXT,
    arrival_city VARCHAR(255) NOT NULL,
    arrival_address TEXT,
    departure_datetime DATETIME NOT NULL,
    estimated_arrival_datetime DATETIME,
    price_per_seat DECIMAL(8,2) NOT NULL,
    available_seats TINYINT NOT NULL,
    total_seats TINYINT NOT NULL,
    status_id INT NOT NULL DEFAULT 1, -- 1 = créé
    duration_minutes INT,
    distance_km INT,
    description TEXT,
    driver_preferences TEXT,
    smoking_allowed BOOLEAN DEFAULT FALSE,
    pets_allowed BOOLEAN DEFAULT FALSE,
    music_allowed BOOLEAN DEFAULT TRUE,
    is_recurrent BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50) NULL,
    platform_commission DECIMAL(8,2) DEFAULT 2.00,
    actual_start_time DATETIME NULL,
    actual_end_time DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (status_id) REFERENCES ride_statuses(id),
    INDEX idx_driver (driver_id),
    INDEX idx_departure_city (departure_city),
    INDEX idx_arrival_city (arrival_city),
    INDEX idx_departure_date (departure_datetime),
    INDEX idx_status (status_id),
    INDEX idx_available_seats (available_seats),
    INDEX idx_search_route (departure_city, arrival_city, departure_datetime),
    
    CONSTRAINT chk_seats CHECK (available_seats >= 0 AND available_seats <= total_seats),
    CONSTRAINT chk_price CHECK (price_per_seat >= 0),
    CONSTRAINT chk_dates CHECK (estimated_arrival_datetime IS NULL OR estimated_arrival_datetime > departure_datetime)
);

-- Table des réservations
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ride_id INT NOT NULL,
    passenger_id INT NOT NULL,
    seats_booked TINYINT NOT NULL DEFAULT 1,
    booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'dispute') DEFAULT 'confirmed',
    total_price DECIMAL(8,2) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancellation_date DATETIME NULL,
    cancellation_reason TEXT NULL,
    passenger_rating TINYINT NULL CHECK (passenger_rating BETWEEN 1 AND 5),
    driver_rating TINYINT NULL CHECK (driver_rating BETWEEN 1 AND 5),
    passenger_review TEXT NULL,
    driver_review TEXT NULL,
    dispute_reason TEXT NULL,
    is_passenger_validated BOOLEAN DEFAULT FALSE,
    is_driver_validated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_passenger_ride (ride_id, passenger_id),
    INDEX idx_ride (ride_id),
    INDEX idx_passenger (passenger_id),
    INDEX idx_status (booking_status),
    INDEX idx_booking_date (booking_date),
    
    CONSTRAINT chk_seats_booked CHECK (seats_booked >= 1),
    CONSTRAINT chk_total_price CHECK (total_price >= 0)
);

-- Table des avis (système de modération)
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewed_user_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_type ENUM('driver_review', 'passenger_review') NOT NULL,
    is_approved BOOLEAN NULL, -- NULL = en attente, TRUE = approuvé, FALSE = rejeté
    approved_by INT NULL, -- employé qui a validé
    approval_date DATETIME NULL,
    rejection_reason TEXT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    UNIQUE KEY unique_booking_reviewer (booking_id, reviewer_id),
    INDEX idx_reviewed_user (reviewed_user_id),
    INDEX idx_approval_status (is_approved),
    INDEX idx_public (is_public),
    INDEX idx_created_date (created_at)
);

-- Table des préférences utilisateur (pour les chauffeurs)
CREATE TABLE user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id, preference_key),
    INDEX idx_user (user_id),
    INDEX idx_key (preference_key)
);

-- Table des logs d'activité (pour audit et statistiques)
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NULL,
    record_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action_type),
    INDEX idx_date (created_at),
    INDEX idx_table_record (table_name, record_id)
);

-- Table des notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_table VARCHAR(100) NULL,
    related_id INT NULL,
    action_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_unread (is_read),
    INDEX idx_type (notification_type),
    INDEX idx_created (created_at)
);

-- ========================================
-- INSERTION DES DONNÉES DE RÉFÉRENCE
-- ========================================

-- Rôles utilisateur
INSERT INTO user_roles (id, role_name, description) VALUES
(1, 'admin', 'Administrateur système - accès complet'),
(2, 'employee', 'Employé - modération et support'),
(3, 'user', 'Utilisateur standard - passager/chauffeur'),
(4, 'visitor', 'Visiteur - accès limité en lecture seule');

-- Statuts des covoiturages
INSERT INTO ride_statuses (status_name, description) VALUES 
('created', 'Covoiturage créé, en attente de participants'),
('confirmed', 'Covoiturage confirmé avec des participants'),
('started', 'Covoiturage en cours'),
('completed', 'Covoiturage terminé avec succès'),
('cancelled', 'Covoiturage annulé'),
('dispute', 'Covoiturage en litige');

-- ========================================
-- INSERTION DES DONNÉES DE TEST
-- ========================================

-- Utilisateurs de test
INSERT INTO users (email, password_hash, pseudo, role_id, credits, is_driver, is_passenger, phone, is_verified) VALUES 
-- Administrateur
('admin@ecoride.fr', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'AdminEcoRide', 1, 1000, FALSE, FALSE, '+33123456789', TRUE),

-- Employés
('employe1@ecoride.fr', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'ModeratorJoe', 2, 100, FALSE, FALSE, '+33123456790', TRUE),
('employe2@ecoride.fr', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'SupportSarah', 2, 100, FALSE, FALSE, '+33123456791', TRUE),

-- Utilisateurs chauffeurs
('marie.dupont@email.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'MarieDriveGreen', 3, 45, TRUE, TRUE, '+33612345678', TRUE),
('jean.martin@email.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'JeanEcoDriver', 3, 62, TRUE, TRUE, '+33687654321', TRUE),
('sophie.bernard@email.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'SophieVerte', 3, 38, TRUE, TRUE, '+33698765432', TRUE),

-- Utilisateurs passagers
('pierre.durand@email.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'PierreVoyage', 3, 28, FALSE, TRUE, '+33654321098', TRUE),
('claire.moreau@email.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/0.MioPuHiuK', 'ClaireEco', 3, 33, FALSE, TRUE, '+33643210987', TRUE);

-- Véhicules
INSERT INTO vehicles (user_id, brand, model, color, license_plate, first_registration, fuel_type, seats_available) VALUES 
-- Véhicules de Marie (électriques)
(4, 'Tesla', 'Model 3', 'Blanche', 'AB-123-CD', '2022-03-15', 'electrique', 4),
(4, 'Renault', 'ZOE', 'Bleue', 'EF-456-GH', '2021-11-20', 'electrique', 3),

-- Véhicules de Jean (hybride et essence)
(5, 'Toyota', 'Prius', 'Grise', 'IJ-789-KL', '2020-06-10', 'hybride', 4),
(5, 'Peugeot', '308', 'Noire', 'MN-012-OP', '2019-04-22', 'essence', 4),

-- Véhicule de Sophie (électrique)
(6, 'Nissan', 'Leaf', 'Verte', 'QR-345-ST', '2023-01-08', 'electrique', 4);

-- Covoiturages de test
INSERT INTO rides (driver_id, vehicle_id, departure_city, departure_address, arrival_city, arrival_address, departure_datetime, estimated_arrival_datetime, price_per_seat, available_seats, total_seats, duration_minutes, distance_km, description, smoking_allowed, pets_allowed) VALUES 
-- Trajets de Marie (électriques)
(4, 1, 'Paris', '12 Rue de Rivoli, 75001 Paris', 'Lyon', 'Place Bellecour, 69002 Lyon', '2025-09-15 14:00:00', '2025-09-15 18:30:00', 35.00, 3, 4, 270, 465, "Trajet écologique Paris-Lyon en Tesla. Musique d'ambiance et bonne humeur !", FALSE, TRUE),

(4, 2, 'Lyon', 'Gare Part-Dieu, 69003 Lyon', 'Marseille', 'Gare Saint-Charles, 13001 Marseille', '2025-09-16 09:00:00', '2025-09-16 12:15:00', 28.00, 2, 3, 195, 315, 'Trajet matinal Lyon-Marseille. Véhicule 100% électrique !', FALSE, FALSE),

-- Trajets de Jean
(5, 3, 'Paris', 'Porte de Versailles, 75015 Paris', 'Bordeaux', 'Place des Quinconces, 33000 Bordeaux', '2025-09-17 08:00:00', '2025-09-17 13:45:00', 42.00, 3, 4, 345, 580, 'Paris-Bordeaux en véhicule hybride. Arrêt possible aire de repos.', FALSE, TRUE),

(5, 4, 'Toulouse', 'Place du Capitole, 31000 Toulouse', 'Montpellier', 'Place de la Comédie, 34000 Montpellier', '2025-09-18 16:30:00', '2025-09-18 19:00:00', 22.00, 4, 4, 150, 245, 'Trajet Toulouse-Montpellier en fin de journée.', FALSE, FALSE),

-- Trajets de Sophie (électrique)
(6, 5, 'Lille', 'Gare Lille Europe, 59000 Lille', 'Bruxelles', 'Gare Centrale, 1000 Bruxelles', '2025-09-19 10:15:00', '2025-09-19 12:00:00', 18.00, 4, 4, 105, 115, 'Trajet international Lille-Bruxelles en Nissan Leaf électrique. Voyage écologique garanti !', FALSE, TRUE);

-- Réservations
INSERT INTO bookings (ride_id, passenger_id, seats_booked, total_price, is_passenger_validated, is_driver_validated) VALUES 
(1, 7, 1, 35.00, FALSE, FALSE), -- Pierre réserve le trajet Paris-Lyon de Marie
(1, 8, 1, 35.00, FALSE, FALSE), -- Claire réserve aussi le trajet Paris-Lyon
(2, 7, 1, 28.00, FALSE, FALSE), -- Pierre réserve Lyon-Marseille
(3, 8, 2, 84.00, FALSE, FALSE); -- Claire réserve 2 places Paris-Bordeaux

-- Préférences utilisateur pour les chauffeurs
INSERT INTO user_preferences (user_id, preference_key, preference_value, is_mandatory) VALUES 
-- Préférences de Marie
(4, 'smoking_allowed', 'false', TRUE),
(4, 'pets_allowed', 'true', FALSE),
(4, 'music_style', 'Pop, Jazz', FALSE),
(4, 'conversation_level', 'Modérée', FALSE),

-- Préférences de Jean  
(5, 'smoking_allowed', 'false', TRUE),
(5, 'pets_allowed', 'true', FALSE),
(5, 'break_frequency', 'Toutes les 2h', FALSE),

-- Préférences de Sophie
(6, 'smoking_allowed', 'false', TRUE),
(6, 'pets_allowed', 'true', TRUE),
(6, 'ecological_discussion', 'Encouragée', FALSE);

-- ========================================
-- VUES UTILES POUR L'APPLICATION
-- ========================================

-- Vue des covoiturages avec détails complets
CREATE VIEW ride_details AS
SELECT 
    r.id,
    r.departure_city,
    r.arrival_city,
    r.departure_datetime,
    r.estimated_arrival_datetime,
    r.price_per_seat,
    r.available_seats,
    r.total_seats,
    r.description,
    r.smoking_allowed,
    r.pets_allowed,
    -- Informations chauffeur
    u.pseudo as driver_pseudo,
    u.profile_picture as driver_photo,
    u.rating_average as driver_rating,
    u.total_rides_as_driver,
    -- Informations véhicule
    v.brand,
    v.model,
    v.color,
    v.fuel_type,
    v.is_ecological,
    -- Statut
    rs.status_name,
    -- Calculé
    (r.total_seats - r.available_seats) as booked_seats
FROM rides r
JOIN users u ON r.driver_id = u.id
JOIN vehicles v ON r.vehicle_id = v.id  
JOIN ride_statuses rs ON r.status_id = rs.id
WHERE r.status_id IN (1, 2) -- créé ou confirmé
AND r.departure_datetime > NOW()
AND r.available_seats > 0;

-- Vue des statistiques utilisateur
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.pseudo,
    u.email,
    u.credits,
    u.rating_average,
    u.total_rides_as_driver,
    u.total_rides_as_passenger,
    u.is_driver,
    u.is_passenger,
    COUNT(DISTINCT r.id) as rides_created,
    COUNT(DISTINCT b.id) as bookings_made,
    COALESCE(SUM(CASE WHEN b.booking_status = 'completed' THEN b.total_price ELSE 0 END), 0) as total_spent
FROM users u
LEFT JOIN rides r ON u.id = r.driver_id
LEFT JOIN bookings b ON u.id = b.passenger_id
WHERE u.role_id = 3 -- utilisateurs seulement
GROUP BY u.id;

-- ========================================
-- PROCÉDURES STOCKÉES UTILES
-- ========================================

DELIMITER //

-- Procédure pour effectuer une réservation
CREATE PROCEDURE BookRide(
    IN p_ride_id INT,
    IN p_passenger_id INT,
    IN p_seats_count INT
)
BEGIN
    DECLARE v_available_seats INT;
    DECLARE v_price_per_seat DECIMAL(8,2);
    DECLARE v_total_price DECIMAL(8,2);
    DECLARE v_passenger_credits INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Vérifier la disponibilité
    SELECT available_seats, price_per_seat 
    INTO v_available_seats, v_price_per_seat
    FROM rides 
    WHERE id = p_ride_id AND status_id = 1 FOR UPDATE;
    
    -- Vérifier les crédits du passager
    SELECT credits INTO v_passenger_credits
    FROM users 
    WHERE id = p_passenger_id FOR UPDATE;
    
    SET v_total_price = v_price_per_seat * p_seats_count;
    
    -- Contrôles
    IF v_available_seats < p_seats_count THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pas assez de places disponibles';
    END IF;
    
    IF v_passenger_credits < v_total_price THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Crédits insuffisants';
    END IF;
    
    -- Effectuer la réservation
    INSERT INTO bookings (ride_id, passenger_id, seats_booked, total_price)
    VALUES (p_ride_id, p_passenger_id, p_seats_count, v_total_price);
    
    -- Mettre à jour les places disponibles
    UPDATE rides 
    SET available_seats = available_seats - p_seats_count,
        status_id = CASE WHEN available_seats - p_seats_count = 0 THEN 2 ELSE status_id END
    WHERE id = p_ride_id;
    
    -- Débiter les crédits
    UPDATE users 
    SET credits = credits - v_total_price 
    WHERE id = p_passenger_id;
    
    COMMIT;
END //

DELIMITER ;

-- ========================================
-- INDEX DE PERFORMANCE
-- ========================================

-- Index composite pour la recherche de trajets
CREATE INDEX idx_ride_search ON rides (departure_city, arrival_city, departure_datetime, available_seats, status_id);

-- Index pour les statistiques
CREATE INDEX idx_bookings_stats ON bookings (booking_date, booking_status, total_price);
CREATE INDEX idx_rides_stats ON rides (departure_datetime, status_id, driver_id);

-- ========================================
-- CONTRAINTES DE SÉCURITÉ
-- ========================================

-- Trigger pour empêcher l'auto-réservation
DELIMITER //
CREATE TRIGGER prevent_self_booking 
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_driver_id INT;
    SELECT driver_id INTO v_driver_id FROM rides WHERE id = NEW.ride_id;
    
    IF v_driver_id = NEW.passenger_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un chauffeur ne peut pas réserver son propre trajet';
    END IF;
END //
DELIMITER ;

-- ========================================
-- REQUÊTES D'EXEMPLE POUR TESTS
-- ========================================

/*
-- Rechercher des trajets Paris-Lyon pour demain
SELECT * FROM ride_details 
WHERE departure_city = 'Paris' 
AND arrival_city = 'Lyon' 
AND DATE(departure_datetime) = CURDATE() + INTERVAL 1 DAY;

-- Statistiques d'un utilisateur
SELECT * FROM user_stats WHERE pseudo = 'MarieDriveGreen';

-- Trajets écologiques disponibles
SELECT * FROM ride_details WHERE is_ecological = TRUE;

-- Effectuer une réservation
CALL BookRide(1, 7, 1);
*/