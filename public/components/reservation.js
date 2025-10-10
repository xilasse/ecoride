/**
 * SYSTÈME DE RÉSERVATION
 * Gestion des réservations de trajets
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

function addReservationModals() {
    // Vérifier si le modal existe déjà
    if (document.getElementById('reservationModal')) {
        return;
    }

    // Créer le modal de réservation
    const modalHTML = `
        <div class="modal fade" id="reservationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-calendar-check me-2"></i>
                            Confirmer la réservation
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Êtes-vous sûr de vouloir réserver ce trajet ?</p>
                        <div id="reservationDetails"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-success" id="confirmReservation">
                            <i class="fas fa-check me-2"></i>Confirmer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function setupReservationEvents() {
    // Utiliser la délégation d'événements pour les boutons de réservation
    document.addEventListener('click', function(e) {
        const reservationBtn = e.target.closest('.reservation-btn');

        if (reservationBtn && !reservationBtn.disabled) {
            e.preventDefault();

            const rideId = reservationBtn.dataset.rideId;
            const price = reservationBtn.dataset.price;
            const seats = reservationBtn.dataset.seats;

            // Stocker les infos de réservation
            reservationSystem.currentReservation = { rideId, price, seats };

            // Afficher le modal de confirmation
            const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
            const detailsDiv = document.getElementById('reservationDetails');
            detailsDiv.innerHTML = `
                <p><strong>Trajet #${rideId}</strong></p>
                <p>Prix: ${price}€</p>
                <p>Places disponibles: ${seats}</p>
            `;
            modal.show();
        }
    });

    // Gestionnaire de confirmation
    const confirmBtn = document.getElementById('confirmReservation');
    if (confirmBtn) {
        // Supprimer les anciens listeners pour éviter les doublons
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', function() {
            if (reservationSystem.currentReservation) {
                // Appel API pour créer la réservation
                createReservation(reservationSystem.currentReservation);
            }
        });
    }
}

function createReservation(reservationData) {
    if (typeof showLoadingSpinner === 'function') {
        showLoadingSpinner(true);
    }

    // Appel API pour créer la réservation
    fetch('/api/reservations/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            ride_id: reservationData.rideId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (typeof showNotification === 'function') {
                showNotification('Réservation confirmée ! Le conducteur vous contactera bientôt.', 'success');
            } else {
                alert('Réservation confirmée !');
            }

            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
            if (modal) modal.hide();

            // Recharger la liste des trajets pour mettre à jour les places disponibles
            if (typeof loadRidesFromAPI === 'function') {
                loadRidesFromAPI(window.currentSearchParams, window.currentPage || 1, window.currentFilters);
            }
        } else {
            if (typeof showNotification === 'function') {
                showNotification('Erreur lors de la réservation: ' + (data.error || 'Erreur inconnue'), 'danger');
            } else {
                alert('Erreur lors de la réservation');
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

// Export global
window.initReservation = initReservation;
window.reservationSystem = reservationSystem;
