-- Migration : Ajout des champs de profil manquants
-- Date : 2025-09-19

-- Ajouter les colonnes manquantes à la table users
ALTER TABLE users
ADD COLUMN full_name VARCHAR(200) NULL AFTER pseudo,
ADD COLUMN address TEXT NULL AFTER phone,
ADD COLUMN birthdate DATE NULL AFTER address,
ADD COLUMN gender ENUM('homme', 'femme', 'autre') NULL AFTER birthdate,
ADD COLUMN bio TEXT NULL AFTER gender;

-- Mise à jour des données existantes avec des valeurs par défaut
UPDATE users SET
    full_name = CONCAT(pseudo, ' (EcoRide)'),
    address = CASE
        WHEN id % 3 = 0 THEN '123 Rue de la République, 31000 Toulouse'
        WHEN id % 3 = 1 THEN '456 Avenue des Écoles, 75001 Paris'
        ELSE '789 Boulevard Vert, 69000 Lyon'
    END,
    bio = 'Passionné(e) de covoiturage écologique et de voyages responsables.'
WHERE full_name IS NULL;

-- Afficher le résultat
SELECT id, pseudo, full_name, email, phone, address, bio FROM users LIMIT 5;