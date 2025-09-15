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