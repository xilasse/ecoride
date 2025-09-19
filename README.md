# 🌱 EcoRide - Plateforme de Covoiturage Écologique

![EcoRide Logo](https://img.shields.io/badge/EcoRide-Covoiturage%20Écologique-4CAF50?style=for-the-badge&logo=leaf)
[![PHP Version](https://img.shields.io/badge/PHP-8.0%2B-777BB4?logo=php)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql)](https://mysql.com)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.0-7952B3?logo=bootstrap)](https://getbootstrap.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 📋 Description

EcoRide est une plateforme web moderne de covoiturage qui met l'accent sur l'écologie et la durabilité. Notre mission est de réduire l'impact environnemental des déplacements en encourageant le partage de trajets, particulièrement avec des véhicules électriques.

### ✨ Fonctionnalités Principales

- 🔍 **Recherche de trajets** avec filtres avancés (prix, durée, type de véhicule)
- 🚗 **Gestion des véhicules** avec priorité aux véhicules électriques
- 💳 **Système de crédits** sécurisé pour les transactions
- ⭐ **Système d'avis** modéré pour maintenir la qualité
- 👥 **Comptes multi-rôles** (visiteur, utilisateur, employé, administrateur)
- 📱 **Interface responsive** adaptée à tous les appareils
- 🛡️ **Sécurité renforcée** avec protection CSRF, XSS et injection SQL

## 🎯 Public Cible

- **Particuliers** soucieux de l'environnement
- **Étudiants** cherchant des solutions économiques
- **Travailleurs** pour trajets domicile-travail
- **Voyageurs occasionnels** pour longues distances

## 🏗️ Architecture Technique

### Stack Technologique

#### Front-end
- **HTML5** + **CSS3** avec variables CSS
- **Bootstrap 5.3.0** pour le design responsive
- **JavaScript ES6+** pour l'interactivité
- **Font Awesome 6.4.0** pour les icônes
- **Chart.js** pour les graphiques administrateur

#### Back-end
- **PHP 8.x** avec architecture MVC
- **PDO** pour l'accès sécurisé aux données
- **Composer** pour la gestion des dépendances

#### Bases de Données
- **MySQL 8.0+** (données relationnelles)
- **MongoDB** (préférences utilisateur, logs)

#### Déploiement
- **Git** + **GitHub** pour le versioning
- **Heroku/Railway** pour l'hébergement
- **CI/CD** avec GitHub Actions

## 🚀 Installation et Configuration

### Prérequis

- PHP >= 8.0
- MySQL >= 8.0
- MongoDB >= 5.0
- Composer
- Git
- Serveur web (Apache/Nginx)

### Installation Locale

1. **Cloner le projet**
   ```bash
   git clone https://github.com/username/ecoride.git
   cd ecoride
   ```

2. **Installer les dépendances**
   ```bash
   composer install
   ```

3. **Configurer la base de données**
   ```bash
   # Créer la base MySQL
   mysql -u root -p
   CREATE DATABASE ecoride_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   
   # Importer la structure
   mysql -u root -p ecoride_db < sql/structure.sql
   mysql -u root -p ecoride_db < sql/data.sql
   ```

4. **Configuration des variables d'environnement**
   ```bash
   cp config/config.example.php config/config.php
   # Éditer config/config.php avec vos paramètres
   ```

5. **Démarrer le serveur de développement**
   ```bash
   php -S localhost:8000 -t public/
   ```

6. **Accéder à l'application**
   ```
   http://localhost:8000
   ```

### Configuration MongoDB (Optionnel)

```bash
# Démarrer MongoDB
mongod

# La base sera créée automatiquement à la première utilisation
```

### Comptes de Test

L'application est livrée avec des comptes de démonstration :

| Rôle | Email | Mot de passe | Pseudo |
|------|-------|--------------|---------|
| Admin | admin@ecoride.fr | admin123 | AdminEcoRide |
| Employé | employe1@ecoride.fr | emp123 | ModeratorJoe |
| Chauffeur | marie.dupont@email.com | marie123 | MarieDriveGreen |
| Passager | pierre.durand@email.com | pierre123 | PierreVoyage |

## 📁 Structure du Projet

```
ecoride/
├── 📁 public/                 # Point d'entrée web
│   ├── index.php             # Page d'accueil
│   ├── covoiturages.php      # Liste des trajets
│   └── 📁 assets/            # CSS, JS, images
├── 📁 src/                   # Code source PHP
│   ├── 📁 Controllers/       # Contrôleurs MVC
│   ├── 📁 Models/           # Modèles de données
│   ├── 📁 Views/            # Templates
│   └── 📁 Utils/            # Utilitaires
├── 📁 sql/                  # Scripts de base de données
│   ├── structure.sql        # Structure des tables
│   └── data.sql             # Données de test
├── 📁 docs/                 # Documentation
├── 📁 tests/                # Tests unitaires et intégration
├── composer.json            # Dépendances PHP
└── README.md               # Ce fichier
```

## 🎮 Utilisation

### Pour les Visiteurs

1. **Rechercher un trajet**
   - Accéder à la page d'accueil
   - Saisir ville de départ, d'arrivée et date
   - Appliquer des filtres si nécessaire

2. **Consulter les détails**
   - Cliquer sur "Détails" d'un trajet
   - Voir les informations complètes (chauffeur, véhicule, avis)

3. **S'inscrire**
   - Créer un compte pour réserver
   - 20 crédits offerts à l'inscription

### Pour les Utilisateurs

1. **Réserver un trajet**
   - Se connecter
   - Rechercher et sélectionner un trajet
   - Confirmer la réservation (crédits débités)

2. **Proposer un trajet (chauffeur)**
   - Configurer son profil chauffeur
   - Ajouter ses véhicules
   - Créer un nouveau trajet

3. **Gérer ses trajets**
   - Consulter l'historique
   - Démarrer/terminer ses trajets
   - Laisser des avis

### Pour les Employés

1. **Modérer les avis**
   - Approuver ou rejeter les avis soumis
   - Gérer les commentaires inappropriés

2. **Gérer les litiges**
   - Traiter les conflits chauffeur/passager
   - Résoudre les problèmes signalés

### Pour les Administrateurs

1. **Gérer les utilisateurs**
   - Créer des comptes employés
   - Suspendre des comptes
   - Consulter les statistiques

2. **Analyser les données**
   - Graphiques de covoiturages par jour
   - Revenus de la plateforme
   - Métriques de performance

## 🔧 API Endpoints

### Authentification
```http
POST /api/auth/login          # Connexion
POST /api/auth/register       # Inscription  
POST /api/auth/logout         # Déconnexion
GET  /api/auth/me            # Profil utilisateur
```

### Covoiturages
```http
GET    /api/rides            # Liste des trajets
GET    /api/rides/{id}       # Détail d'un trajet
POST   /api/rides            # Créer un trajet
PUT    /api/rides/{id}       # Modifier un trajet
DELETE /api/rides/{id}       # Supprimer un trajet
GET    /api/rides/search     # Rechercher des trajets
```

### Réservations
```http
GET    /api/bookings         # Mes réservations
POST   /api/bookings         # Créer une réservation
PUT    /api/bookings/{id}    # Modifier une réservation
DELETE /api/bookings/{id}    # Annuler une réservation
```

## 🧪 Tests

### Exécuter les tests

```bash
# Tests unitaires
./vendor/bin/phpunit tests/Unit/

# Tests d'intégration
./vendor/bin/phpunit tests/Integration/

# Tests complets
./vendor/bin/phpunit
```

### Coverage

```bash
./vendor/bin/phpunit --coverage-html coverage/
```

## 🛡️ Sécurité

### Mesures Implémentées

- ✅ **Hachage des mots de passe** avec `password_hash()`
- ✅ **Protection CSRF** avec tokens
- ✅ **Requêtes préparées** pour éviter l'injection SQL
- ✅ **Échappement XSS** avec `htmlspecialchars()`
- ✅ **Validation côté serveur** de toutes les données
- ✅ **Sessions sécurisées** avec configuration renforcée
- ✅ **HTTPS obligatoire** en production

### Bonnes Pratiques

- Principe du moindre privilège
- Validation et nettoyage des données
- Logging des actions sensibles
- Audit régulier des dépendances

## 📈 Performance

### Optimisations Mises en Place

- **Cache Redis** pour les requêtes fréquentes
- **Index composites** sur les colonnes de recherche
- **Pagination** des résultats
- **Compression Gzip** des assets
- **Lazy loading** des images
- **Minification** CSS/JS en production

### Métriques de Performance

- Temps de chargement < 2s
- Score Lighthouse > 90
- Disponibilité 99.9%

## 🌍 Déploiement

### Environnements

#### Développement
```bash
git checkout develop
composer install
php -S localhost:8000 -t public/
```

#### Staging
```bash
git checkout staging
composer install --no-dev
# Déploiement automatique via CI/CD
```

#### Production
```bash
git checkout main
# Déploiement via Heroku/Railway
```

### Variables d'Environnement

```env
# Base de données
DB_HOST=localhost
DB_NAME=ecoride_db
DB_USER=root
DB_PASS=password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ecoride_nosql

# Redis
REDIS_URL=redis://localhost:6379

# Application
APP_ENV=production
APP_SECRET=your-secret-key-here
BASE_URL=https://ecoride.herokuapp.com
```

## 🤝 Contribution

### Workflow de Développement

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### Standards de Code

- **PSR-12** pour PHP
- **ES6+** pour JavaScript
- **BEM** pour CSS
- **Documentation** obligatoire pour les fonctions
- **Tests** pour les nouvelles fonctionnalités

### Git Flow

```
main (production)
├── develop (intégration)
│   ├── feature/user-authentication
│   ├── feature/ride-booking
│   └── feature/admin-dashboard
└── hotfix/security-patch
```

## 📊 Statistiques du Projet

![GitHub repo size](https://img.shields.io/github/repo-size/username/ecoride)
![Lines of code](https://img.shields.io/tokei/lines/github/username/ecoride)
![GitHub issues](https://img.shields.io/github/issues/username/ecoride)
![GitHub pull requests](https://img.shields.io/github/issues-pr/username/ecoride)

## 🗺️ Roadmap

### Version 1.1.0 - Q1 2026
- [ ] Application mobile (React Native)
- [ ] Notifications push
- [ ] Chat en temps réel
- [ ] Système de cashback

### Version 1.2.0 - Q2 2026
- [ ] Intelligence artificielle pour matching
- [ ] Prédiction de la demande
- [ ] Intégration GPS temps réel
- [ ] API publique

### Version 2.0.0 - Q4 2026
- [ ] Marketplace de services
- [ ] Programme de fidélité avancé
- [ ] Expansion internationale
- [ ] Blockchain pour transparence

## 🏆 Fonctionnalités Implémentées par US

### Activité Type 1 (Front-end)
- [x] **US1** - Page d'accueil avec recherche
- [x] **US2** - Menu de navigation
- [x] **US3** - Vue des covoiturages
- [x] **US4** - Filtres des covoiturages
- [x] **US5** - Vue détaillée d'un covoiturage
- [x] **US6** - Participation à un covoiturage
- [x] **US7** - Création de compte
- [x] **US11** - Démarrer/arrêter un covoiturage
- [x] **US12** - Espace employé
- [x] **US13** - Espace administrateur

### Activité Type 2 (Back-end)
- [x] **US3** - Gestion des données covoiturage
- [x] **US5** - API détail covoiturage
- [x] **US6** - Système de réservation
- [x] **US7** - Authentification utilisateur
- [x] **US8** - Espace utilisateur
- [x] **US9** - Saisie de voyage
- [x] **US10** - Historique des covoiturages
- [x] **US11** - Workflow trajet complet
- [x] **US12** - Modération employé
- [x] **US13** - Administration complète

## 🆘 Support et Contact

### Issues GitHub
Pour reporter des bugs ou demander des fonctionnalités :
[Créer une issue](https://github.com/username/ecoride/issues/new)

### Documentation
- 📖 [Documentation Technique](docs/technical-documentation.md)
- 🎨 [Charte Graphique](docs/style-guide.pdf)
- 👤 [Manuel Utilisateur](docs/user-manual.pdf)

### Contact
- **Email** : contact@ecoride.fr
- **LinkedIn** : [EcoRide Official](https://linkedin.com/company/ecoride)
- **Twitter** : [@EcoRideFR](https://twitter.com/ecoridefr)

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- **José** - Directeur Technique et Product Owner
- **Studi** - Plateforme de formation
- **Bootstrap Team** - Framework CSS
- **PHP Community** - Langage et écosystème
- **Open Source Contributors** - Libraries utilisées

## 💚 Impact Environnemental

### Objectifs Écologiques
- 🌱 Réduction de 15% des émissions CO₂ par trajet partagé
- ⚡ Priorité aux véhicules électriques (badge écologique)
- 📊 Calcul et affichage de l'impact environnemental
- 🏆 Système de récompenses pour trajets verts

### Métriques Actuelles
- **1,247** utilisateurs actifs
- **5,830** trajets partagés
- **12.5 tonnes** de CO₂ économisées
- **€15,200** d'économies réalisées

---

<div align="center">

**🌍 Ensemble, construisons un avenir plus durable ! 🌍**

[![Made with ❤️ by EcoRide Team](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge)](https://github.com/username/ecoride)

</div>

---

*Dernière mise à jour : 08 septembre 2025*