/**
 * SYSTÈME DE RÉSERVATION
 * Gestion des réservations de trajets
 * Remplace l'ancien système participateRide.js avec un système plus élaboré utilisant des modals
 */

let reservationSystem = {
    initialized: false,
    currentReservation: null
};

function initReservation() {
    if (reservationSystem.initialized) return;

    // Ajouter les modaux de réservation
    addReservationModals();

    // Configurer les événements de réservation
    setupReservationEvents();

    reservationSystem.initialized = true;
}

/**
 * Fonction principale de participation à un trajet
 * Appelée par le bouton "Participer au covoiturage" dans les détails du trajet
 * @param {number} rideId - ID du trajet
 * @param {number} price - Prix par siège (optionnel)
 * @param {number} seats - Nombre de places disponibles (optionnel)
 */
function participateRide(rideId, price = null, seats = null) {
    console.log(`🚀 Participation au trajet ${rideId}`);

    // Vérifier la session utilisateur
    fetch('/api/auth/session', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        console.log('🔍 Vérification session:', data);

        if (data.isLoggedIn && data.user) {
            console.log('✅ Session valide, affichage du modal de réservation');

            // Utilisateur connecté, afficher le modal de confirmation
            showReservationModal(rideId, price, seats, data.user);
        } else {
            console.log('❌ Session invalide');
            showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'warning');
            setTimeout(() => {
                window.location.href = 'connexion.html';
            }, 2000);
        }
    })
    .catch(error => {
        console.error('❌ Erreur session:', error);
        showNotification('Erreur de connexion. Veuillez réessayer.', 'danger');
    });
}

/**
 * Afficher le modal de confirmation de réservation
 * @param {number} rideId - ID du trajet
 * @param {number} price - Prix par siège
 * @param {number} seats - Nombre de places disponibles
 * @param {Object} user - Objet utilisateur
 */
function showReservationModal(rideId, price, seats, user) {
    // S'assurer que le modal existe
    if (!document.getElementById('reservationModal')) {
        addReservationModals();
    }

    // Charger les détails complets du trajet pour afficher toutes les informations
    fetch(`/api/rides/${rideId}`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.ride) {
            const ride = data.ride;

            // Stocker les infos de réservation
            reservationSystem.currentReservation = {
                rideId,
                price: price || ride.price_per_seat,
                seats: seats || ride.available_seats,
                driverId: ride.driver_id,
                driverName: ride.driver_name
            };

            // Calculer la durée
            let duration = 'Non spécifiée';
            if (ride.duration_minutes) {
                const hours = Math.floor(ride.duration_minutes / 60);
                const minutes = ride.duration_minutes % 60;
                duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
            }

            // Formater les dates
            const departureDate = new Date(ride.departure_datetime);
            const departureTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const departureDay = departureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

            // Mettre à jour le contenu du modal
            const detailsDiv = document.getElementById('reservationDetails');
            if (detailsDiv) {
                detailsDiv.innerHTML = `
                    <div class="alert alert-info mb-3">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Confirmation de participation</strong>
                    </div>

                    <!-- Informations du trajet -->
                    <div class="mb-3">
                        <h6 class="mb-2"><i class="fas fa-route me-2"></i>Itinéraire</h6>
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <i class="fas fa-circle text-success"></i>
                                <strong>${ride.departure_city}</strong>
                            </div>
                            <div class="flex-fill">
                                <hr class="my-0" style="border-top: 2px dashed #ccc;">
                            </div>
                            <div class="ms-3">
                                <i class="fas fa-map-marker-alt text-danger"></i>
                                <strong>${ride.arrival_city}</strong>
                            </div>
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>${departureDay}
                            <i class="fas fa-clock ms-2 me-1"></i>${departureTime}
                            <i class="fas fa-hourglass-half ms-2 me-1"></i>${duration}
                        </small>
                    </div>

                    <!-- Conducteur -->
                    <div class="mb-3">
                        <h6 class="mb-2"><i class="fas fa-user-tie me-2"></i>Conducteur</h6>
                        <a href="#" class="text-decoration-none" onclick="showDriverInfo(${ride.driver_id}); return false;">
                            <div class="d-flex align-items-center p-2 rounded hover-bg-light" style="transition: background-color 0.2s;">
                                ${ride.driver_avatar ?
                                    `<img src="/uploads/avatars/${ride.driver_avatar}" alt="${ride.driver_name}" class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;">` :
                                    `<div class="rounded-circle me-2 bg-primary text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-weight: bold;">
                                        ${ride.driver_name ? ride.driver_name.charAt(0).toUpperCase() : 'C'}
                                    </div>`
                                }
                                <div>
                                    <strong class="d-block">${ride.driver_name || 'Conducteur'}</strong>
                                    <small class="text-muted">
                                        <i class="fas fa-star text-warning"></i> ${ride.driver_rating || '4.0'}
                                        <span class="ms-2"><i class="fas fa-info-circle"></i> Cliquez pour voir le profil</span>
                                    </small>
                                </div>
                            </div>
                        </a>
                    </div>

                    <!-- Prix et places -->
                    <div class="mb-3">
                        <div class="row">
                            <div class="col-6">
                                <div class="border rounded p-2 text-center">
                                    <i class="fas fa-euro-sign text-success"></i>
                                    <div><strong>${price || ride.price_per_seat}€</strong></div>
                                    <small class="text-muted">par personne</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="border rounded p-2 text-center">
                                    <i class="fas fa-users text-primary"></i>
                                    <div><strong>${seats || ride.available_seats}</strong></div>
                                    <small class="text-muted">places restantes</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Réservation pour -->
                    <div class="mb-3">
                        <label for="reservationForName" class="form-label">
                            <i class="fas fa-user me-2"></i>Réservation pour:
                        </label>
                        <input
                            type="text"
                            class="form-control"
                            id="reservationForName"
                            value="${user.pseudo || user.email || ''}"
                            placeholder="Nom de la personne"
                        >
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Vous pouvez modifier ce nom pour réserver pour quelqu'un d'autre
                        </small>
                    </div>

                    <!-- Solde de crédits et paiement -->
                    <div class="mb-3">
                        <div class="alert ${user.credits >= (price || ride.price_per_seat) ? 'alert-success' : 'alert-danger'} mb-0">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="fas fa-coins me-2"></i>
                                    <strong>Votre solde:</strong> ${user.credits || 0} crédits
                                </div>
                                <div>
                                    <i class="fas fa-shopping-cart me-2"></i>
                                    <strong>Coût:</strong> ${price || ride.price_per_seat} crédits
                                </div>
                            </div>
                            ${user.credits >= (price || ride.price_per_seat) ?
                                `<hr class="my-2">
                                <small class="d-block">
                                    <i class="fas fa-lock me-1"></i>
                                    Les crédits seront <strong>bloqués</strong> jusqu'à la fin du trajet
                                </small>
                                <small class="d-block mt-1">
                                    <i class="fas fa-info-circle me-1"></i>
                                    <strong>Nouveau solde après réservation:</strong> ${(user.credits || 0) - (price || ride.price_per_seat)} crédits
                                </small>` :
                                `<hr class="my-2">
                                <small class="d-block text-danger">
                                    <i class="fas fa-exclamation-triangle me-1"></i>
                                    <strong>Crédits insuffisants!</strong> Il vous manque ${(price || ride.price_per_seat) - (user.credits || 0)} crédits
                                </small>
                                <small class="d-block mt-1">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Vous pouvez acheter des crédits dans votre profil (1 crédit = 1€)
                                </small>`
                            }
                        </div>
                    </div>

                    <hr>
                    <div class="small text-muted mb-2">
                        <i class="fas fa-shield-alt me-2"></i>
                        <strong>Système de paiement sécurisé (Escrow)</strong>
                    </div>
                    <ul class="small text-muted mb-2">
                        <li>Vos crédits seront <strong>bloqués</strong> (pas encore versés au conducteur)</li>
                        <li>Après le trajet, les crédits seront libérés au conducteur (24-48h)</li>
                        <li>En cas d'annulation anticipée, remboursement selon les conditions</li>
                    </ul>
                    <p class="small text-muted mb-0">
                        <i class="fas fa-bell me-2"></i>
                        Le conducteur sera notifié de votre demande et vous contactera bientôt.
                    </p>
                `;
            }

            // Désactiver le bouton de confirmation si crédits insuffisants
            const confirmBtn = document.getElementById('confirmReservation');
            if (confirmBtn) {
                if (user.credits < (price || ride.price_per_seat)) {
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<i class="fas fa-times me-2"></i>Crédits insuffisants';
                    confirmBtn.classList.remove('btn-success');
                    confirmBtn.classList.add('btn-secondary');
                } else {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-check me-2"></i>Confirmer la réservation';
                    confirmBtn.classList.remove('btn-secondary');
                    confirmBtn.classList.add('btn-success');
                }
            }

            // Afficher le modal
            const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
            modal.show();

            // Fermer aussi le modal des détails du trajet s'il est ouvert
            const rideModal = document.getElementById('rideModal');
            if (rideModal) {
                const rideModalInstance = bootstrap.Modal.getInstance(rideModal);
                if (rideModalInstance) {
                    rideModalInstance.hide();
                }
            }
        } else {
            showNotification('Impossible de charger les détails du trajet', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur lors du chargement des détails:', error);
        showNotification('Erreur de connexion', 'error');
    });
}

/**
 * Afficher les informations du conducteur dans un modal
 * @param {number} driverId - ID du conducteur
 */
function showDriverInfo(driverId) {
    console.log('📋 Affichage des informations du conducteur:', driverId);

    fetch(`/api/users/${driverId}`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.user) {
            const driver = data.user;

            // Créer un modal temporaire pour afficher les infos du conducteur
            const existingDriverModal = document.getElementById('driverInfoModal');
            if (existingDriverModal) {
                existingDriverModal.remove();
            }

            const driverModalHTML = `
                <div class="modal fade" id="driverInfoModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-user-circle me-2"></i>
                                    Profil du conducteur
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    ${driver.profile_picture ?
                                        `<img src="/uploads/avatars/${driver.profile_picture}" alt="${driver.pseudo}" class="rounded-circle" style="width: 100px; height: 100px; object-fit: cover;">` :
                                        `<div class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center" style="width: 100px; height: 100px; font-size: 2.5rem; font-weight: bold;">
                                            ${driver.pseudo ? driver.pseudo.charAt(0).toUpperCase() : 'C'}
                                        </div>`
                                    }
                                    <h5 class="mt-2 mb-1">${driver.pseudo || 'Conducteur'}</h5>
                                    <div class="rating mb-2">
                                        <i class="fas fa-star text-warning"></i>
                                        <span>${driver.rating_average || '4.0'}</span>
                                        <span class="text-muted small">(${driver.total_rides_as_driver || 0} trajets)</span>
                                    </div>
                                </div>

                                ${driver.bio ? `
                                    <div class="mb-3">
                                        <h6><i class="fas fa-quote-left me-2"></i>À propos</h6>
                                        <p class="text-muted">${driver.bio}</p>
                                    </div>
                                ` : ''}

                                <div class="mb-2">
                                    <i class="fas fa-map-marker-alt me-2 text-muted"></i>
                                    <strong>Ville:</strong> ${driver.city || 'Non renseignée'}
                                </div>

                                ${driver.phone ? `
                                    <div class="mb-2">
                                        <i class="fas fa-phone me-2 text-muted"></i>
                                        <strong>Téléphone:</strong> ${driver.phone}
                                    </div>
                                ` : ''}

                                <div class="mb-2">
                                    <i class="fas fa-car me-2 text-muted"></i>
                                    <strong>Trajets effectués:</strong> ${driver.total_rides_as_driver || 0}
                                </div>

                                <div class="mb-2">
                                    <i class="fas fa-medal me-2 text-muted"></i>
                                    <strong>Note moyenne:</strong> ${driver.rating_average || '4.0'}/5
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', driverModalHTML);

            const driverModal = new bootstrap.Modal(document.getElementById('driverInfoModal'));
            driverModal.show();

            // Nettoyer le modal après fermeture
            document.getElementById('driverInfoModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
        } else {
            showNotification('Impossible de charger les informations du conducteur', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de connexion', 'error');
    });
}

function addReservationModals() {
    // Vérifier si le modal existe déjà
    if (document.getElementById('reservationModal')) {
        return;
    }

    // Créer le modal de réservation
    const modalHTML = `
        <style>
            .hover-bg-light:hover {
                background-color: #f8f9fa !important;
                cursor: pointer;
            }
        </style>
        <div class="modal fade" id="reservationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-calendar-check me-2"></i>
                            Confirmer la réservation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="reservationDetails"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-success" id="confirmReservation">
                            <i class="fas fa-check me-2"></i>Confirmer la réservation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function setupReservationEvents() {
    // Utiliser la délégation d'événements pour le bouton de confirmation
    // Cela fonctionne même si le bouton est recréé dynamiquement
    document.addEventListener('click', function(e) {
        // Gérer le clic sur le bouton de confirmation
        if (e.target.id === 'confirmReservation' || e.target.closest('#confirmReservation')) {
            e.preventDefault();
            if (reservationSystem.currentReservation) {
                console.log('🎯 Bouton de confirmation cliqué');
                createReservation(reservationSystem.currentReservation);
            }
        }
    });
}

function createReservation(reservationData) {
    console.log('💳 Création de la réservation:', reservationData);

    // Vérification finale des crédits côté client
    if (!reservationData.price) {
        showNotification('Erreur: prix du trajet non disponible', 'error');
        return;
    }

    if (typeof showLoadingSpinner === 'function') {
        showLoadingSpinner(true);
    }

    // Récupérer le nom personnalisé depuis l'input
    const reservationForNameInput = document.getElementById('reservationForName');
    const reservationForName = reservationForNameInput ? reservationForNameInput.value.trim() : null;

    // Appel API pour créer la réservation avec gestion des crédits en escrow
    fetch('/api/reservations/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            ride_id: reservationData.rideId,
            reservation_for: reservationForName || null,
            price: reservationData.price, // Envoi du prix pour vérification côté serveur
            payment_method: 'credits_escrow' // Indique que c'est un paiement par crédits en escrow
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Message de confirmation avec détails des crédits
            const creditsInfo = data.credits_info || {};
            let message = reservationForName ?
                `✅ Réservation confirmée pour ${reservationForName}!\n\n` :
                '✅ Réservation confirmée!\n\n';

            message += `💳 ${reservationData.price} crédits ont été bloqués (escrow)\n`;
            if (creditsInfo.new_balance !== undefined) {
                message += `💰 Nouveau solde: ${creditsInfo.new_balance} crédits\n\n`;
            }
            message += '📞 Le conducteur vous contactera bientôt.';

            if (typeof showNotification === 'function') {
                showNotification(message, 'success');
            } else {
                alert(message);
            }

            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
            if (modal) modal.hide();

            // Recharger la liste des trajets pour mettre à jour les places disponibles
            if (typeof loadRidesFromAPI === 'function') {
                loadRidesFromAPI(window.currentSearchParams, window.currentPage || 1, window.currentFilters);
            }

            // Recharger les données de profil pour mettre à jour le solde de crédits
            if (typeof loadProfileData === 'function') {
                loadProfileData();
            }
        } else {
            // Gestion des erreurs spécifiques
            let errorMessage = 'Erreur lors de la réservation';

            if (data.error) {
                if (data.error.includes('crédits insuffisants') || data.error.includes('insufficient credits')) {
                    errorMessage = `❌ ${data.error}\n\n💡 Vous pouvez acheter des crédits dans votre profil (1 crédit = 1€)`;
                } else if (data.error.includes('places')) {
                    errorMessage = '❌ Plus de places disponibles pour ce trajet';
                } else {
                    errorMessage = `❌ ${data.error}`;
                }
            }

            if (typeof showNotification === 'function') {
                showNotification(errorMessage, 'danger');
            } else {
                alert(errorMessage);
            }
        }
    })
    .catch(error => {
        console.error('❌ Erreur réservation:', error);
        if (typeof showNotification === 'function') {
            showNotification('Erreur de connexion. Veuillez réessayer.', 'danger');
        }
    })
    .finally(() => {
        if (typeof showLoadingSpinner === 'function') {
            showLoadingSpinner(false);
        }
    });
}

// Exports globaux
window.initReservation = initReservation;
window.reservationSystem = reservationSystem;
window.participateRide = participateRide;
window.showReservationModal = showReservationModal;
window.showDriverInfo = showDriverInfo;
