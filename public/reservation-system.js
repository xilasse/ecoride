/**
 * EcoRide - Système de réservation
 * Extension propre pour ajouter les boutons de réservation
 */

let reservationSystem = {
    initialized: false,
    currentReservation: null
};

// Initialisation après chargement du DOM et du main.js
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que main.js soit complètement chargé
    setTimeout(() => {
        if (typeof viewRideDetails === 'function') {
            initReservationSystem();
        }
    }, 300);
});

function initReservationSystem() {
    if (reservationSystem.initialized) return;
    
    console.log('Initialisation du système de réservation...');
    
    // Ajouter les modaux de réservation
    addReservationModals();
    
    // Améliorer les cartes existantes
    enhanceRideCards();
    
    // Configurer les événements de réservation uniquement
    setupReservationEvents();
    
    reservationSystem.initialized = true;
    console.log('Système de réservation prêt');
}

function enhanceRideCards() {
    const rideCards = document.querySelectorAll('.ride-card');
    
    rideCards.forEach((card) => {
        const actionsContainer = card.querySelector('.col-md-4.text-end');
        
        // Vérifier si déjà modifié
        if (!actionsContainer || actionsContainer.querySelector('.reservation-btn')) {
            return;
        }
        
        const rideId = card.dataset.rideId;
        const price = card.dataset.price;
        const seatsAvailable = card.querySelector('.seats-available').textContent;
        
        // Récupérer les éléments existants
        const priceElement = actionsContainer.querySelector('.price-highlight');
        const priceSubtext = actionsContainer.querySelector('small');
        const existingButton = actionsContainer.querySelector('.btn-detail');
        
        // Créer le conteneur d'actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'ride-actions';
        
        // Garder le bouton existant tel quel (sans toucher à ses événements)
        actionsDiv.appendChild(existingButton);
        
        // Créer le bouton de réservation
        const reservationButton = createReservationButton(rideId, price, seatsAvailable);
        actionsDiv.appendChild(reservationButton);
        
        // Reconstruire le conteneur
        actionsContainer.innerHTML = '';
        actionsContainer.appendChild(priceElement);
        actionsContainer.appendChild(priceSubtext);
        actionsContainer.appendChild(actionsDiv);
    });
}

function createReservationButton(rideId, price, seatsAvailable) {
    const button = document.createElement('button');
    button.className = 'btn btn-reservation reservation-btn';
    button.dataset.rideId = rideId;
    button.dataset.price = price;
    button.dataset.seats = seatsAvailable;
    
    if (parseInt(seatsAvailable) === 0) {
        button.className += ' full-trip';
        button.innerHTML = '<i class="fas fa-times me-2"></i>Complet';
        button.disabled = true;
    } else {
        button.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Réserver';
    }

    return button;
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
    console.log('✅ Modal de réservation ajouté');
}

function setupReservationEvents() {
    // Utiliser la délégation d'événements pour les boutons de réservation
    document.addEventListener('click', function(e) {
        const reservationBtn = e.target.closest('.reservation-btn');

        if (reservationBtn && !reservationBtn.disabled) {
            e.preventDefault();
            e.stopPropagation();

            const rideId = reservationBtn.dataset.rideId;
            const price = reservationBtn.dataset.price;
            const seats = reservationBtn.dataset.seats;

            console.log('🎫 Réservation demandée pour le trajet:', rideId);

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
        confirmBtn.addEventListener('click', function() {
            if (reservationSystem.currentReservation) {
                console.log('✅ Réservation confirmée:', reservationSystem.currentReservation);

                // Ici, ajouter l'appel API pour créer la réservation
                // Pour l'instant, juste une notification
                if (typeof showNotification === 'function') {
                    showNotification('Réservation confirmée ! Le conducteur vous contactera bientôt.', 'success');
                } else {
                    alert('Réservation confirmée !');
                }

                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
                if (modal) modal.hide();
            }
        });
    }

    console.log('✅ Événements de réservation configurés');
}