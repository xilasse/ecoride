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

    // Classifier les réservations
    const now = new Date();
    const categorized = classifyReservations(reservations, now);

    // Générer le HTML avec sections
    ridesList.innerHTML = generateReservationSectionsHTML(categorized);
}

// Classifier les réservations en catégories
function classifyReservations(reservations, now) {
    const categorized = {
        upcoming: [],
        archived: []
    };

    reservations.forEach(reservation => {
        const departureDate = new Date(reservation.departure_datetime);
        const isCancelled = reservation.status_id === 4 || reservation.status === 'cancelled';
        const isCompleted = reservation.status_id === 5 || reservation.status === 'completed';

        // Les réservations annulées ou terminées vont dans "archived"
        if (isCancelled || isCompleted || departureDate < now) {
            categorized.archived.push(reservation);
        } else {
            categorized.upcoming.push(reservation);
        }
    });

    // Trier chaque catégorie
    categorized.upcoming.sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime));
    categorized.archived.sort((a, b) => new Date(b.departure_datetime) - new Date(a.departure_datetime));

    return categorized;
}

// Générer le HTML des sections
function generateReservationSectionsHTML(categorized) {
    let html = '';

    // Section 1: Trajets à venir
    if (categorized.upcoming.length > 0) {
        html += `
            <div class="reservations-section mb-4">
                <div class="section-wrapper">
                    <h5 class="section-title section-upcoming-reservations">
                        <i class="fas fa-calendar-alt me-2"></i>
                        Trajets à venir
                        <span class="badge" style="background: var(--eco-accent);">${categorized.upcoming.length}</span>
                    </h5>
                    <div class="reservations-container">
                        ${categorized.upcoming.map(reservation => generateJoinedRideCard(reservation)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Section 2: Trajets terminés (masqués par défaut)
    if (categorized.archived.length > 0) {
        html += `
            <div class="reservations-section mb-4">
                <div class="section-wrapper">
                    <h5 class="section-title section-archived">
                        <i class="fas fa-archive me-2"></i>
                        Trajets terminés
                        <span class="badge bg-secondary">${categorized.archived.length}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="toggleArchivedReservations()" id="toggleArchivedReservationsBtn">
                            <i class="fas fa-chevron-down"></i> Afficher
                        </button>
                    </h5>
                    <div class="reservations-container" id="archivedReservationsContainer" style="display: none;">
                        ${categorized.archived.map(reservation => generateJoinedRideCard(reservation)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    return html;
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

    // Déterminer si la réservation est annulée
    const isCancelled = reservation.status_id === 4 || reservation.status === 'cancelled';
    const isCompleted = reservation.status_id === 5 || reservation.status === 'completed';

    // Statut de la réservation
    const statusBadge = getReservationStatusBadge(reservation.status, isCancelled, isCompleted);

    // Ajouter une bordure rouge pour les réservations annulées
    const cardClasses = isCancelled ? 'card border-danger' : 'card';
    const cardStyle = isCancelled ? 'border-left: 4px solid #dc3545;' : '';

    // Avatar du conducteur
    const driverAvatar = reservation.driver_name ? reservation.driver_name.charAt(0).toUpperCase() : 'C';

    // Prix total ou remboursé
    const totalPrice = reservation.total_price || (reservation.seats_reserved * reservation.price_per_seat);
    const displayPrice = isCancelled && reservation.refund_amount !== null && reservation.refund_amount !== undefined
        ? parseFloat(reservation.refund_amount).toFixed(2)
        : totalPrice;

    // Durée
    let duration = 'N/A';
    if (reservation.duration_minutes) {
        const hours = Math.floor(reservation.duration_minutes / 60);
        const minutes = reservation.duration_minutes % 60;
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }

    // Message pour les réservations annulées
    const cancelledMessage = isCancelled ? `
        <div class="alert alert-danger mb-3">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Réservation annulée</strong> - ${getCancelledReason(reservation)}
        </div>
    ` : '';

    return `
        <div class="user-joined-ride-card mb-3">
            <div class="${cardClasses}" style="${cardStyle}">
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

                    ${cancelledMessage}

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
                                ${isCancelled ? `
                                    <div>
                                        <strong>Prix total:</strong> <span class="text-muted text-decoration-line-through">${totalPrice}€</span>
                                    </div>
                                    <div class="mt-1">
                                        <strong>Montant remboursé:</strong> <span class="text-success">${displayPrice}€</span>
                                        ${reservation.refund_percentage ? `
                                            <span class="badge bg-success ms-2">${reservation.refund_percentage}%</span>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <strong>Prix total:</strong> ${displayPrice}€
                                `}
                            </div>
                            <div>
                                <strong>Réservé le:</strong> ${new Date(reservation.created_at).toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                    </div>

                    ${generateReservationActions(reservation, isCancelled, isCompleted)}
                </div>
            </div>
        </div>
    `;
}

// Obtenir le badge de statut de réservation
function getReservationStatusBadge(status, isCancelled, isCompleted) {
    if (isCancelled) {
        return '<span class="badge bg-danger"><i class="fas fa-times-circle"></i> Annulée</span>';
    }

    if (isCompleted) {
        return '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Terminée</span>';
    }

    const statusBadges = {
        'pending': '<span class="badge bg-warning">En attente</span>',
        'confirmed': '<span class="badge bg-success">Confirmée</span>',
        'rejected': '<span class="badge bg-danger">Refusée</span>',
        'cancelled': '<span class="badge bg-danger"><i class="fas fa-times-circle"></i> Annulée</span>',
        'completed': '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Terminée</span>'
    };
    return statusBadges[status] || '<span class="badge bg-secondary">Inconnu</span>';
}

// Obtenir la raison de l'annulation
function getCancelledReason(reservation) {
    if (reservation.refund_percentage === 100) {
        return 'Vous avez été intégralement remboursé.';
    } else if (reservation.refund_percentage) {
        return `Remboursement de ${reservation.refund_percentage}% selon la politique d'annulation.`;
    }
    return 'Vous avez été remboursé selon la politique d\'annulation.';
}

// Générer les actions de réservation
function generateReservationActions(reservation, isCancelled, isCompleted) {
    if (isCancelled) {
        return ''; // Pas d'actions pour les réservations annulées
    }

    return `
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
            ${isCompleted ? `
                <button class="btn btn-sm btn-outline-warning" onclick="rateDriver(${reservation.ride_id}, ${reservation.driver_id})">
                    <i class="fas fa-star"></i> Noter le conducteur
                </button>
            ` : ''}
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

// Basculer l'affichage des réservations archivées
function toggleArchivedReservations() {
    const container = document.getElementById('archivedReservationsContainer');
    const btn = document.getElementById('toggleArchivedReservationsBtn');

    if (!container || !btn) return;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> Masquer';
    } else {
        container.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> Afficher';
    }
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
window.toggleArchivedReservations = toggleArchivedReservations;
window.initUserJoinedRidesTab = initUserJoinedRidesTab;
