/**
 * GESTION DU PROFIL UTILISATEUR
 * Module pour charger et mettre à jour les informations du profil
 */

// Charger les données du profil utilisateur
function loadProfileData() {
    console.log('📋 Chargement des données du profil');

    fetch('/api/auth/profile', {
        credentials: 'include'
    })
    .then(response => {
        // Vérifier le code HTTP avant de parser le JSON
        if (response.status === 401) {
            showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            setTimeout(() => {
                window.location.href = 'connexion.html';
            }, 2000);
            return Promise.reject('Session expirée');
        }
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || data.details || 'Erreur serveur');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.user) {
            const user = data.user;

            // Informations de base (header)
            updateElement('profileUserName', user.pseudo || 'Utilisateur');
            updateElement('profileUserEmail', user.email || '');

            // Photo de profil avec avatarUtils
            const profilePicture = document.querySelector('.profile-picture');
            if (profilePicture && window.AvatarUtils) {
                window.AvatarUtils.updateAvatarElement(profilePicture, user, 'large');

                // Ajouter le bouton d'upload après le chargement
                setTimeout(() => {
                    window.AvatarUtils.addAvatarUploadButton(profilePicture, function(newAvatarUrl) {
                        console.log('✅ Nouvel avatar uploadé:', newAvatarUrl);
                    });
                }, 500);
            }

            // Statistiques
            updateElement('profileCredits', user.credits || '0');
            updateElement('profileRating', user.rating || '0.0');

            // Calcul du total des trajets
            const totalRidesDriver = user.totalRidesAsDriver || 0;
            const totalRidesPassenger = user.totalRidesAsPassenger || 0;
            const totalRides = totalRidesDriver + totalRidesPassenger;
            updateElement('profileTotalRides', totalRides);

            // Affichage du rôle
            const roleNames = {1: 'Administrateur', 2: 'Employé', 3: 'Utilisateur', 4: 'Visiteur'};
            const roleName = roleNames[user.role_id] || 'Utilisateur';
            updateElement('profileRoleDisplay', roleName);

            // Mode LECTURE (affichage)
            updateElement('viewPseudo', user.pseudo || '-');
            updateElement('viewEmail', user.email || '-');
            updateElement('viewPhone', user.phone || 'Non renseigné');
            updateElement('viewCity', user.city || 'Non renseigné');
            updateElement('viewBio', user.bio || 'Aucune bio renseignée');

            // Date de naissance formatée
            if (user.birthdate) {
                const birthDate = new Date(user.birthdate);
                const formattedDate = birthDate.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                updateElement('viewBirthdate', formattedDate);
            } else {
                updateElement('viewBirthdate', 'Non renseigné');
            }

            // Genre formaté
            const genderLabels = {
                'male': 'Homme',
                'female': 'Femme',
                'other': 'Autre',
                'prefer_not_to_say': 'Préfère ne pas répondre'
            };
            updateElement('viewGender', genderLabels[user.gender] || 'Non spécifié');

            // Mode ÉDITION (inputs)
            updateInputValue('profilePseudo', user.pseudo || '');
            updateInputValue('profileEmailDisplay', user.email || '');
            updateInputValue('profilePhone', user.phone || '');
            updateInputValue('profileCity', user.city || '');
            updateInputValue('profileBio', user.bio || '');

            // Date de naissance (input)
            if (user.birthdate) {
                updateInputValue('profileBirthdate', user.birthdate);
            }

            // Genre (select)
            if (user.gender) {
                updateInputValue('profileGender', user.gender);
            }

            console.log('✅ Données du profil chargées:', user);
        } else {
            console.error('❌ Erreur dans la réponse:', data);
            showNotification('Erreur lors du chargement du profil', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur lors du chargement du profil:', error);
        if (error.message && error.message !== 'Session expirée') {
            showNotification('Erreur: ' + error.message, 'error');
        } else if (error !== 'Session expirée') {
            showNotification('Erreur de connexion au serveur', 'error');
        }
    });
}

// Sauvegarder les modifications du profil
function saveProfile() {
    console.log('💾 Sauvegarde du profil...');

    const profileData = {
        phone: getInputValue('profilePhone'),
        city: getInputValue('profileCity'),
        birthdate: getInputValue('profileBirthdate'),
        gender: getInputValue('profileGender'),
        bio: getInputValue('profileBio')
    };

    fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
    })
    .then(response => {
        // Vérifier le code HTTP avant de parser le JSON
        if (response.status === 401) {
            showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            setTimeout(() => {
                window.location.href = 'connexion.html';
            }, 2000);
            return Promise.reject('Session expirée');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification('Profil mis à jour avec succès', 'success');
            loadProfileData();
            // Retourner au mode lecture
            setTimeout(() => {
                toggleEditMode();
            }, 500);
        } else {
            showNotification('Erreur: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur lors de la sauvegarde:', error);
        if (error !== 'Session expirée') {
            showNotification('Erreur de réseau lors de la sauvegarde', 'error');
        }
    });
}

// Initialiser le formulaire de profil
function initProfileForm() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfile();
        });
    }
}

// Fonctions de gestion des paramètres
function changePassword() {
    // TODO: Implémenter la modal de changement de mot de passe
    console.log('🔑 Changement de mot de passe');
    showNotification('Fonctionnalité en développement', 'info');
}

function deactivateAccount() {
    // TODO: Implémenter la confirmation de désactivation
    console.log('⏸️ Désactivation du compte');
    if (confirm('Êtes-vous sûr de vouloir désactiver votre compte ?')) {
        showNotification('Fonctionnalité en développement', 'info');
    }
}

// Afficher un message dans le profil
function showProfileMessage(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const profileContent = document.querySelector('.profile-content-card');
    if (profileContent) {
        profileContent.insertBefore(alert, profileContent.firstChild);
    }

    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Fonctions utilitaires
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

// Basculer entre mode lecture et édition
function toggleEditMode() {
    const viewMode = document.getElementById('profileViewMode');
    const editMode = document.getElementById('profileForm');
    const editBtn = document.getElementById('editProfileBtn');

    if (viewMode.style.display !== 'none') {
        // Passer en mode édition
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
        editBtn.innerHTML = '<i class="fas fa-eye"></i> Voir';
        editBtn.classList.remove('btn-outline-primary');
        editBtn.classList.add('btn-outline-secondary');
    } else {
        // Retourner en mode lecture
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Modifier';
        editBtn.classList.remove('btn-outline-secondary');
        editBtn.classList.add('btn-outline-primary');

        // Recharger les données pour annuler les modifications non sauvegardées
        loadProfileData();
    }
}

// Exports globaux
window.loadProfileData = loadProfileData;
window.saveProfile = saveProfile;
window.initProfileForm = initProfileForm;
window.changePassword = changePassword;
window.deactivateAccount = deactivateAccount;
window.toggleEditMode = toggleEditMode;
