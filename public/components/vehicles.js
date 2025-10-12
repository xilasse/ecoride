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
    // TODO: Ouvrir une modal pour ajouter un véhicule
    showNotification('Fonctionnalité en développement', 'info');
}

// Modifier un véhicule
function editVehicle(vehicleId) {
    console.log('✏️ Modification du véhicule:', vehicleId);
    // TODO: Ouvrir une modal pour modifier le véhicule
    showNotification('Fonctionnalité en développement', 'info');
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
