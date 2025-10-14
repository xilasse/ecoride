/**
 * GESTION DES TRAJETS REJOINTS PAR L'UTILISATEUR
 * Module pour afficher les trajets auxquels l'utilisateur participe en tant que passager
 */

// Charger les trajets auxquels l'utilisateur participe
function loadUserJoinedRides() {
    console.log('🎫 Chargement des trajets rejoints par l\'utilisateur...');

    fetch('/api/reservations/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.reservations) {
            displayUserJoinedRides(data.reservations);
        } else {
            console.error('❌ Erreur lors du chargement des trajets rejoints:', data);
            showEmptyUserJoinedRides();
        }
    })
    .catch(error => {
        console.error('❌ Erreur réseau:', error);
        showEmptyUserJoinedRides();
    });
}

// Afficher les trajets rejoints par l'utilisateur
function displayUserJoinedRides(reservations) {
    const ridesList = document.getElementById('myJoinedRidesList');
    if (!ridesList) return;

    if (reservations.length === 0) {
        showEmptyUserJoinedRides();
        return;
    }

    const ridesHTML = reservations.map(reservation => generateJoinedRideCard(reservation)).join('');
    ridesList.innerHTML = ridesHTML;
}

// Générer une carte de trajet rejoint
function generateJoinedRideCard(reservation) {
    const departureDate = new Date(reservation.departure_datetime);
    const departureTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const departureDay = departureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Calculer l'heure d'arrivée si disponible
    let arrivalTime = 'N/A';
    if (reservation.estimated_arrival_datetime) {
        const arrivalDate = new Date(reservation.estimated_arrival_datetime);
        arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    // Badge écologique
    const ecoBadge = reservation.is_ecological || reservation.fuel_type === 'electrique' ?
        '<span class="badge bg-success ms-2"><i class="fas fa-leaf"></i> Écologique</span>' : '';

    // Statut de la réservation
    const statusBadges = {
        'pending': '<span class="badge bg-warning">En attente</span>',
        'confirmed': '<span class="badge bg-success">Confirmée</span>',
        'rejected': '<span class="badge bg-danger">Refusée</span>',
        'cancelled': '<span class="badge bg-secondary">Annulée</span>',
        'completed': '<span class="badge bg-info">Terminée</span>'
    };
    const statusBadge = statusBadges[reservation.status] || '<span class="badge bg-secondary">Inconnu</span>';

    // Avatar du conducteur
    const driverAvatar = reservation.driver_name ? reservation.driver_name.charAt(0).toUpperCase() : 'C';

    // Prix total
    const totalPrice = reservation.total_price || (reservation.seats_reserved * reservation.price_per_seat);

    // Durée
    let duration = 'N/A';
    if (reservation.duration_minutes) {
        const hours = Math.floor(reservation.duration_minutes / 60);
        const minutes = reservation.duration_minutes % 60;
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }

    return `
        <div class="user-joined-ride-card mb-3">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">
                                ${reservation.departure_city} → ${reservation.arrival_city}
                                ${ecoBadge}
                            </h5>
                            <small class="text-muted">${departureDay}</small>
                        </div>
                        <div>
                            ${statusBadge}
                        </div>
                    </div>

                    <div class="driver-info mb-3">
                        <div class="d-flex align-items-center">
                            <div class="driver-avatar me-2">${driverAvatar}</div>
                            <div>
                                <strong>Conducteur: ${reservation.driver_name || 'Inconnu'}</strong>
                                <div class="rating">
                                    <i class="fas fa-star"></i>
                                    <span class="ms-1">4.0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="route-info mb-3">
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <i class="fas fa-circle text-success"></i>
                                <strong>${departureTime}</strong> ${reservation.departure_city}
                            </div>
                            <div class="flex-fill">
                                <hr class="my-0">
                            </div>
                            <div class="ms-3">
                                <i class="fas fa-map-marker-alt text-danger"></i>
                                <strong>${arrivalTime}</strong> ${reservation.arrival_city}
                            </div>
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>${duration}
                            <i class="fas fa-user ms-3 me-1"></i>${reservation.seats_reserved || 1} place(s) réservée(s)
                        </small>
                    </div>

                    <div class="reservation-info mb-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>Prix total:</strong> ${totalPrice}€
                            </div>
                            <div>
                                <strong>Réservé le:</strong> ${new Date(reservation.created_at).toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                    </div>

                    <div class="reservation-actions d-flex gap-2">
                        <button class="btn btn-sm btn-primary" onclick="viewRideDetails(${reservation.ride_id})">
                            <i class="fas fa-eye"></i> Détails du trajet
                        </button>
                        ${reservation.status === 'pending' || reservation.status === 'confirmed' ? `
                            <button class="btn btn-sm btn-outline-warning" onclick="contactDriver(${reservation.driver_id})">
                                <i class="fas fa-phone"></i> Contacter le conducteur
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="cancelUserReservation(${reservation.id})">
                                <i class="fas fa-times"></i> Annuler ma participation
                            </button>
                        ` : ''}
                        ${reservation.status === 'completed' ? `
                            <button class="btn btn-sm btn-outline-warning" onclick="rateDriver(${reservation.ride_id}, ${reservation.driver_id})">
                                <i class="fas fa-star"></i> Noter le conducteur
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Afficher l'état vide
function showEmptyUserJoinedRides() {
    const ridesList = document.getElementById('myJoinedRidesList');
    if (!ridesList) return;

    ridesList.innerHTML = `
        <div class="empty-state">
            <h5>🎫 Aucune participation</h5>
            <p>Vous n'avez pas encore rejoint de trajet.</p>
            <a href="covoiturages.html" class="btn btn-primary">Rechercher un trajet</a>
        </div>
    `;
}

// Annuler une réservation
function cancelUserReservation(reservationId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
        return;
    }

    fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Réservation annulée avec succès', 'success');
            loadUserJoinedRides();
        } else {
            showNotification('Erreur lors de l\'annulation: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Noter le conducteur après un trajet
function rateDriver(rideId, driverId) {
    console.log('⭐ Notation du conducteur:', driverId, 'pour le trajet:', rideId);
    // TODO: Implémenter une modal de notation
    showNotification('Fonctionnalité de notation en développement', 'info');
}

// Contacter le conducteur
function contactDriver(driverId) {
    console.log('📞 Contact du conducteur:', driverId);
    // TODO: Implémenter une modal de contact ou redirection vers messagerie
    showNotification('Fonctionnalité de messagerie en développement', 'info');
}

// Initialiser les trajets rejoints lors du clic sur le sous-onglet
function initUserJoinedRidesTab() {
    const joinedRidesTab = document.getElementById('joined-rides-tab');
    if (joinedRidesTab) {
        joinedRidesTab.addEventListener('shown.bs.tab', function() {
            loadUserJoinedRides();
        });
    }
}

// Exports globaux
window.loadUserJoinedRides = loadUserJoinedRides;
window.cancelUserReservation = cancelUserReservation;
window.rateDriver = rateDriver;
window.contactDriver = contactDriver;
window.initUserJoinedRidesTab = initUserJoinedRidesTab;
