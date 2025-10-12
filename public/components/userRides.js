/**
 * GESTION DES TRAJETS UTILISATEUR
 * Module pour afficher et gérer les trajets créés par l'utilisateur
 */

// Charger les trajets de l'utilisateur
function loadUserRides() {
    fetch('/api/rides/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.rides) {
            displayUserRides(data.rides);
        } else {
            console.error('❌ Erreur lors du chargement des trajets:', data);
            showEmptyUserRides();
        }
    })
    .catch(error => {
        console.error('❌ Erreur réseau:', error);
        showEmptyUserRides();
    });
}

// Afficher les trajets de l'utilisateur
function displayUserRides(rides) {
    const ridesList = document.getElementById('myRidesList');

    if (!ridesList) {
        console.error('❌ Élément myRidesList introuvable dans le DOM');
        return;
    }

    if (rides.length === 0) {
        showEmptyUserRides();
        return;
    }

    const ridesHTML = rides.map(ride => generateUserRideCard(ride)).join('');
    ridesList.innerHTML = ridesHTML;
}

// Générer une carte de trajet utilisateur
function generateUserRideCard(ride) {
    const departureDate = new Date(ride.departure_datetime);
    const departureTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const departureDay = departureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Calculer l'heure d'arrivée si disponible
    let arrivalTime = 'N/A';
    if (ride.estimated_arrival_datetime) {
        const arrivalDate = new Date(ride.estimated_arrival_datetime);
        arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Badge écologique
    const ecoBadge = ride.is_ecological || ride.fuel_type === 'electrique' ?
        '<span class="badge bg-success ms-2"><i class="fas fa-leaf"></i> Écologique</span>' : '';

    // Statut du trajet
    const statusBadges = {
        'pending': '<span class="badge bg-warning">En attente</span>',
        'confirmed': '<span class="badge bg-success">Confirmé</span>',
        'completed': '<span class="badge bg-secondary">Terminé</span>',
        'cancelled': '<span class="badge bg-danger">Annulé</span>'
    };
    const statusBadge = statusBadges[ride.status] || '<span class="badge bg-info">Inconnu</span>';

    // Durée
    let duration = 'N/A';
    if (ride.duration_minutes) {
        const hours = Math.floor(ride.duration_minutes / 60);
        const minutes = ride.duration_minutes % 60;
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }

    return `
        <div class="user-ride-card mb-3">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">
                                ${ride.departure_city} → ${ride.arrival_city}
                                ${ecoBadge}
                            </h5>
                            <small class="text-muted">${departureDay}</small>
                        </div>
                        <div>
                            ${statusBadge}
                        </div>
                    </div>

                    <div class="route-info mb-3">
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <i class="fas fa-circle text-success"></i>
                                <strong>${departureTime}</strong> ${ride.departure_city}
                            </div>
                            <div class="flex-fill">
                                <hr class="my-0">
                            </div>
                            <div class="ms-3">
                                <i class="fas fa-map-marker-alt text-danger"></i>
                                <strong>${arrivalTime}</strong> ${ride.arrival_city}
                            </div>
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>${duration}
                            <i class="fas fa-euro-sign ms-3 me-1"></i>${ride.price_per_seat}€ par personne
                        </small>
                    </div>

                    <div class="ride-stats mb-3">
                        <span class="me-3">
                            <i class="fas fa-users me-1"></i>
                            ${ride.available_seats} places disponibles
                        </span>
                        <span class="me-3">
                            <i class="fas fa-user-check me-1"></i>
                            ${ride.confirmed_passengers || 0} réservations
                        </span>
                    </div>

                    <div class="ride-actions d-flex gap-2">
                        <button class="btn btn-sm btn-primary" onclick="viewRideDetails(${ride.id})">
                            <i class="fas fa-eye"></i> Détails
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="editUserRide(${ride.id})">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="manageRidePassengers(${ride.id})">
                            <i class="fas fa-users"></i> Passagers
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="cancelUserRide(${ride.id})">
                            <i class="fas fa-times"></i> Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Afficher l'état vide
function showEmptyUserRides() {
    const ridesList = document.getElementById('myRidesList');
    if (!ridesList) return;

    ridesList.innerHTML = `
        <div class="empty-state">
            <h5>🚗 Aucun trajet proposé</h5>
            <p>Commencez à partager vos trajets !</p>
            <a href="covoiturages.html" class="btn btn-primary">Proposer mon premier trajet</a>
        </div>
    `;
}

// Modifier un trajet
function editUserRide(rideId) {
    console.log('✏️ Modification du trajet:', rideId);
    // TODO: Ouvrir une modal ou rediriger vers une page d'édition
    showNotification('Fonctionnalité en développement', 'info');
}

// Gérer les passagers d'un trajet
function manageRidePassengers(rideId) {
    console.log('👥 Gestion des passagers du trajet:', rideId);
    // TODO: Ouvrir une modal pour voir et gérer les passagers
    showNotification('Fonctionnalité en développement', 'info');
}

// Annuler un trajet
function cancelUserRide(rideId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce trajet ? Cette action est irréversible.')) {
        return;
    }

    fetch(`/api/rides/${rideId}/cancel`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Trajet annulé avec succès', 'success');
            loadUserRides();
        } else {
            showNotification('Erreur lors de l\'annulation: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Initialiser les trajets lors du changement d'onglet
function initUserRidesTab() {
    // Écouter l'onglet "Trajets créés"
    const createdRidesTab = document.getElementById('created-rides-tab');
    if (createdRidesTab) {
        createdRidesTab.addEventListener('shown.bs.tab', function() {
            loadUserRides();
        });
    }
}

// Exports globaux
window.loadUserRides = loadUserRides;
window.editUserRide = editUserRide;
window.manageRidePassengers = manageRidePassengers;
window.cancelUserRide = cancelUserRide;
window.initUserRidesTab = initUserRidesTab;
