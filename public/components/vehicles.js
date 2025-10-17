/**
 * GESTION DES VÉHICULES
 * Module pour gérer les véhicules de l'utilisateur
 */

// Charger les véhicules de l'utilisateur
function loadUserVehicles() {
    console.log('🚗 Chargement des véhicules...');

    fetch('/api/vehicles/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.vehicles) {
            displayUserVehicles(data.vehicles);
        } else {
            console.error('❌ Erreur lors du chargement des véhicules:', data);
            showEmptyVehicles();
        }
    })
    .catch(error => {
        console.error('❌ Erreur réseau:', error);
        showEmptyVehicles();
    });
}

// Afficher les véhicules de l'utilisateur
function displayUserVehicles(vehicles) {
    const vehiclesList = document.getElementById('myVehiclesList');
    if (!vehiclesList) return;

    if (vehicles.length === 0) {
        showEmptyVehicles();
        return;
    }

    const vehiclesHTML = vehicles.map(vehicle => generateVehicleCard(vehicle)).join('');
    vehiclesList.innerHTML = vehiclesHTML;
}

// Générer une carte de véhicule
function generateVehicleCard(vehicle) {
    const fuelTypeIcons = {
        'essence': 'fas fa-gas-pump',
        'diesel': 'fas fa-gas-pump',
        'electrique': 'fas fa-charging-station',
        'hybride': 'fas fa-leaf'
    };

    const fuelIcon = fuelTypeIcons[vehicle.fuel_type] || 'fas fa-car';
    const ecoBadge = vehicle.fuel_type === 'electrique' || vehicle.fuel_type === 'hybride' ?
        '<span class="badge bg-success ms-2"><i class="fas fa-leaf"></i> Écologique</span>' : '';

    return `
        <div class="vehicle-card mb-3">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5 class="card-title">
                                <i class="${fuelIcon} me-2"></i>
                                ${vehicle.brand} ${vehicle.model}
                                ${ecoBadge}
                            </h5>
                            <div class="vehicle-details">
                                <p class="mb-1">
                                    <strong>Immatriculation:</strong> ${vehicle.license_plate || 'N/A'}
                                </p>
                                <p class="mb-1">
                                    <strong>Couleur:</strong> ${vehicle.color || 'N/A'}
                                </p>
                                <p class="mb-1">
                                    <strong>Nombre de places:</strong> ${vehicle.seat_count || 'N/A'}
                                </p>
                                <p class="mb-1">
                                    <strong>Type de carburant:</strong> ${vehicle.fuel_type || 'N/A'}
                                </p>
                            </div>
                        </div>
                        <div class="vehicle-actions">
                            <button class="btn btn-sm btn-outline-primary mb-2" onclick="editVehicle(${vehicle.id})">
                                <i class="fas fa-edit"></i> Modifier
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteVehicle(${vehicle.id})">
                                <i class="fas fa-trash"></i> Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Afficher l'état vide
function showEmptyVehicles() {
    const vehiclesList = document.getElementById('myVehiclesList');
    if (!vehiclesList) return;

    vehiclesList.innerHTML = `
        <div class="empty-state">
            <h5>🚙 Aucun véhicule</h5>
            <p>Ajoutez vos véhicules pour proposer des trajets.</p>
            <button class="btn btn-primary" onclick="addVehicle()">Ajouter mon premier véhicule</button>
        </div>
    `;
}

// Ajouter un véhicule
function addVehicle() {
    console.log('➕ Ajout d\'un véhicule');
    showVehicleModal();
}

// Modifier un véhicule
function editVehicle(vehicleId) {
    console.log('✏️ Modification du véhicule:', vehicleId);

    // Récupérer les données du véhicule
    fetch(`/api/vehicles/${vehicleId}`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.vehicle) {
            showVehicleModal(data.vehicle);
        } else {
            showNotification('Erreur: ' + (data.error || 'Impossible de charger les données'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Supprimer un véhicule
function deleteVehicle(vehicleId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
        return;
    }

    fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Véhicule supprimé avec succès', 'success');
            loadUserVehicles();
        } else {
            showNotification('Erreur lors de la suppression: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Afficher la modale de véhicule (ajout ou modification)
function showVehicleModal(vehicle = null) {
    const isEdit = vehicle !== null;
    const modalTitle = isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule';

    const modalHTML = `
        <div class="modal fade" id="vehicleModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-car me-2"></i>${modalTitle}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="vehicleForm">
                            <div class="form-group mb-3">
                                <label>Marque *</label>
                                <input type="text" class="form-control" id="vehicleBrand" value="${vehicle?.brand || ''}" placeholder="Ex: Renault, Peugeot..." required>
                            </div>

                            <div class="form-group mb-3">
                                <label>Modèle *</label>
                                <input type="text" class="form-control" id="vehicleModel" value="${vehicle?.model || ''}" placeholder="Ex: Clio, 208..." required>
                            </div>

                            <div class="form-group mb-3">
                                <label>Couleur</label>
                                <input type="text" class="form-control" id="vehicleColor" value="${vehicle?.color || ''}" placeholder="Ex: Blanc, Rouge...">
                            </div>

                            <div class="form-group mb-3">
                                <label>Immatriculation</label>
                                <input type="text" class="form-control" id="vehicleLicensePlate" value="${vehicle?.license_plate || ''}" placeholder="Ex: AB-123-CD">
                            </div>

                            <div class="form-group mb-3">
                                <label>Type de carburant *</label>
                                <select class="form-control" id="vehicleFuelType" required>
                                    <option value="">Sélectionner...</option>
                                    <option value="essence" ${vehicle?.fuel_type === 'essence' ? 'selected' : ''}>Essence</option>
                                    <option value="diesel" ${vehicle?.fuel_type === 'diesel' ? 'selected' : ''}>Diesel</option>
                                    <option value="electrique" ${vehicle?.fuel_type === 'electrique' ? 'selected' : ''}>Électrique</option>
                                    <option value="hybride" ${vehicle?.fuel_type === 'hybride' ? 'selected' : ''}>Hybride</option>
                                </select>
                            </div>

                            <div class="form-group mb-3">
                                <label>Nombre de places *</label>
                                <select class="form-control" id="vehicleSeatCount" required>
                                    <option value="">Sélectionner...</option>
                                    <option value="2" ${vehicle?.seat_count == 2 ? 'selected' : ''}>2 places</option>
                                    <option value="3" ${vehicle?.seat_count == 3 ? 'selected' : ''}>3 places</option>
                                    <option value="4" ${vehicle?.seat_count == 4 ? 'selected' : ''}>4 places</option>
                                    <option value="5" ${vehicle?.seat_count == 5 ? 'selected' : ''}>5 places</option>
                                    <option value="6" ${vehicle?.seat_count == 6 ? 'selected' : ''}>6 places</option>
                                    <option value="7" ${vehicle?.seat_count == 7 ? 'selected' : ''}>7 places</option>
                                    <option value="8" ${vehicle?.seat_count == 8 ? 'selected' : ''}>8 places</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Annuler
                        </button>
                        <button type="button" class="btn btn-success" onclick="saveVehicle(${isEdit ? vehicle.id : 'null'})">
                            <i class="fas fa-save me-2"></i>${isEdit ? 'Modifier' : 'Ajouter'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Supprimer l'ancienne modale si elle existe
    const existingModal = document.getElementById('vehicleModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Ajouter la modale au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Afficher la modale
    const modal = new bootstrap.Modal(document.getElementById('vehicleModal'));
    modal.show();
}

// Sauvegarder un véhicule (création ou modification)
function saveVehicle(vehicleId) {
    const formData = {
        brand: document.getElementById('vehicleBrand').value,
        model: document.getElementById('vehicleModel').value,
        color: document.getElementById('vehicleColor').value,
        license_plate: document.getElementById('vehicleLicensePlate').value,
        fuel_type: document.getElementById('vehicleFuelType').value,
        seat_count: parseInt(document.getElementById('vehicleSeatCount').value)
    };

    // Validation côté client
    if (!formData.brand || !formData.model || !formData.fuel_type || !formData.seat_count) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    const isEdit = vehicleId !== null;
    const url = isEdit ? `/api/vehicles/${vehicleId}` : '/api/vehicles';
    const method = 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(isEdit ? 'Véhicule modifié avec succès' : 'Véhicule ajouté avec succès', 'success');

            // Fermer la modale
            const modal = bootstrap.Modal.getInstance(document.getElementById('vehicleModal'));
            modal.hide();

            // Recharger la liste des véhicules
            loadUserVehicles();
        } else {
            showNotification('Erreur: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        showNotification('Erreur de réseau', 'error');
    });
}

// Initialiser les véhicules lors du changement d'onglet
function initVehiclesTab() {
    const vehiclesTab = document.getElementById('vehicles-tab');
    if (vehiclesTab) {
        vehiclesTab.addEventListener('shown.bs.tab', function() {
            loadUserVehicles();
        });
    }
}

// Exports globaux
window.loadUserVehicles = loadUserVehicles;
window.addVehicle = addVehicle;
window.editVehicle = editVehicle;
window.deleteVehicle = deleteVehicle;
window.initVehiclesTab = initVehiclesTab;
window.saveVehicle = saveVehicle;
