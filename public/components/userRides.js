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

    // Classifier et trier les trajets par priorité
    const now = new Date();
    const categorized = classifyRides(rides, now);

    // Générer le HTML avec sections
    ridesList.innerHTML = generateSectionsHTML(categorized);
}

// Classifier les trajets en 3 catégories
function classifyRides(rides, now) {
    const categorized = {
        paymentPending: [],
        upcoming: [],
        archived: []
    };

    rides.forEach(ride => {
        const departureDate = new Date(ride.departure_datetime);
        const hoursSinceDeparture = (now - departureDate) / (1000 * 60 * 60);
        const pendingEscrow = parseFloat(ride.pending_escrow_amount) || 0;

        if (hoursSinceDeparture >= 0 && pendingEscrow > 0) {
            categorized.paymentPending.push(ride);
        } else if (departureDate > now) {
            categorized.upcoming.push(ride);
        } else {
            categorized.archived.push(ride);
        }
    });

    // Trier chaque catégorie
    categorized.paymentPending.sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime));
    categorized.upcoming.sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime));
    categorized.archived.sort((a, b) => new Date(b.departure_datetime) - new Date(a.departure_datetime));

    return categorized;
}

// Générer le HTML des sections
function generateSectionsHTML(categorized) {
    let html = '';

    // Section 1: Paiements en attente
    if (categorized.paymentPending.length > 0) {
        html += `
            <div class="rides-section mb-4">
                <h5 class="section-title text-warning">
                    <i class="fas fa-coins me-2"></i>
                    Paiements en attente (${categorized.paymentPending.length})
                </h5>
                <div class="rides-container">
                    ${categorized.paymentPending.map(ride => generateUserRideCard(ride)).join('')}
                </div>
            </div>
        `;
    }

    // Section 2: Trajets à venir
    if (categorized.upcoming.length > 0) {
        html += `
            <div class="rides-section mb-4">
                <h5 class="section-title text-primary">
                    <i class="fas fa-calendar-alt me-2"></i>
                    Trajets à venir (${categorized.upcoming.length})
                </h5>
                <div class="rides-container">
                    ${categorized.upcoming.map(ride => generateUserRideCard(ride)).join('')}
                </div>
            </div>
        `;
    }

    // Section 3: Archivés (masqués par défaut)
    if (categorized.archived.length > 0) {
        html += `
            <div class="rides-section mb-4">
                <h5 class="section-title text-secondary">
                    <i class="fas fa-archive me-2"></i>
                    Trajets terminés (${categorized.archived.length})
                    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="toggleArchivedRides()" id="toggleArchivedBtn">
                        <i class="fas fa-chevron-down"></i> Afficher
                    </button>
                </h5>
                <div class="rides-container" id="archivedRidesContainer" style="display: none;">
                    ${categorized.archived.map(ride => generateUserRideCard(ride)).join('')}
                </div>
            </div>
        `;
    }

    return html;
}

// Générer une carte de trajet utilisateur
function generateUserRideCard(ride) {
    const departureDate = new Date(ride.departure_datetime);
    const departureTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const departureDay = departureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    const arrivalTime = ride.estimated_arrival_datetime
        ? new Date(ride.estimated_arrival_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : 'N/A';

    const ecoBadge = (ride.is_ecological || ride.fuel_type === 'electrique')
        ? '<span class="badge bg-success ms-2"><i class="fas fa-leaf"></i> Écologique</span>'
        : '';

    const duration = formatDuration(ride.duration_minutes);

    const now = new Date();
    const hoursSinceDeparture = (now - departureDate) / (1000 * 60 * 60);
    const pendingEscrow = parseFloat(ride.pending_escrow_amount) || 0;
    const isArchived = hoursSinceDeparture >= 0 && pendingEscrow === 0;

    const statusBadge = getStatusBadge(ride.status, isArchived);
    const canValidatePayment = hoursSinceDeparture >= 24 && ride.pending_escrow_count > 0 && pendingEscrow > 0;

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
                        <div>${statusBadge}</div>
                    </div>

                    <div class="route-info mb-3">
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-3">
                                <i class="fas fa-circle text-success"></i>
                                <strong>${departureTime}</strong> ${ride.departure_city}
                            </div>
                            <div class="flex-fill"><hr class="my-0"></div>
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

                    ${generateStatsHTML(ride, isArchived, pendingEscrow)}
                    ${generateAlertsHTML(canValidatePayment, pendingEscrow, hoursSinceDeparture)}
                    ${generateActionsHTML(ride.id, isArchived, canValidatePayment, pendingEscrow)}
                </div>
            </div>
        </div>
    `;
}

// Formater la durée
function formatDuration(minutes) {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
}

// Obtenir le badge de statut
function getStatusBadge(status, isArchived) {
    if (isArchived) {
        return '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Terminé</span>';
    }

    const badges = {
        'pending': '<span class="badge bg-warning">En attente</span>',
        'confirmed': '<span class="badge bg-success">Confirmé</span>',
        'completed': '<span class="badge bg-secondary">Terminé</span>',
        'cancelled': '<span class="badge bg-danger">Annulé</span>'
    };
    return badges[status] || '<span class="badge bg-info">Inconnu</span>';
}

// Générer le HTML des statistiques
function generateStatsHTML(ride, isArchived, pendingEscrow) {
    if (isArchived) {
        const totalSeats = ride.total_seats || ride.available_seats;
        const seatsBooked = totalSeats - ride.available_seats;
        const totalRevenue = seatsBooked * ride.price_per_seat;
        const commission = Math.min(2.0 * seatsBooked, totalRevenue * 0.10);
        const netRevenue = totalRevenue - commission;

        return `
            <div class="ride-stats mb-3">
                <span class="me-3">
                    <i class="fas fa-user-check me-1"></i>
                    ${seatsBooked} passager${seatsBooked > 1 ? 's' : ''}
                </span>
                <span class="me-3 text-success">
                    <i class="fas fa-coins me-1"></i>
                    ${netRevenue.toFixed(2)}€ reçus
                </span>
                <span class="me-3 text-muted">
                    <i class="fas fa-percentage me-1"></i>
                    ${commission.toFixed(2)}€ de frais
                </span>
            </div>
        `;
    }

    return `
        <div class="ride-stats mb-3">
            <span class="me-3">
                <i class="fas fa-users me-1"></i>
                ${ride.available_seats} places disponibles
            </span>
            <span class="me-3">
                <i class="fas fa-user-check me-1"></i>
                ${ride.confirmed_passengers || 0} réservations
            </span>
            ${pendingEscrow > 0 ? `
                <span class="me-3 text-warning">
                    <i class="fas fa-coins me-1"></i>
                    ${pendingEscrow.toFixed(2)} crédits en attente
                </span>
            ` : ''}
        </div>
    `;
}

// Générer le HTML des alertes
function generateAlertsHTML(canValidate, pendingEscrow, hoursSince) {
    if (canValidate) {
        return `
            <div class="alert alert-info mb-3">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Paiement disponible!</strong> Vous pouvez maintenant valider le paiement et recevoir ${pendingEscrow.toFixed(2)} crédits.
            </div>
        `;
    }

    if (pendingEscrow > 0 && hoursSince < 24) {
        return `
            <div class="alert alert-secondary mb-3">
                <i class="fas fa-clock me-2"></i>
                Paiement disponible dans ${Math.ceil(24 - hoursSince)} heures
            </div>
        `;
    }

    return '';
}

// Générer le HTML des boutons d'action
function generateActionsHTML(rideId, isArchived, canValidate, pendingEscrow) {
    if (isArchived) return '';

    return `
        <div class="ride-actions d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-primary" onclick="viewRideDetails(${rideId})">
                <i class="fas fa-eye"></i> Détails
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="editUserRide(${rideId})">
                <i class="fas fa-edit"></i> Modifier
            </button>
            <button class="btn btn-sm btn-outline-warning" onclick="manageRidePassengers(${rideId})">
                <i class="fas fa-users"></i> Passagers
            </button>
            ${canValidate ? `
                <button class="btn btn-sm btn-success" onclick="validateRidePayment(${rideId})">
                    <i class="fas fa-check-circle"></i> Valider le paiement (${pendingEscrow.toFixed(2)}€)
                </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="cancelUserRide(${rideId})">
                <i class="fas fa-times"></i> Annuler
            </button>
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
    showNotification('Fonctionnalité en développement', 'info');
}

// Gérer les passagers d'un trajet
function manageRidePassengers(rideId) {
    console.log('👥 Gestion des passagers du trajet:', rideId);
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
            showNotification('Erreur: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Valider le paiement d'un trajet
function validateRidePayment(rideId) {
    if (!confirm('Confirmer la réception du paiement ? Les crédits bloqués seront transférés sur votre compte.')) {
        return;
    }

    fetch(`/api/rides/${rideId}/validate-payments`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(`Paiement validé! Vous avez reçu ${data.total_amount.toFixed(2)} crédits`, 'success');
            loadUserRides();
        } else {
            showNotification('Erreur: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Afficher/masquer les trajets archivés
function toggleArchivedRides() {
    const container = document.getElementById('archivedRidesContainer');
    const btn = document.getElementById('toggleArchivedBtn');

    if (!container || !btn) return;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> Masquer';
    } else {
        container.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> Afficher';
    }
}

// Initialiser les trajets lors du changement d'onglet
function initUserRidesTab() {
    const createdRidesTab = document.getElementById('created-rides-tab');
    if (createdRidesTab) {
        createdRidesTab.addEventListener('shown.bs.tab', loadUserRides);
    }
}

// Exports globaux
window.loadUserRides = loadUserRides;
window.editUserRide = editUserRide;
window.manageRidePassengers = manageRidePassengers;
window.cancelUserRide = cancelUserRide;
window.validateRidePayment = validateRidePayment;
window.toggleArchivedRides = toggleArchivedRides;
window.initUserRidesTab = initUserRidesTab;
