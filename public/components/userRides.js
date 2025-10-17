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
        const isCancelled = ride.status_id === 5 || ride.status === 'cancelled';

        // Les trajets annulés vont toujours dans "archived"
        if (isCancelled) {
            categorized.archived.push(ride);
        } else if (hoursSinceDeparture >= 0 && pendingEscrow > 0) {
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
                <div class="section-wrapper">
                    <h5 class="section-title section-pending-payments">
                        <i class="fas fa-coins me-2"></i>
                        Paiements en attente
                        <span class="badge bg-warning text-dark">${categorized.paymentPending.length}</span>
                    </h5>
                    <div class="rides-container">
                        ${categorized.paymentPending.map(ride => generateUserRideCard(ride)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Section 2: Trajets à venir
    if (categorized.upcoming.length > 0) {
        html += `
            <div class="rides-section mb-4">
                <div class="section-wrapper">
                    <h5 class="section-title section-upcoming">
                        <i class="fas fa-calendar-alt me-2"></i>
                        Trajets à venir
                        <span class="badge bg-primary">${categorized.upcoming.length}</span>
                    </h5>
                    <div class="rides-container">
                        ${categorized.upcoming.map(ride => generateUserRideCard(ride)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Section 3: Archivés (masqués par défaut)
    if (categorized.archived.length > 0) {
        html += `
            <div class="rides-section mb-4">
                <div class="section-wrapper">
                    <h5 class="section-title section-archived">
                        <i class="fas fa-archive me-2"></i>
                        Trajets terminés
                        <span class="badge bg-secondary">${categorized.archived.length}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="toggleArchivedRides()" id="toggleArchivedBtn">
                            <i class="fas fa-chevron-down"></i> Afficher
                        </button>
                    </h5>
                    <div class="rides-container" id="archivedRidesContainer" style="display: none;">
                        ${categorized.archived.map(ride => generateUserRideCard(ride)).join('')}
                    </div>
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
    const isCancelled = ride.status_id === 5 || ride.status === 'cancelled';
    const isArchived = (hoursSinceDeparture >= 0 && pendingEscrow === 0) || isCancelled;
    const isPaymentPending = hoursSinceDeparture >= 0 && pendingEscrow > 0;

    const statusBadge = getStatusBadge(ride.status, isArchived, isCancelled);
    const canValidatePayment = hoursSinceDeparture >= 24 && ride.pending_escrow_count > 0 && pendingEscrow > 0 && !isCancelled;

    // Ajouter une classe et un style de bordure pour les trajets annulés
    const cardClasses = isCancelled ? 'card border-danger' : 'card';
    const cardStyle = isCancelled ? 'border-left: 4px solid #dc3545;' : '';

    return `
        <div class="user-ride-card mb-3">
            <div class="${cardClasses}" style="${cardStyle}">
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

                    ${generateStatsHTML(ride, isArchived, pendingEscrow, isCancelled, isPaymentPending)}
                    ${generateAlertsHTML(ride, canValidatePayment, pendingEscrow, hoursSinceDeparture, isCancelled)}
                    ${generateActionsHTML(ride.id, isArchived, canValidatePayment, pendingEscrow, isCancelled, isPaymentPending)}
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
function getStatusBadge(status, isArchived, isCancelled) {
    if (isCancelled) {
        return '<span class="badge bg-danger"><i class="fas fa-times-circle"></i> Annulé</span>';
    }

    if (isArchived) {
        return '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Terminé</span>';
    }

    const badges = {
        'pending': '<span class="badge bg-warning">En attente</span>',
        'confirmed': '<span class="badge bg-success">Confirmé</span>',
        'completed': '<span class="badge bg-secondary">Terminé</span>',
        'cancelled': '<span class="badge bg-danger"><i class="fas fa-times-circle"></i> Annulé</span>'
    };
    return badges[status] || '<span class="badge bg-info">Inconnu</span>';
}

// Générer le HTML des statistiques
function generateStatsHTML(ride, isArchived, pendingEscrow, isCancelled, isPaymentPending) {
    if (isCancelled) {
        return `
            <div class="ride-stats mb-3">
                <span class="me-3 text-danger">
                    <i class="fas fa-ban me-1"></i>
                    Trajet annulé - Tous les passagers ont été remboursés
                </span>
            </div>
        `;
    }

    // Calculer les statistiques financières
    const totalSeats = ride.total_seats || ride.available_seats;
    const seatsBooked = totalSeats - ride.available_seats;
    const totalRevenue = seatsBooked * ride.price_per_seat;
    const commission = totalRevenue * 0.10; // 10% du prix total brut
    const netRevenue = totalRevenue - commission;

    // Pour les trajets archivés (terminés)
    if (isArchived) {
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
    if (isPaymentPending) {
        return `
            <div class="ride-stats mb-3">
                <span class="me-3">
                    <i class="fas fa-user-check me-1"></i>
                    ${seatsBooked} passager${seatsBooked > 1 ? 's' : ''}
                </span>
                <span class="me-3 text-success">
                    <i class="fas fa-coins me-1"></i>
                    ${totalRevenue.toFixed(2)}€ revenu brut
                </span>
                <span class="me-3 text-muted">
                    <i class="fas fa-percentage me-1"></i>
                    ${commission.toFixed(2)}€ de frais
                </span>
            </div>
        `;
    }
    // Pour les trajets en cours ou à venir
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
function generateAlertsHTML(ride, canValidate, pendingEscrow, hoursSince, isCancelled) {
    const totalSeats = ride.total_seats || ride.available_seats;
    const seatsBooked = totalSeats - ride.available_seats;
    const totalRevenue = seatsBooked * ride.price_per_seat;
    const commission = totalRevenue * 0.10; // 10% du prix total brut
    const netRevenue = totalRevenue - commission;

    if (isCancelled) {
        return ''; // Pas d'alertes pour les trajets annulés
    }

    if (canValidate) {
        return `
            <div class="alert alert-info mb-3">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Paiement disponible!</strong> Vous pouvez maintenant valider le paiement et recevoir ${netRevenue.toFixed(2)}€.
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
function generateActionsHTML(rideId, isArchived, canValidate, pendingEscrow, isCancelled, isPaymentPending) {
    if (isArchived || isCancelled) return ''; // Pas d'actions pour les trajets archivés ou annulés

    // Pour les trajets dans "Paiements en attente" : pas de boutons Détails/Modifier/Annuler
    if (isPaymentPending) {
        return `
            <div class="ride-actions d-flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-outline-warning" onclick="manageRidePassengers(${rideId})">
                    <i class="fas fa-users"></i> Passagers
                </button>
                ${canValidate ? `
                    <button class="btn btn-sm btn-success" onclick="validateRidePayment(${rideId})">
                        <i class="fas fa-check-circle"></i> Valider le paiement (${pendingEscrow.toFixed(2)}€)
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Pour les trajets "à venir" : afficher tous les boutons
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

    // Récupérer les données du trajet pour l'édition
    fetch(`/api/rides/${rideId}/edit`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showEditRideModal(data.ride, data.vehicles, data.can_modify_passengers);
        } else {
            showNotification('Erreur: ' + (data.error || 'Impossible de charger les données'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Gérer les passagers d'un trajet
function manageRidePassengers(rideId) {
    console.log('👥 Gestion des passagers du trajet:', rideId);

    // Récupérer la liste des passagers
    fetch(`/api/rides/${rideId}/passengers`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showPassengersModal(rideId, data.passengers, data.stats);
        } else {
            showNotification('Erreur: ' + (data.error || 'Impossible de charger les passagers'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
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

// Afficher la modale d'édition d'un trajet
function showEditRideModal(ride, vehicles, canModifyPassengers) {
    const departureDate = new Date(ride.departure_datetime);
    const arrivalDate = ride.estimated_arrival_datetime ? new Date(ride.estimated_arrival_datetime) : null;

    const modalHTML = `
        <div class="modal fade" id="editRideModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>Modifier le trajet
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editRideForm">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Ville de départ</label>
                                        <input type="text" class="form-control" id="editFrom" value="${ride.departure_city}" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Ville d'arrivée</label>
                                        <input type="text" class="form-control" id="editTo" value="${ride.arrival_city}" required>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Date de départ</label>
                                        <input type="date" class="form-control" id="editDate" value="${departureDate.toISOString().split('T')[0]}" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Heure de départ</label>
                                        <input type="time" class="form-control" id="editTime" value="${departureDate.toTimeString().slice(0,5)}" required>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Heure d'arrivée (optionnel)</label>
                                        <input type="time" class="form-control" id="editArrivalTime" value="${arrivalDate ? arrivalDate.toTimeString().slice(0,5) : ''}">
                                        <small class="text-muted">Laissez vide pour calcul automatique</small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Prix par personne (€)</label>
                                        <input type="number" class="form-control" id="editPrice" value="${ride.price_per_seat}" min="1" max="200" required>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Nombre de places ${canModifyPassengers ? '' : '(non modifiable - trajets réservés)'}</label>
                                        <input type="number" class="form-control" id="editSeats" value="${ride.available_seats}" min="1" max="8" ${canModifyPassengers ? '' : 'readonly'} required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label>Véhicule</label>
                                        <select class="form-control" id="editVehicle" required>
                                            ${vehicles.map(v => `
                                                <option value="${v.id}" ${v.id == ride.vehicle_id ? 'selected' : ''}>
                                                    ${v.brand} ${v.model} (${v.color})
                                                    ${v.is_ecological ? ' - Écologique' : ''}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <label>Adresse de départ (optionnel)</label>
                                <input type="text" class="form-control" id="editDepartureAddress" value="${ride.departure_address || ''}" placeholder="Adresse précise de rendez-vous...">
                            </div>

                            <div class="form-group mb-3">
                                <label>Description (optionnel)</label>
                                <textarea class="form-control" id="editDescription" rows="3" placeholder="Informations supplémentaires...">${ride.description || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Annuler
                        </button>
                        <button type="button" class="btn btn-success" onclick="saveRideChanges(${ride.id})">
                            <i class="fas fa-save me-2"></i>Enregistrer les modifications
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Supprimer l'ancienne modale si elle existe
    const existingModal = document.getElementById('editRideModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Ajouter la modale au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Afficher la modale
    const modal = new bootstrap.Modal(document.getElementById('editRideModal'));
    modal.show();
}

// Sauvegarder les modifications du trajet
function saveRideChanges(rideId) {
    const formData = {
        from: document.getElementById('editFrom').value,
        to: document.getElementById('editTo').value,
        date: document.getElementById('editDate').value,
        time: document.getElementById('editTime').value,
        arrivalTime: document.getElementById('editArrivalTime').value,
        price: parseFloat(document.getElementById('editPrice').value),
        seats: parseInt(document.getElementById('editSeats').value),
        vehicleId: parseInt(document.getElementById('editVehicle').value),
        departureAddress: document.getElementById('editDepartureAddress').value,
        description: document.getElementById('editDescription').value
    };

    // Validation côté client
    if (!formData.from || !formData.to || !formData.date || !formData.time || !formData.price || !formData.seats) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    // Vérifier que la date n'est pas dans le passé
    const selectedDateTime = new Date(formData.date + ' ' + formData.time);
    if (selectedDateTime <= new Date()) {
        showNotification('La date et l\'heure doivent être dans le futur', 'error');
        return;
    }

    // Envoyer la modification
    fetch(`/api/rides/${rideId}/edit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Trajet modifié avec succès', 'success');

            // Fermer la modale
            const modal = bootstrap.Modal.getInstance(document.getElementById('editRideModal'));
            modal.hide();

            // Recharger la liste des trajets
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

// Afficher la modale des passagers
function showPassengersModal(rideId, passengers, stats) {
    const modalHTML = `
        <div class="modal fade" id="passengersModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-users me-2"></i>Passagers du trajet
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Statistiques -->
                        <div class="row mb-4">
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h5 class="text-primary">${stats.total_passengers}</h5>
                                        <small class="text-muted">Passagers</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h5 class="text-info">${stats.total_seats_reserved}</h5>
                                        <small class="text-muted">Places réservées</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h5 class="text-success">${stats.total_revenue.toFixed(2)}€</h5>
                                        <small class="text-muted">Revenus</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h5 class="text-warning">${stats.escrow_amount.toFixed(2)}€</h5>
                                        <small class="text-muted">En attente</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Liste des passagers -->
                        <div class="passengers-list">
                            ${passengers.length === 0 ? `
                                <div class="text-center p-4">
                                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                                    <h5>Aucun passager</h5>
                                    <p class="text-muted">Votre trajet n'a pas encore de réservations.</p>
                                </div>
                            ` : passengers.map(passenger => generatePassengerCard(passenger)).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Supprimer l'ancienne modale si elle existe
    const existingModal = document.getElementById('passengersModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Ajouter la modale au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Afficher la modale
    const modal = new bootstrap.Modal(document.getElementById('passengersModal'));
    modal.show();
}

// Générer une carte passager
function generatePassengerCard(passenger) {
    const reservationDate = new Date(passenger.created_at).toLocaleDateString('fr-FR');
    const statusBadge = getPassengerStatusBadge(passenger.status_id, passenger.escrow_amount);

    return `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        ${passenger.profile_picture ?
                            `<img src="${passenger.profile_picture}" alt="${passenger.pseudo}" class="rounded-circle" style="width: 50px; height: 50px; object-fit: cover;">` :
                            `<div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; font-weight: bold;">${passenger.pseudo.charAt(0).toUpperCase()}</div>`
                        }
                    </div>
                    <div class="col-md-4">
                        <h6 class="mb-1">${passenger.pseudo}</h6>
                        <small class="text-muted">
                            <i class="fas fa-envelope me-1"></i>${passenger.email}
                        </small>
                        ${passenger.phone ? `<br><small class="text-muted"><i class="fas fa-phone me-1"></i>${passenger.phone}</small>` : ''}
                    </div>
                    <div class="col-md-2 text-center">
                        <strong>${passenger.seats_reserved}</strong>
                        <br><small class="text-muted">place${passenger.seats_reserved > 1 ? 's' : ''}</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <strong>${passenger.total_price.toFixed(2)}€</strong>
                        <br><small class="text-muted">total</small>
                    </div>
                    <div class="col-md-2 text-center">
                        ${statusBadge}
                        <br><small class="text-muted">Réservé le ${reservationDate}</small>
                    </div>
                </div>
                ${passenger.avg_rating ? `
                    <div class="mt-2">
                        <small class="text-muted">
                            <i class="fas fa-star text-warning"></i> ${passenger.avg_rating}/5
                        </small>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Obtenir le badge de statut d'un passager
function getPassengerStatusBadge(statusId, escrowAmount) {
    if (escrowAmount > 0) {
        return '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Payé</span>';
    }

    // Mapper les status_id aux labels (selon votre base de données)
    const statusMap = {
        1: '<span class="badge bg-warning"><i class="fas fa-clock"></i> En attente</span>',
        2: '<span class="badge bg-primary"><i class="fas fa-check"></i> Confirmé</span>',
        3: '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Terminé</span>',
        4: '<span class="badge bg-secondary"><i class="fas fa-pause"></i> En pause</span>',
        5: '<span class="badge bg-danger"><i class="fas fa-times"></i> Annulé</span>'
    };

    return statusMap[statusId] || '<span class="badge bg-secondary">Inconnu</span>';
}

// Exports globaux
window.loadUserRides = loadUserRides;
window.editUserRide = editUserRide;
window.manageRidePassengers = manageRidePassengers;
window.cancelUserRide = cancelUserRide;
window.validateRidePayment = validateRidePayment;
window.toggleArchivedRides = toggleArchivedRides;
window.initUserRidesTab = initUserRidesTab;
window.saveRideChanges = saveRideChanges;
